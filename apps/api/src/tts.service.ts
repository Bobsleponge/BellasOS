import { createLogger } from '@bellasos/observability';

const log = createLogger({ lib: 'tts' });

const OPENAI_VOICES = new Set([
  'alloy',
  'ash',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
]);

export type TtsSuccess = {
  available: true;
  audioBase64: string;
  mimeType: string;
  provider: 'openai' | 'elevenlabs';
  voice: string;
};

export type TtsUnavailable = {
  available: false;
  reason: string;
};

export type TtsResult = TtsSuccess | TtsUnavailable;

function providerMode(): 'auto' | 'openai' | 'elevenlabs' | 'none' {
  const raw = (process.env.JARVIS_TTS_PROVIDER ?? 'auto').trim().toLowerCase();
  if (raw === 'openai' || raw === 'elevenlabs' || raw === 'none') return raw;
  return 'auto';
}

function openAiVoice(): string {
  const voice = (process.env.JARVIS_TTS_VOICE ?? 'nova').trim().toLowerCase();
  return OPENAI_VOICES.has(voice) ? voice : 'nova';
}

function elevenLabsVoiceId(): string {
  return (
    process.env.JARVIS_ELEVENLABS_VOICE_ID?.trim() ||
    '21m00Tcm4TlvDq8ikWAM'
  );
}

function speechSpeed(): number {
  const raw = Number(process.env.JARVIS_TTS_SPEED ?? 0.95);
  if (!Number.isFinite(raw)) return 0.95;
  return Math.min(1.15, Math.max(0.75, raw));
}

function trimForTts(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 3900) return cleaned;
  return `${cleaned.slice(0, 3897)}...`;
}

async function synthesizeOpenAi(text: string): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.JARVIS_TTS_MODEL?.trim() || 'tts-1';
  const voice = openAiVoice();

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      response_format: 'mp3',
      speed: speechSpeed(),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    log.warn('OpenAI TTS failed', { status: res.status, detail: detail.slice(0, 200) });
    return null;
  }

  return Buffer.from(await res.arrayBuffer());
}

async function synthesizeElevenLabs(text: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;

  const voiceId = elevenLabsVoiceId();
  const modelId = process.env.JARVIS_ELEVENLABS_MODEL?.trim() || 'eleven_turbo_v2_5';

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    log.warn('ElevenLabs TTS failed', { status: res.status, detail: detail.slice(0, 200) });
    return null;
  }

  return Buffer.from(await res.arrayBuffer());
}

export function isCloudTtsConfigured(): boolean {
  const mode = providerMode();
  if (mode === 'none') return false;
  if (mode === 'openai') return Boolean(process.env.OPENAI_API_KEY?.trim());
  if (mode === 'elevenlabs') return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
}

export async function synthesizeSpeech(text: string): Promise<TtsResult> {
  const input = trimForTts(text);
  if (!input) return { available: false, reason: 'empty' };

  const mode = providerMode();
  if (mode === 'none') return { available: false, reason: 'disabled' };

  const tryEleven = mode === 'elevenlabs' || mode === 'auto';
  const tryOpenAi = mode === 'openai' || mode === 'auto';

  if (tryEleven) {
    const audio = await synthesizeElevenLabs(input);
    if (audio?.length) {
      return {
        available: true,
        audioBase64: audio.toString('base64'),
        mimeType: 'audio/mpeg',
        provider: 'elevenlabs',
        voice: elevenLabsVoiceId(),
      };
    }
    if (mode === 'elevenlabs') {
      return { available: false, reason: 'elevenlabs_failed' };
    }
  }

  if (tryOpenAi) {
    const audio = await synthesizeOpenAi(input);
    if (audio?.length) {
      return {
        available: true,
        audioBase64: audio.toString('base64'),
        mimeType: 'audio/mpeg',
        provider: 'openai',
        voice: openAiVoice(),
      };
    }
    if (mode === 'openai') {
      return { available: false, reason: 'openai_failed' };
    }
  }

  return { available: false, reason: 'no_provider' };
}