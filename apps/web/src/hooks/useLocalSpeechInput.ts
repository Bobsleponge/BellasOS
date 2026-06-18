'use client';

import { useCallback, useRef, useState } from 'react';

const DEFAULT_SILENCE_MS = Number(process.env.NEXT_PUBLIC_SILENCE_MS ?? 1200);
const MIN_UTTERANCE_S = 0.25;

function normalizeAudio(samples: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i] ?? 0));
  }
  if (peak < 0.001) return samples;
  const target = 0.92;
  const gain = target / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = Math.max(-1, Math.min(1, (samples[i] ?? 0) * gain));
  }
  return out;
}

async function resampleTo16k(
  samples: Float32Array,
  fromRate: number,
): Promise<Float32Array> {
  if (fromRate === 16_000) return samples;
  const ratio = fromRate / 16_000;
  const outLength = Math.max(1, Math.floor(samples.length / ratio));
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const idx = Math.floor(srcIdx);
    const frac = srcIdx - idx;
    const a = samples[idx] ?? 0;
    const b = samples[idx + 1] ?? a;
    output[i] = a * (1 - frac) + b * frac;
  }
  return output;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

const BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';

async function transcribeBlob(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'speech.wav');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 300_000);
  try {
    const res = await fetch(`${BASE}/jarvis/transcribe`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const json = (await res.json()) as {
      data?: { text?: string; error?: string } | null;
      error?: { message?: string } | null;
    };
    if (json.error?.message) throw new Error(json.error.message);
    const data = json.data;
    if (data?.error) throw new Error(data.error);
    return (data?.text ?? '').trim();
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Speech model is still loading on the server. Wait a minute and try again.');
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export interface LocalSpeechInput {
  listening: boolean;
  processing: boolean;
  start: () => Promise<void>;
  stop: () => void;
  supported: boolean;
  error: string | null;
  clearError: () => void;
}

export function useLocalSpeechInput(
  onFinal: (text: string) => void,
  onProcessing?: (active: boolean) => void,
  onHeard?: () => void,
): LocalSpeechInput {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinalRef = useRef(onFinal);
  const onProcessingRef = useRef(onProcessing);
  const onHeardRef = useRef(onHeard);
  onFinalRef.current = onFinal;
  onProcessingRef.current = onProcessing;
  onHeardRef.current = onHeard;

  const activeRef = useRef(false);
  const startingRef = useRef(false);
  const processingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const speakingRef = useRef(false);
  const silenceStartRef = useRef(0);
  const speechChunksRef = useRef<Float32Array[]>([]);
  const ringBufferRef = useRef<Float32Array[]>([]);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const noiseFloorRef = useRef(0.004);
  const calibratingRef = useRef(true);
  const calibrateUntilRef = useRef(0);
  const calibrateSamplesRef = useRef<number[]>([]);

  const envThreshold = Number(process.env.NEXT_PUBLIC_VAD_THRESHOLD ?? 0);

  const setProcessingState = useCallback((value: boolean) => {
    processingRef.current = value;
    setProcessing(value);
    onProcessingRef.current?.(value);
  }, []);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    speakingRef.current = false;
    silenceStartRef.current = 0;
    speechChunksRef.current = [];
    ringBufferRef.current = [];
    calibratingRef.current = true;
    calibrateSamplesRef.current = [];
  }, []);

  const finalizeUtterance = useCallback(async () => {
    const ctx = ctxRef.current;
    const chunks = speechChunksRef.current;
    speechChunksRef.current = [];
    if (!ctx || !activeRef.current) return;
    if (chunks.length === 0) {
      setError('No speech detected. Speak closer to the mic, then pause briefly.');
      return;
    }

    const total = chunks.reduce((n, c) => n + c.length, 0);
    if (total < ctx.sampleRate * MIN_UTTERANCE_S) {
      setError('Speech was too short. Say a full sentence, then pause.');
      return;
    }

    let merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const normalized = normalizeAudio(merged);
    onHeardRef.current?.();
    setProcessingState(true);
    setError(null);
    try {
      const pcm16k = await resampleTo16k(normalized, ctx.sampleRate);
      const wav = encodeWav(pcm16k, 16_000);
      const text = await transcribeBlob(wav);
      if (text) {
        setError(null);
        onFinalRef.current(text);
      } else {
        setError(
          'Could not transcribe that. Speak clearly, a bit louder, then pause briefly.',
        );
      }
    } catch (err) {
      setError((err as Error).message || 'Local transcription failed.');
    } finally {
      setProcessingState(false);
    }
  }, [setProcessingState]);

  const stop = useCallback(() => {
    activeRef.current = false;
    startingRef.current = false;
    setListening(false);
    setProcessingState(false);
    cleanup();
  }, [cleanup, setProcessingState]);

  const start = useCallback(async () => {
    if (activeRef.current || startingRef.current) return;
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone is not available in this browser.');
      return;
    }

    startingRef.current = true;
    cleanup();
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      calibratingRef.current = true;
      calibrateUntilRef.current = performance.now() + 500;
      calibrateSamplesRef.current = [];

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        if (!activeRef.current || processingRef.current) return;
        const chunk = new Float32Array(event.inputBuffer.getChannelData(0));
        ringBufferRef.current.push(chunk);
        if (ringBufferRef.current.length > 40) ringBufferRef.current.shift();
        if (speakingRef.current) {
          speechChunksRef.current.push(chunk);
        }
      };
      source.connect(processor);
      const sink = ctx.createGain();
      sink.gain.value = 0;
      processor.connect(sink);
      sink.connect(ctx.destination);

      activeRef.current = true;
      setListening(true);

      const tick = () => {
        if (!activeRef.current) return;
        const timeDomain = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(timeDomain);
        let sum = 0;
        for (let i = 0; i < timeDomain.length; i++) {
          const sample = (timeDomain[i]! - 128) / 128;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / timeDomain.length);
        const now = performance.now();

        if (calibratingRef.current) {
          calibrateSamplesRef.current.push(rms);
          if (now >= calibrateUntilRef.current) {
            const samples = calibrateSamplesRef.current;
            const sorted = [...samples].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)] ?? 0.004;
            noiseFloorRef.current = Math.max(0.002, median);
            calibratingRef.current = false;
          }
        }

        if (processingRef.current) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const floor = envThreshold > 0 ? envThreshold : noiseFloorRef.current;
        const startThreshold = Math.max(0.008, floor * 3);
        const continueThreshold = Math.max(0.006, floor * 2);
        const threshold = speakingRef.current ? continueThreshold : startThreshold;
        const silenceMs = DEFAULT_SILENCE_MS;

        if (rms > threshold) {
          if (!speakingRef.current && !calibratingRef.current) {
            speakingRef.current = true;
            speechChunksRef.current = ringBufferRef.current.slice(-8);
          }
          silenceStartRef.current = 0;
        } else if (speakingRef.current) {
          if (!silenceStartRef.current) silenceStartRef.current = now;
          if (now - silenceStartRef.current >= silenceMs) {
            speakingRef.current = false;
            silenceStartRef.current = 0;
            void finalizeUtterance();
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setError(
        'Microphone access denied. Allow mic permission in your browser settings.',
      );
      stop();
    } finally {
      startingRef.current = false;
    }
  }, [cleanup, finalizeUtterance, stop]);

  const supported =
    typeof window !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof AudioContext !== 'undefined';

  return {
    listening,
    processing,
    start,
    stop,
    supported,
    error,
    clearError: () => setError(null),
  };
}
