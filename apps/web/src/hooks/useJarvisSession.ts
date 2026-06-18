'use client';

import { useCallback } from 'react';
import { api, type JarvisChatResponse } from '@/lib/api';
import { useShellStore } from '@/stores/shellStore';
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
  const addTranscript = useShellStore((s) => s.addTranscript);
  const openApp = useShellStore((s) => s.openApp);

  const sendMessage = useCallback(
    async (message: string) => {
      const text = message.trim();
      if (!text) return;
      addTranscript('user', text);
      setEqState('thinking');
      try {
        const res: JarvisChatResponse = await api.jarvisChat(text);
        addTranscript('jarvis', res.reply);
        if (res.openApp) {
          openApp(res.openApp, APP_TITLES[res.openApp] ?? res.openApp);
        }
        setEqState('speaking');
        speakText(res.reply, () => {
          const voiceOn = useShellStore.getState().voiceSessionActive;
          setEqState(voiceOn ? 'listening' : 'idle');
        });
      } catch (err) {
        const msg = `Error: ${(err as Error).message}`;
        addTranscript('jarvis', msg);
        const voiceOn = useShellStore.getState().voiceSessionActive;
        setEqState(voiceOn ? 'listening' : 'idle');
      }
    },
    [addTranscript, openApp, setEqState],
  );

  return { sendMessage };
}
