'use client';

import { useCallback, useRef, useState } from 'react';

type SpeechErrorEvent = Event & { error?: string };

type SpeechCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (e: {
    resultIndex: number;
    results: Array<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void;
  onerror: (e: SpeechErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognition(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function mapSpeechError(code: string | undefined): string | null {
  switch (code) {
    case 'not-allowed':
      return 'Microphone access denied. Allow mic permission in your browser.';
    case 'service-not-allowed':
      return 'Speech recognition blocked. Try Chrome or Edge on localhost.';
    case 'network':
      return 'Speech recognition needs a network connection in this browser.';
    case 'no-speech':
    case 'aborted':
      return null;
    default:
      return code ? `Speech error: ${code}` : null;
  }
}

export interface SpeechInputOptions {
  /** Keep listening across utterances (voice session mode). */
  sessionActive?: boolean;
}

export function useSpeechInput(
  onFinal: (text: string) => void,
  options?: SpeechInputOptions,
) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<InstanceType<SpeechCtor> | null>(null);
  const onFinalRef = useRef(onFinal);
  const sessionActiveRef = useRef(options?.sessionActive ?? false);
  const restartTimerRef = useRef<number | null>(null);
  onFinalRef.current = onFinal;
  sessionActiveRef.current = options?.sessionActive ?? false;

  const stop = useCallback(() => {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) {
      setListening(false);
      return;
    }
    try {
      rec.abort();
    } catch {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    stop();

    try {
      const rec = new SR();
      rec.lang = 'en-US';
      rec.continuous = sessionActiveRef.current;
      rec.interimResults = false;
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (result?.isFinal) {
            const text = result[0]?.transcript?.trim();
            if (text) onFinalRef.current(text);
          }
        }
      };
      rec.onerror = (e) => {
        const msg = mapSpeechError(e.error);
        if (msg) setError(msg);
        setListening(false);
        recRef.current = null;
      };
      rec.onend = () => {
        setListening(false);
        if (recRef.current === rec) recRef.current = null;
        if (sessionActiveRef.current) {
          restartTimerRef.current = window.setTimeout(() => {
            restartTimerRef.current = null;
            if (sessionActiveRef.current) start();
          }, 120);
        }
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Could not start speech recognition.');
      setListening(false);
      recRef.current = null;
    }
  }, [stop]);

  const supported = typeof window !== 'undefined' && Boolean(getSpeechRecognition());

  return {
    listening,
    start,
    stop,
    supported,
    error,
    clearError: () => setError(null),
  };
}

export function speakText(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}
