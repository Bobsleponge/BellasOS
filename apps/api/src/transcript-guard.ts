const WHISPER_HALLUCINATION =
  /^(thanks?\s*(you\s*)?for\s*(watching|listening)|please subscribe|subscribe to|like and subscribe|see you next time|copyright|\[music\]|\[applause\]|subtitle(s)?\s*by|amara\.org)/i;

const SAFETY_REFUSAL =
  /cannot provide information|can't provide information|can't help with|cannot help with|illegal or harmful|against my (guidelines|policy)|content policy|not able to assist|violat(e|es|ing) (our )?polic/i;

const EXPLICIT_HARMFUL_REQUEST =
  /\b(child\s*(porn|sexual|abuse|exploit)|csam|pedoph|molest|rape|murder|bomb|terror|suicide\s*method|make\s+(drugs|meth|weapon)|how\s+to\s+(hack|steal|kill))\b/i;

export interface SpeechLikelihood {
  activeRatio: number;
  peak: number;
  rms: number;
}

export function analyzeSpeechLikelihood(
  samples: Float32Array,
  sampleRate: number,
  frameMs = 20,
): SpeechLikelihood {
  const frameSize = Math.max(1, Math.floor((sampleRate * frameMs) / 1000));
  let sumSq = 0;
  let peak = 0;
  let activeFrames = 0;
  let frames = 0;

  for (let i = 0; i < samples.length; i += frameSize) {
    let frameSum = 0;
    const end = Math.min(i + frameSize, samples.length);
    for (let j = i; j < end; j++) {
      const v = samples[j] ?? 0;
      frameSum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    const len = end - i;
    const frameRms = Math.sqrt(frameSum / len);
    sumSq += frameSum;
    if (frameRms > 0.012) activeFrames += 1;
    frames += 1;
  }

  const rms = samples.length > 0 ? Math.sqrt(sumSq / samples.length) : 0;
  return {
    activeRatio: frames > 0 ? activeFrames / frames : 0,
    peak,
    rms,
  };
}

export function looksLikeWhisperHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (WHISPER_HALLUCINATION.test(t)) return true;
  if (/^[.!,?_\-*#~\s]+$/u.test(t)) return true;
  return false;
}

export function looksLikeNoiseTranscript(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length <= 1) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0]!.length <= 1) return true;
  if (!/[aeiouAEIOUyY]/.test(t) && t.length < 24) return true;
  if (/^(.)\1{4,}$/u.test(t.replace(/\s/g, ''))) return true;
  return false;
}

export function shouldRejectVoiceTranscript(text: string): boolean {
  return looksLikeWhisperHallucination(text) || looksLikeNoiseTranscript(text);
}

export function looksLikeInnocuousVoiceInput(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length > 120) return false;
  if (EXPLICIT_HARMFUL_REQUEST.test(t)) return false;
  return true;
}

export function looksLikeModelSafetyRefusal(reply: string): boolean {
  return SAFETY_REFUSAL.test(reply.trim());
}

const VOICE_MISHEAR_REPLY =
  "I didn't catch that - it might have been background noise. Try speaking again.";

export function sanitizeJarvisReply(
  reply: string,
  userMessage: string,
  source?: 'voice' | 'text',
): string {
  if (!looksLikeModelSafetyRefusal(reply)) return reply;
  if (source !== 'voice' && !looksLikeInnocuousVoiceInput(userMessage)) return reply;
  if (!looksLikeInnocuousVoiceInput(userMessage)) return reply;
  return VOICE_MISHEAR_REPLY;
}

export function voiceMishearReply(): string {
  return VOICE_MISHEAR_REPLY;
}

export function isImpulsiveNonSpeech(
  samples: Float32Array,
  sampleRate: number,
  durationS: number,
): boolean {
  if (durationS < 0.18) return true;

  const frameSize = Math.max(1, Math.floor((sampleRate * 20) / 1000));
  let activeFrames = 0;
  let frames = 0;
  let longestRun = 0;
  let currentRun = 0;
  let sumSq = 0;

  for (let i = 0; i < samples.length; i++) {
    sumSq += (samples[i] ?? 0) ** 2;
  }
  const overallRms = samples.length > 0 ? Math.sqrt(sumSq / samples.length) : 0;
  const rmsThreshold = Math.max(0.006, overallRms * 0.25);

  for (let i = 0; i < samples.length; i += frameSize) {
    const end = Math.min(i + frameSize, samples.length);
    let frameSum = 0;
    for (let j = i; j < end; j++) {
      frameSum += (samples[j] ?? 0) ** 2;
    }
    const frameRms = Math.sqrt(frameSum / (end - i));
    const active = frameRms >= rmsThreshold;
    frames += 1;
    if (active) {
      activeFrames += 1;
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  const activeRatio = frames > 0 ? activeFrames / frames : 0;
  const longestRunMs = longestRun * 20;

  if (longestRunMs < 70 && durationS < 0.45) return true;
  if (longestRunMs < 50 && activeRatio < 0.1) return true;
  return false;
}

/** @deprecated Use isImpulsiveNonSpeech — kept for compatibility. */
export function isLikelyNonSpeechAudio(
  samples: Float32Array,
  sampleRate: number,
  durationS: number,
): boolean {
  return isImpulsiveNonSpeech(samples, sampleRate, durationS);
}
