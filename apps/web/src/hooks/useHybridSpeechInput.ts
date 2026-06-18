'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSpeechInput } from './useLocalSpeechInput';
import { useSpeechInput } from './useSpeechInput';

export type SpeechMode = 'browser' | 'local';

export interface HybridSpeechInput {
  listening: boolean;
  processing: boolean;
  mode: SpeechMode;
  start: () => Promise<void>;
  stop: () => void;
  supported: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Prefer browser speech (fast, accurate) when online; fall back to local Whisper
 * when the browser reports a network/service error.
 */
export function useHybridSpeechInput(
  onFinal: (text: string) => void,
  onProcessing?: (active: boolean) => void,
): HybridSpeechInput {
  const [mode, setMode] = useState<SpeechMode>('browser');
  const modeRef = useRef<SpeechMode>('browser');
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const onBrowserFinal = useCallback((text: string) => {
    onFinalRef.current(text);
  }, []);

  const browser = useSpeechInput(onBrowserFinal);
  const local = useLocalSpeechInput(onFinal, onProcessing);

  useEffect(() => {
    if (!browser.error) return;
    if (/network|service-not-allowed/i.test(browser.error)) {
      setMode('local');
      modeRef.current = 'local';
      browser.clearError();
    }
  }, [browser.error, browser]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const start = useCallback(async () => {
    if (modeRef.current === 'browser' && browser.supported) {
      browser.start();
      return;
    }
    await local.start();
  }, [browser, local]);

  const stop = useCallback(() => {
    browser.stop();
    local.stop();
  }, [browser, local]);

  const active = mode === 'browser' && browser.supported ? browser : local;

  return {
    listening: active.listening,
    processing: 'processing' in active ? active.processing : false,
    mode,
    start,
    stop,
    supported: browser.supported || local.supported,
    error: active.error,
    clearError: active.clearError,
  };
}
