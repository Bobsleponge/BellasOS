'use client';

import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useJarvisSession } from '@/hooks/useJarvisSession';
import { useHybridSpeechInput } from '@/hooks/useHybridSpeechInput';
import { canAcceptSpeechInput, useShellStore } from '@/stores/shellStore';
import { api } from '@/lib/api';

interface VoiceSessionContextValue {
  voiceSessionActive: boolean;
  micListening: boolean;
  listening: boolean;
  processing: boolean;
  mode: string;
  supported: boolean;
  eqState: string;
  speechError: string | null;
  toggleMicListening: () => void;
}

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);

function VoiceSessionController({ children }: { children: ReactNode }) {
  const voiceSessionActive = useShellStore((s) => s.voiceSessionActive);
  const micListening = useShellStore((s) => s.micListening);
  const eqState = useShellStore((s) => s.eqState);
  const setVoiceSessionActive = useShellStore((s) => s.setVoiceSessionActive);
  const setMicListening = useShellStore((s) => s.setMicListening);
  const setEqState = useShellStore((s) => s.setEqState);
  const setHeardCaption = useShellStore((s) => s.setHeardCaption);
  const speechError = useShellStore((s) => s.speechError);
  const setSpeechError = useShellStore((s) => s.setSpeechError);
  const { sendMessage } = useJarvisSession();

  const onSpeech = useCallback(
    (spoken: string) => {
      setSpeechError(null);
      sendMessage(spoken, 'voice');
    },
    [sendMessage, setSpeechError],
  );

  const onHeard = useCallback(() => {
    setHeardCaption('Got it — transcribing your speech…');
    setEqState('heard');
  }, [setEqState, setHeardCaption]);

  const onProcessing = useCallback(
    (active: boolean) => {
      if (active) setEqState('transcribing');
      else if (useShellStore.getState().micListening) {
        setEqState('listening');
        setHeardCaption(null);
      }
    },
    [setEqState, setHeardCaption],
  );

  const canCapture = micListening && canAcceptSpeechInput(eqState);

  const { listening, processing, start, stop, supported, error, clearError, mode } =
    useHybridSpeechInput(onSpeech, onProcessing, onHeard, canCapture);

  const shouldCapture = canCapture && !processing;

  useEffect(() => {
    if (!supported) return;
    if (error && /denied|not available|not supported|blocked/i.test(error)) return;
    if (shouldCapture && !listening && !processing) {
      void start();
      return;
    }
    if (!shouldCapture && listening && !processing) {
      stop();
    }
  }, [shouldCapture, listening, processing, supported, start, stop, error]);

  useEffect(() => {
    if (error) setSpeechError(error);
  }, [error, setSpeechError]);

  useEffect(() => {
    if (!error) return;
    const fatal = /denied|not supported|blocked|service-not-allowed/i.test(error);
    if (fatal) {
      setMicListening(false);
      setVoiceSessionActive(false);
      if (eqState === 'listening') setEqState('idle');
      stop();
    }
  }, [error, setVoiceSessionActive, setMicListening, setEqState, stop, eqState]);

  const toggleMicListening = useCallback(() => {
    clearError();
    if (!supported) {
      setSpeechError(
        'Local speech is not supported in this browser. Use Chrome or Edge, or type instead.',
      );
      return;
    }

    if (!micListening) {
      setSpeechError(null);
      setVoiceSessionActive(true);
      if (eqState === 'idle') setEqState('listening');
      if (canAcceptSpeechInput(useShellStore.getState().eqState)) {
        setMicListening(true);
        void api.jarvisWarmupStt().catch(() => {});
      }
      return;
    }

    setMicListening(false);
    stop();
  }, [
    clearError,
    micListening,
    supported,
    setSpeechError,
    setVoiceSessionActive,
    setMicListening,
    setEqState,
    eqState,
    stop,
  ]);

  return (
    <VoiceSessionContext.Provider
      value={{
        voiceSessionActive,
        micListening,
        listening,
        processing,
        mode,
        supported,
        eqState,
        speechError,
        toggleMicListening,
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
