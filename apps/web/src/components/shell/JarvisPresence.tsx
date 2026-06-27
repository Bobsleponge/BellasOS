'use client';

import { useState } from 'react';
import { ChevronDown, Mic, MicOff, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useJarvisBootstrap, useJarvisSession } from '@/hooks/useJarvisSession';
import { useVoiceSession } from '@/components/shell/VoiceSessionProvider';
import { JarvisHistoryPanel } from '@/components/shell/JarvisHistoryPanel';
import { useShellStore, type EqState } from '@/stores/shellStore';
import { VOICE_CANCEL_HINT } from '@/lib/voiceCancel';
import { cn } from '@/lib/utils';
import { JarvisSuggestedAppButton } from '@/components/shell/JarvisSuggestedAppButton';

const STATUS_LABEL: Record<EqState, string> = {
  idle: 'Standby',
  listening: 'Listening',
  heard: 'Heard',
  transcribing: 'Transcribing',
  thinking: 'Thinking',
  speaking: 'Speaking',
};

const STATUS_VARIANT: Record<EqState, 'default' | 'success' | 'muted'> = {
  idle: 'muted',
  listening: 'success',
  heard: 'default',
  transcribing: 'default',
  thinking: 'default',
  speaking: 'default',
};

function isBusyState(state: EqState): boolean {
  return state === 'thinking' || state === 'transcribing' || state === 'speaking';
}

export function JarvisPresence({ compact = false }: { compact?: boolean }) {
  useJarvisBootstrap();

  const transcript = useShellStore((s) => s.transcript);
  const eqState = useShellStore((s) => s.eqState);
  const jarvisPending = useShellStore((s) => s.jarvisPending);
  const heardCaption = useShellStore((s) => s.heardCaption);
  const {
    micListening,
    listening,
    processing,
    supported,
    speechError,
    mode,
    toggleMicListening,
    stopJarvis,
    canStopJarvis,
  } = useVoiceSession();
  const { sendMessage } = useJarvisSession();
  const [text, setText] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const busy = isBusyState(eqState) || jarvisPending;

  const submitText = () => {
    if (!text.trim() || busy) return;
    sendMessage(text);
    setText('');
  };

  const lastLines = transcript.slice(compact ? -2 : -4);
  const statusText = micListening
    ? STATUS_LABEL[eqState] ?? 'Active'
    : 'Mic off';

  return (
    <div
      className={cn(
        'flex flex-col items-center w-full mx-auto px-2',
        compact ? 'gap-3 max-w-lg' : 'gap-4 max-w-2xl',
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge
          variant={STATUS_VARIANT[eqState] ?? 'muted'}
          className="backdrop-blur-md bg-black/30 border-cyan-500/25 text-[10px] uppercase tracking-wider"
        >
          {statusText}
        </Badge>
        {micListening && listening && !processing && eqState === 'listening' && (
          <span className="text-[10px] text-accent animate-pulse">Live</span>
        )}
        {heardCaption && (
          <span className="text-[10px] text-amber-200 max-w-[14rem] truncate">{heardCaption}</span>
        )}
      </div>

      {!compact && <JarvisHistoryPanel />}

      {compact && (
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70"
        >
          Conversation
          <ChevronDown className={cn('h-3 w-3 transition-transform', showHistory && 'rotate-180')} />
        </button>
      )}
      {compact && showHistory && <JarvisHistoryPanel />}

      {lastLines.length > 0 && (
        <div className="w-full min-h-[2.5rem] text-center space-y-0.5 rounded-xl border border-white/5 bg-black/25 px-3 py-2">
          {lastLines.map((line, i) => (
            <div key={i} className="space-y-1">
              <p
                className={cn(
                  'text-xs line-clamp-4',
                  line.role === 'user' ? 'text-white/85' : 'text-accent2',
                )}
              >
                {line.role === 'user' ? `You: ${line.text}` : line.text}
              </p>
              {line.role === 'jarvis' && line.suggestedApp ? (
                <div className="flex justify-center">
                  <JarvisSuggestedAppButton appId={line.suggestedApp} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 w-full">
        <Button
          variant={micListening ? 'default' : 'glass'}
          size="icon"
          onClick={toggleMicListening}
          disabled={!supported || (busy && !canStopJarvis)}
          title={micListening ? 'Stop listening' : 'Start listening'}
          aria-pressed={micListening}
          className={cn('shrink-0', micListening && 'ring-2 ring-accent/60')}
        >
          {micListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
        {canStopJarvis && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={stopJarvis}
            title="Stop Jarvis"
            className="shrink-0"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </Button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitText()}
          placeholder="Message Jarvis…"
          disabled={busy}
          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent/40 disabled:opacity-60"
        />
        <Button
          onClick={submitText}
          disabled={busy || !text.trim()}
          size="icon"
          variant="default"
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {!supported && (
        <p className="text-[10px] text-muted text-center">Voice unavailable — type instead.</p>
      )}
      {speechError && (
        <p className="text-[10px] text-red-400 max-w-md text-center">{speechError}</p>
      )}
      {micListening && !compact && (
        <p className="text-[10px] text-muted text-center">
          Pause ~1s after speaking. {VOICE_CANCEL_HINT} ({mode})
        </p>
      )}
    </div>
  );
}
