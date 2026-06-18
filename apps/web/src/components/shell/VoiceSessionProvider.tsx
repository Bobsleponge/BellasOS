'use client';

import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useJarvisSession } from '@/hooks/useJarvisSession';
import { useLocalSpeechInput } from '@/hooks/useLocalSpeechInput';
import { useShellStore } from '@/stores/shellStore';

interface VoiceSessionContextValue {
  voiceSessionActive: boolean;
  listening: boolean;
  processing: boolean;
  supported: boolean;
  eqState: string;
  speechError: string | null;
  toggleVoiceSession: () => void;
  startVoiceSession: () => Promise<void>;
  stopVoiceSession: () => void;
}

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);

function VoiceSessionController({ children }: { children: ReactNode }) {
  const voiceSessionActive = useShellStore((s) => s.voiceSessionActive);
  const setVoiceSessionActive = useShellStore((s) => s.setVoiceSessionActive);
  const eqState = useShellStore((s) => s.eqState);
  const setEqState = useShellStore((s) => s.setEqState);
  const speechError = useShellStore((s) => s.speechError);
  const setSpeechError = useShellStore((s) => s.setSpeechError);
  const { sendMessage } = useJarvisSession();

  const onSpeech = useCallback(
    (spoken: string) => {
      setSpeechError(null);
      sendMessage(spoken);
    },
    [sendMessage, setSpeechError],
  );

  const onProcessing = useCallback(
    (active: boolean) => {
      if (active) setEqState('processing');
      else if (useShellStore.getState().voiceSessionActive) setEqState('listening');
    },
    [setEqState],
  );

  const { listening, processing, start, stop, supported, error, clearError } =
    useLocalSpeechInput(onSpeech, onProcessing);

  const shouldListen =
    voiceSessionActive &&
    (eqState === 'listening' || eqState === 'idle' || eqState === 'processing');

  useEffect(() => {
    if (!supported) return;
    if (error && /denied|not available|not supported|blocked/i.test(error)) return;
    if (shouldListen && !listening && !processing) {
      if (eqState === 'idle') setEqState('listening');
      void start();
      return;
    }
    if (!shouldListen && listening && !processing) {
      stop();
    }
  }, [
    shouldListen,
    listening,
    processing,
    supported,
    start,
    stop,
    eqState,
    setEqState,
    error,
  ]);

  useEffect(() => {
    if (error) setSpeechError(error);
  }, [error, setSpeechError]);

  useEffect(() => {
    if (!error) return;
    const fatal =
      /denied|not supported|blocked|service-not-allowed/i.test(error);
    if (fatal) {
      setVoiceSessionActive(false);
      setEqState('idle');
      stop();
    }
  }, [error, setVoiceSessionActive, setEqState, stop]);

  const startVoiceSession = useCallback(async () => {
    clearError();
    setSpeechError(null);
    if (!supported) {
      setSpeechError(
        'Local speech is not supported in this browser. Use Chrome or Edge, or type instead.',
      );
      return;
    }
    setVoiceSessionActive(true);
    setEqState('listening');
  }, [clearError, setSpeechError, setVoiceSessionActive, setEqState, supported]);

  const stopVoiceSession = useCallback(() => {
    setVoiceSessionActive(false);
    setEqState('idle');
    stop();
    setSpeechError(null);
    clearError();
  }, [setVoiceSessionActive, setEqState, stop, setSpeechError, clearError]);

  const toggleVoiceSession = useCallback(() => {
    if (voiceSessionActive) stopVoiceSession();
    else void startVoiceSession();
  }, [voiceSessionActive, stopVoiceSession, startVoiceSession]);

  return (
    <VoiceSessionContext.Provider
      value={{
        voiceSessionActive,
        listening,
        processing,
        supported,
        eqState,
        speechError,
        toggleVoiceSession,
        startVoiceSession,
        stopVoiceSession,
      }}
    >
      {children}
    </VoiceSessionContext.Provider>
  );
}

export function VoiceSessionProvider({ children }: { children: ReactNode }) {
  return <VoiceSessionController>{children}</VoiceSessionController>;
}

export function useVoiceSession(): VoiceSessionContextValue {
  const ctx = useContext(VoiceSessionContext);
  if (!ctx) {
    throw new Error('useVoiceSession must be used within VoiceSessionProvider');
  }
  return ctx;
}
