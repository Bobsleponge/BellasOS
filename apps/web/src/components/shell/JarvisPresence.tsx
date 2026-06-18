'use client';

import { useState } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useJarvisSession } from '@/hooks/useJarvisSession';
import { useVoiceSession } from '@/components/shell/VoiceSessionProvider';
import { useShellStore } from '@/stores/shellStore';

const STATUS_LABEL: Record<string, string> = {
  idle: 'Voice off',
  listening: 'Listening…',
  heard: 'Heard you',
  transcribing: 'Transcribing…',
  thinking: 'Jarvis is thinking…',
  speaking: 'Jarvis is speaking…',
};

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'muted'> = {
  idle: 'muted',
  listening: 'success',
  heard: 'default',
  transcribing: 'default',
  thinking: 'default',
  speaking: 'default',
};

export function JarvisPresence() {
  const transcript = useShellStore((s) => s.transcript);
  const eqState = useShellStore((s) => s.eqState);
  const heardCaption = useShellStore((s) => s.heardCaption);
  const {
    micListening,
    listening,
    processing,
    supported,
    speechError,
    mode,
    toggleMicListening,
  } = useVoiceSession();
  const { sendMessage } = useJarvisSession();
  const [text, setText] = useState('');

  const submitText = () => {
    if (!text.trim() || eqState === 'thinking' || eqState === 'speaking') return;
    sendMessage(text);
    setText('');
  };

  const lastLines = transcript.slice(-4);
  const statusText = micListening
    ? STATUS_LABEL[eqState] ?? 'Voice on'
    : eqState === 'thinking' || eqState === 'speaking' || eqState === 'transcribing'
      ? STATUS_LABEL[eqState] ?? eqState
      : 'Mic off — click to talk';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto px-4">
      <div className="flex flex-col items-center gap-1">
        <Badge variant={STATUS_VARIANT[eqState] ?? 'muted'}>{statusText}</Badge>
        {micListening && listening && !processing && eqState === 'listening' && (
          <span className="text-xs text-accent animate-pulse">Mic live — speak now</span>
        )}
        {heardCaption && (
          <span className="text-xs text-amber-200">{heardCaption}</span>
        )}
        {eqState === 'transcribing' && (
          <span className="text-xs text-amber-300 animate-pulse">Transcribing your speech…</span>
        )}
        {eqState === 'thinking' && (
          <span className="text-xs text-sky-300 animate-pulse">Jarvis is thinking…</span>
        )}
        {eqState === 'speaking' && (
          <span className="text-xs text-violet-300">Jarvis is speaking — mic paused</span>
        )}
      </div>

      <div className="w-full min-h-[4rem] text-center space-y-1">
        {lastLines.map((line, i) => (
          <p
            key={i}
            className={
              line.role === 'user'
                ? 'text-white/90 text-sm'
                : 'text-accent2 text-sm'
            }
          >
            {line.role === 'user' ? `You: ${line.text}` : line.text}
          </p>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={micListening ? 'default' : 'glass'}
          size="icon"
          onClick={toggleMicListening}
          disabled={!supported || eqState === 'transcribing' || eqState === 'thinking'}
          title={
            micListening
              ? 'Stop listening (Jarvis keeps responding if busy)'
              : 'Start listening'
          }
          aria-pressed={micListening}
          className={micListening ? 'ring-2 ring-accent' : ''}
        >
          {micListening ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </Button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitText()}
          placeholder="Or type to Jarvis..."
          className="flex-1 min-w-[12rem] max-w-md bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent/50"
        />
        <Button
          onClick={submitText}
          disabled={eqState === 'thinking' || eqState === 'speaking' || !text.trim()}
          size="icon"
          variant="default"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {!supported && (
        <p className="text-xs text-muted">
          Voice capture is not supported in this browser — use Chrome or Edge, or type instead.
        </p>
      )}
      {speechError && (
        <p className="text-xs text-red-400 max-w-md text-center">{speechError}</p>
      )}
      {micListening && (
        <p className="text-xs text-muted">
          Speak naturally, then pause ~1 second. Mode: local Whisper ({mode}).
        </p>
      )}
    </div>
  );
}
