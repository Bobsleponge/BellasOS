'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useLocalSpeechInput } from './useLocalSpeechInput';

export type SpeechMode = 'local';

export interface HybridSpeechInput {
  listening: boolean;
  processing: boolean;
  mode: SpeechMode;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  supported: boolean;
  error: string | null;
  clearError: () => void;
}

/** Local Whisper STT (offline/private). Browser speech disabled per product preference. */
export function useHybridSpeechInput(
  onFinal: (text: string) => void,
  onProcessing?: (active: boolean) => void,
  onHeard?: () => void,
  canCapture = false,
): HybridSpeechInput {
  const canCaptureRef = useRef(canCapture);
  canCaptureRef.current = canCapture;

  const local = useLocalSpeechInput(onFinal, onProcessing, onHeard);

  useEffect(() => {
    if (canCapture) {
      void api.jarvisWarmupStt().catch(() => {});
    }
  }, [canCapture]);

  const start = useCallback(async () => {
    if (!canCaptureRef.current) return;
    await local.start();
  }, [local]);

  const stop = useCallback(() => {
    local.stop();
  }, [local]);

  const cancel = useCallback(() => {
    local.cancel();
  }, [local]);

  return {
    listening: local.listening,
    processing: local.processing,
    mode: 'local',
    start,
    stop,
    cancel,
    supported: local.supported,
    error: local.error,
    clearError: local.clearError,
  };
}
