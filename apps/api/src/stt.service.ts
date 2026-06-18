import { createLogger } from '@bellasos/observability';
import {
  isImpulsiveNonSpeech,
  shouldRejectVoiceTranscript,
} from './transcript-guard';

const log = createLogger({ lib: 'stt' });

type WhisperPipeline = (
  audio: Float32Array | string,
  options?: Record<string, unknown>,
) => Promise<{ text?: string; chunks?: Array<{ text?: string }> }>;

let transcriberPromise: Promise<WhisperPipeline> | null = null;
let loadingLogged = false;

async function getTranscriber(): Promise<WhisperPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      if (!loadingLogged) {
        log.info('loading local whisper model (first request may take a few minutes)');
        loadingLogged = true;
      }
      const { pipeline: createPipeline, env } = await import('@xenova/transformers');
      if (process.env.TRANSFORMERS_CACHE) {
        env.cacheDir = process.env.TRANSFORMERS_CACHE;
      }
      const modelId = process.env.STT_MODEL ?? 'Xenova/whisper-medium.en';
      return createPipeline(
        'automatic-speech-recognition',
        modelId,
      ) as Promise<WhisperPipeline>;
    })().catch((err) => {
      transcriberPromise = null;
      throw err;
    });
  }
  return transcriberPromise;
}

/** Load Whisper in the background so the first voice utterance is not blocked. */
export function warmupTranscriber(): void {
  void getTranscriber().catch((err) => {
    log.warn('STT warmup failed', { error: (err as Error).message });
  });
}

function decodeWavPcm16(buffer: Buffer): { samples: Float32Array; sampleRate: number } {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('Invalid WAV audio');
  }

  let offset = 12;
  let sampleRate = 16_000;
  let numChannels = 1;
  let bitsPerSample = 16;
  let dataOffset = 0;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      numChannels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }

  if (!dataSize || bitsPerSample !== 16) {
    throw new Error('Unsupported WAV format (expected 16-bit PCM)');
  }

  const frameCount = Math.floor(dataSize / (bitsPerSample / 8) / numChannels);
  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const pos = dataOffset + (i * numChannels + ch) * 2;
      sum += buffer.readInt16LE(pos) / 32768;
    }
    samples[i] = sum / numChannels;
  }

  return { samples, sampleRate };
}

function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const idx = Math.floor(srcIdx);
    const frac = srcIdx - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    output[i] = a * (1 - frac) + b * frac;
  }
  return output;
}

function normalizeAudio(samples: Float32Array): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSq += (samples[i] ?? 0) ** 2;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, samples.length));
  if (rms < 0.001) return samples;
  const targetRms = 0.1;
  const gain = Math.min(6, targetRms / rms);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = Math.max(-1, Math.min(1, (samples[i] ?? 0) * gain));
  }
  return out;
}

function extractText(out: { text?: string; chunks?: Array<{ text?: string }> }): string {
  const direct = (out.text ?? '').trim();
  if (direct) return direct;
  if (out.chunks?.length) {
    return out.chunks.map((c) => c.text ?? '').join('').trim();
  }
  return '';
}

export async function transcribeWav(buffer: Buffer): Promise<string> {
  if (!buffer.length) return '';
  const { samples, sampleRate } = decodeWavPcm16(buffer);
  let audio = resample(samples, sampleRate, 16_000);
  audio = normalizeAudio(audio);
  const durationS = audio.length / 16_000;
  if (durationS < 0.2 || isImpulsiveNonSpeech(audio, 16_000, durationS)) {
    log.info('skipped non-speech audio', { durationS: Math.round(durationS * 10) / 10 });
    return '';
  }

  const transcriber = await getTranscriber();
  const opts: Record<string, unknown> = {
    return_timestamps: false,
    language: 'english',
    task: 'transcribe',
  };
  if (durationS > 25) {
    opts.chunk_length_s = 30;
    opts.stride_length_s = 5;
  }

  const out = await transcriber(audio, opts);
  const text = extractText(out);
  if (shouldRejectVoiceTranscript(text)) {
    log.warn('rejected suspicious transcript', { preview: text.slice(0, 80) });
    return '';
  }
  log.info('transcribed', { durationS: Math.round(durationS * 10) / 10, chars: text.length });
  return text;
}
