'use client';

import { api } from '@/lib/api';

const VOICE_PREF_KEY = 'bellasos:jarvis:voiceName';

const FEMALE_VOICE_HINTS =
  /\b(zira|samantha|victoria|jenny|susan|hazel|serena|sonia|linda|karen|moira|fiona|tessa|aria|emma|natasha|female|google uk english female|microsoft zira)\b/i;

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

function readVoicePreference(): string | null {
  try {
    return (
      process.env.NEXT_PUBLIC_JARVIS_VOICE?.trim() ||
      localStorage.getItem(VOICE_PREF_KEY)?.trim() ||
      null
    );
  } catch {
    return process.env.NEXT_PUBLIC_JARVIS_VOICE?.trim() || null;
  }
}

function ttsMode(): 'auto' | 'cloud' | 'browser' {
  const raw = (process.env.NEXT_PUBLIC_JARVIS_TTS ?? 'auto').trim().toLowerCase();
  if (raw === 'cloud' || raw === 'browser') return raw;
  return 'auto';
}

export function setJarvisVoicePreference(name: string | null): void {
  try {
    if (!name) localStorage.removeItem(VOICE_PREF_KEY);
    else localStorage.setItem(VOICE_PREF_KEY, name);
  } catch {
    /* ignore */
  }
}

function scoreVoice(voice: SpeechSynthesisVoice, preference: string | null): number {
  let score = 0;
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();

  if (lang.startsWith('en-us')) score += 12;
  else if (lang.startsWith('en-gb')) score += 10;
  else if (lang.startsWith('en')) score += 6;

  if (FEMALE_VOICE_HINTS.test(voice.name)) score += 40;
  if (voice.localService) score += 8;
  if (/natural|neural|premium|enhanced|online/i.test(voice.name)) score += 6;

  if (preference) {
    const pref = preference.toLowerCase();
    if (name === pref) score += 200;
    else if (name.includes(pref) || pref.includes(name)) score += 120;
  }

  return score;
}

export function pickJarvisVoice(
  voices: SpeechSynthesisVoice[],
  preference = readVoicePreference(),
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  return (
    [...voices].sort((a, b) => scoreVoice(b, preference) - scoreVoice(a, preference))[0] ??
    null
  );
}

export function listJarvisVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

export function preloadJarvisVoice(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const load = () => resolve(window.speechSynthesis.getVoices());
      load();
      window.speechSynthesis.onvoiceschanged = load;
      window.setTimeout(load, 400);
    });
  }
  void voicesReady;
}

async function browserVoices(): Promise<SpeechSynthesisVoice[]> {
  preloadJarvisVoice();
  return voicesReady ?? Promise.resolve([]);
}

function speechRate(): number {
  const raw = Number(process.env.NEXT_PUBLIC_JARVIS_SPEECH_RATE ?? 0.93);
  return Number.isFinite(raw) ? Math.min(1.2, Math.max(0.75, raw)) : 0.93;
}

function speechPitch(): number {
  const raw = Number(process.env.NEXT_PUBLIC_JARVIS_SPEECH_PITCH ?? 1.08);
  return Number.isFinite(raw) ? Math.min(1.3, Math.max(0.85, raw)) : 1.08;
}

/** Strip formatting and soften text for more natural TTS. */
export function normalizeForSpeech(text: string): string {
  return text
    .replace(/\*\*|__|`/g, '')
    .replace(/[\u2014\u2013]/g, ', ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoSpeechChunks(text: string): string[] {
  const normalized = normalizeForSpeech(text);
  if (!normalized) return [];
  const parts = normalized.match(/[^.!?]+[.!?]?/g)?.map((p) => p.trim()).filter(Boolean);
  if (!parts || parts.length <= 1) return [normalized];
  return parts;
}

function releaseAudioResources(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function speakChunk(
  chunk: string,
  voice: SpeechSynthesisVoice | null,
): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = voice?.lang ?? 'en-US';
    utterance.rate = speechRate();
    utterance.pitch = speechPitch();
    utterance.volume = 1;
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

async function speakWithBrowser(text: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const available = await browserVoices();
  const voice = pickJarvisVoice(available);
  const chunks = splitIntoSpeechChunks(text);
  if (chunks.length === 0) return;

  window.speechSynthesis.cancel();
  await new Promise((r) => window.setTimeout(r, 40));

  for (const chunk of chunks) {
    await speakChunk(chunk, voice);
  }
}

function playCloudAudio(base64: string, mimeType: string): Promise<void> {
  return new Promise((resolve) => {
    releaseAudioResources();

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const blob = new Blob([bytes], { type: mimeType || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    currentObjectUrl = url;

    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      releaseAudioResources();
      resolve();
    };
    audio.onerror = () => {
      releaseAudioResources();
      resolve();
    };

    void audio.play().catch(() => {
      releaseAudioResources();
      resolve();
    });
  });
}

async function speakWithCloud(text: string): Promise<boolean> {
  const normalized = normalizeForSpeech(text);
  if (!normalized) return false;

  try {
    const result = await api.jarvisSpeak(normalized);
    if (!result.available) return false;
    await playCloudAudio(result.audioBase64, result.mimeType);
    return true;
  } catch {
    return false;
  }
}

export async function speakTextAsync(text: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const mode = ttsMode();
  if (mode !== 'browser') {
    const usedCloud = await speakWithCloud(text);
    if (usedCloud) return;
    if (mode === 'cloud') return;
  }

  await speakWithBrowser(text);
}

export function speakText(text: string, onEnd?: () => void) {
  void speakTextAsync(text).finally(() => onEnd?.());
}

export function stopSpeaking(): void {
  releaseAudioResources();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}