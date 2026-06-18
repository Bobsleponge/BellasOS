'use client';

import { useCallback, useRef } from 'react';
import { api, type JarvisChatResponse } from '@/lib/api';
import { canAcceptSpeechInput, useShellStore } from '@/stores/shellStore';
import { speakText } from './useSpeechInput';

const APP_TITLES: Record<string, string> = {
  'bellasos.portfolio': 'Portfolio',
  'bellasos.research': 'Research',
  'bellasos.intelligence': 'Intelligence',
  'bellasos.social': 'Social Media',
  'bellasos.automation': 'Automation',
  'bellasos.voice': 'Voice',
  'bellasos.camera': 'Camera',
  'bellasos.llm': 'LLM Management',
  'ai.studio': 'AI Studio',
  'system.console': 'System Console',
};

export function useJarvisSession() {
  const setEqState = useShellStore((s) => s.setEqState);
  const setHeardCaption = useShellStore((s) => s.setHeardCaption);
  const addTranscript = useShellStore((s) => s.addTranscript);
  const openApp = useShellStore((s) => s.openApp);
  const turnRef = useRef(0);

  const sendMessage = useCallback(
    async (message: string, source: 'voice' | 'text' = 'text') => {
      const text = message.trim();
      if (!text) return;

      const state = useShellStore.getState();
      if (source === 'voice') {
        if (state.eqState !== 'transcribing' && !canAcceptSpeechInput(state.eqState)) {
          return;
        }
      } else if (state.eqState === 'thinking' || state.eqState === 'speaking') {
        return;
      }

      const turnId = ++turnRef.current;
      setHeardCaption(null);
      addTranscript('user', text);
      setEqState('thinking');

      try {
        const res: JarvisChatResponse = await api.jarvisChat(text);
        if (turnId !== turnRef.current) return;

        addTranscript('jarvis', res.reply);
        if (res.openApp) {
          openApp(res.openApp, APP_TITLES[res.openApp] ?? res.openApp);
        }
        setEqState('speaking');
        speakText(res.reply, () => {
          if (turnId !== turnRef.current) return;
          const { voiceSessionActive, micListening } = useShellStore.getState();
          if (voiceSessionActive && micListening) {
            setEqState('listening');
          } else {
            setEqState('idle');
          }
        });
      } catch (err) {
        if (turnId !== turnRef.current) return;
        const msg = `Error: ${(err as Error).message}`;
        addTranscript('jarvis', msg);
        const { voiceSessionActive, micListening } = useShellStore.getState();
        if (voiceSessionActive && micListening) {
          setEqState('listening');
        } else {
          setEqState('idle');
        }
      }
    },
    [addTranscript, openApp, setEqState, setHeardCaption],
  );

  return { sendMessage };
}
