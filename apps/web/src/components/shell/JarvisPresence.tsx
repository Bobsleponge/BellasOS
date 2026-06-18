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
  processing: 'Processing speech…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

export function JarvisPresence() {
  const transcript = useShellStore((s) => s.transcript);
  const eqState = useShellStore((s) => s.eqState);
  const {
    voiceSessionActive,
    listening,
    processing,
    supported,
    speechError,
    mode,
    toggleVoiceSession,
  } = useVoiceSession();
  const { sendMessage } = useJarvisSession();
  const [text, setText] = useState('');

  const submitText = () => {
    if (!text.trim() || eqState === 'thinking') return;
    sendMessage(text);
    setText('');
  };

  const lastLines = transcript.slice(-4);
  const statusText = voiceSessionActive
    ? STATUS_LABEL[eqState] ?? 'Voice on'
    : 'Click mic to start voice';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto px-4">
      <div className="flex items-center gap-2">
        <Badge variant={voiceSessionActive ? 'success' : 'muted'}>{statusText}</Badge>
        {listening && voiceSessionActive && !processing && (
          <span className="text-xs text-accent animate-pulse">Mic live</span>
        )}
        {processing && (
          <span className="text-xs text-amber-300 animate-pulse">Transcribing…</span>
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
          variant={voiceSessionActive ? 'default' : 'glass'}
          size="icon"
          onClick={toggleVoiceSession}
          disabled={!supported || eqState === 'thinking' || eqState === 'processing'}
          title={
            voiceSessionActive
              ? 'Stop voice session'
              : 'Start voice session (listens until you stop)'
          }
          aria-pressed={voiceSessionActive}
          className={voiceSessionActive ? 'ring-2 ring-accent' : ''}
        >
          {voiceSessionActive ? (
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
          disabled={eqState === 'thinking' || !text.trim()}
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
      {voiceSessionActive && (
        <p className="text-xs text-muted">
          Speak a full sentence, then pause ~2 seconds. Mode: {mode === 'browser' ? 'browser speech' : 'local Whisper'}.
        </p>
      )}
    </div>
  );
}
