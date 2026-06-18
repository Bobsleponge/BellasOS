/** Detect impulsive sounds (taps/clicks) vs sustained speech for VAD gating. */

const FRAME_MS = 20;
const VOICE_BAND_LOW_HZ = 300;
const VOICE_BAND_HIGH_HZ = 3400;

function frameRms(samples: Float32Array, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end; i++) {
    const v = samples[i] ?? 0;
    sum += v * v;
  }
  return Math.sqrt(sum / Math.max(1, end - start));
}

/** True for desk taps / clicks — not for spoken words. */
export function isImpulsiveSound(samples: Float32Array, sampleRate: number): boolean {
  const frameSize = Math.max(1, Math.floor((sampleRate * FRAME_MS) / 1000));
  let peak = 0;
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
    const rms = frameRms(samples, i, end);
    peak = Math.max(peak, rms);
    const active = rms >= rmsThreshold;
    frames += 1;
    if (active) {
      activeFrames += 1;
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  const durationS = samples.length / sampleRate;
  const activeRatio = frames > 0 ? activeFrames / frames : 0;
  const longestRunMs = longestRun * FRAME_MS;

  if (durationS < 0.18) return true;
  if (longestRunMs < 70 && durationS < 0.45) return true;
  if (longestRunMs < 50 && activeRatio < 0.1) return true;
  return false;
}

/**
 * Live mic gate. When already recording, use level only so quiet syllables are kept.
 * When idle, require voice-band energy to ignore impulsive sounds.
 */
export function isLiveSpeechFrame(
  rms: number,
  threshold: number,
  frequencyData: Uint8Array,
  sampleRate: number,
  fftSize: number,
  recording: boolean,
): boolean {
  if (rms <= threshold) return false;
  if (recording) return true;

  const binHz = sampleRate / fftSize;
  let voiceEnergy = 0;
  let totalEnergy = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    const hz = i * binHz;
    const v = frequencyData[i] ?? 0;
    totalEnergy += v;
    if (hz >= VOICE_BAND_LOW_HZ && hz <= VOICE_BAND_HIGH_HZ) voiceEnergy += v;
  }
  const voiceRatio = totalEnergy > 0 ? voiceEnergy / totalEnergy : 0;
  return voiceRatio >= 0.22;
}

/** Gentle RMS normalize — avoids peak-boosting noise between words. */
export function normalizeForStt(samples: Float32Array): Float32Array {
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
