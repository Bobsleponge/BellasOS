'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isImpulsiveSound,
  isLiveSpeechFrame,
  normalizeForStt,
} from '@/lib/speechDetection';

const DEFAULT_SILENCE_MS = Number(process.env.NEXT_PUBLIC_SILENCE_MS ?? 1400);
const MIN_UTTERANCE_S = 0.4;
const SPEECH_ARM_MS = 180;

function normalizeAudio(samples: Float32Array): Float32Array {
  return normalizeForStt(samples);
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

import { api } from '@/lib/api';

async function transcribeBlob(blob: Blob, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 300_000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    return await api.jarvisTranscribe(blob, controller.signal);
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      if (signal?.aborted) {
        throw new Error('CANCELLED');
      }
      throw new Error('Speech model is still loading on the server. Wait a minute and try again.');
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface LocalSpeechInput {
  listening: boolean;
  processing: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
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
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      Boolean(navigator.mediaDevices?.getUserMedia) && typeof AudioContext !== 'undefined',
    );
  }, []);

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
  const speechStreakStartRef = useRef(0);
  const armedRef = useRef(false);
  const utteranceGenerationRef = useRef(0);
  const transcribeAbortRef = useRef<AbortController | null>(null);

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
    speechStreakStartRef.current = 0;
    armedRef.current = false;
  }, []);

  const finalizeUtterance = useCallback(async () => {
    const ctx = ctxRef.current;
    const chunks = speechChunksRef.current;
    speechChunksRef.current = [];
    if (!ctx || !activeRef.current) return;
    if (chunks.length === 0) return;

    const total = chunks.reduce((n, c) => n + c.length, 0);
    if (total < ctx.sampleRate * MIN_UTTERANCE_S) return;

    let merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    if (isImpulsiveSound(merged, ctx.sampleRate)) return;

    const normalized = normalizeAudio(merged);
    const generation = ++utteranceGenerationRef.current;

    onHeardRef.current?.();
    setProcessingState(true);
    setError(null);
    transcribeAbortRef.current?.abort();
    const abort = new AbortController();
    transcribeAbortRef.current = abort;
    try {
      const pcm16k = await resampleTo16k(normalized, ctx.sampleRate);
      const wav = encodeWav(pcm16k, 16_000);
      const text = await transcribeBlob(wav, abort.signal);
      if (generation !== utteranceGenerationRef.current) return;
      if (text) {
        setError(null);
        onFinalRef.current(text);
      }
    } catch (err) {
      if (generation !== utteranceGenerationRef.current) return;
      const msg = (err as Error).message || 'Local transcription failed.';
      if (msg === 'CANCELLED') return;
      setError(msg);
    } finally {
      if (generation === utteranceGenerationRef.current) {
        transcribeAbortRef.current = null;
        setProcessingState(false);
      }
    }
  }, [setProcessingState]);

  const cancel = useCallback(() => {
    utteranceGenerationRef.current += 1;
    transcribeAbortRef.current?.abort();
    transcribeAbortRef.current = null;
    speakingRef.current = false;
    armedRef.current = false;
    silenceStartRef.current = 0;
    speechStreakStartRef.current = 0;
    speechChunksRef.current = [];
    setProcessingState(false);
    setError(null);
  }, [setProcessingState]);

  const stop = useCallback(() => {
    cancel();
    activeRef.current = false;
    startingRef.current = false;
    setListening(false);
    cleanup();
  }, [cancel, cleanup]);

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

      const ctx = new AudioContext({ sampleRate: 16_000 });
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
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(timeDomain);
        analyser.getByteFrequencyData(freqData);
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

        if (calibratingRef.current) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const floor = envThreshold > 0 ? envThreshold : noiseFloorRef.current;
        const startThreshold = Math.max(0.008, floor * 3);
        const continueThreshold = Math.max(0.006, floor * 2);
        const threshold = speakingRef.current ? continueThreshold : startThreshold;
        const silenceMs = DEFAULT_SILENCE_MS;

        const liveSpeech = isLiveSpeechFrame(
          rms,
          threshold,
          freqData,
          ctx.sampleRate,
          analyser.fftSize,
          armedRef.current && speakingRef.current,
        );

        if (liveSpeech) {
          if (!speechStreakStartRef.current) speechStreakStartRef.current = now;
          const streakMs = now - speechStreakStartRef.current;
          if (!armedRef.current && streakMs >= SPEECH_ARM_MS) {
            armedRef.current = true;
            speakingRef.current = true;
            speechChunksRef.current = ringBufferRef.current.slice(-12);
          } else if (armedRef.current && speakingRef.current) {
            /* already recording */
          }
          silenceStartRef.current = 0;
        } else {
          speechStreakStartRef.current = 0;
          if (!armedRef.current) {
            speakingRef.current = false;
            speechChunksRef.current = [];
          } else if (speakingRef.current) {
            if (!silenceStartRef.current) silenceStartRef.current = now;
            if (now - silenceStartRef.current >= silenceMs) {
              speakingRef.current = false;
              armedRef.current = false;
              silenceStartRef.current = 0;
              speechStreakStartRef.current = 0;
              void finalizeUtterance();
            }
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

  return {
    listening,
    processing,
    start,
    stop,
    cancel,
    supported,
    error,
    clearError: () => setError(null),
  };
}
