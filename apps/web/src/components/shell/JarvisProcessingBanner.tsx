'use client';

import { Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestProgress } from '@/components/RequestProgress';
import { useVoiceSession } from '@/components/shell/VoiceSessionProvider';
import { useShellStore, type EqState } from '@/stores/shellStore';

const BANNER: Partial<Record<EqState, string>> = {
  heard: 'Processing what you said…',
  transcribing: 'Transcribing your speech…',
  thinking: 'Jarvis is working on your question…',
  speaking: 'Jarvis is speaking…',
};

export function JarvisProcessingBanner() {
  const eqState = useShellStore((s) => s.eqState);
  const jarvisPending = useShellStore((s) => s.jarvisPending);
  const { stopJarvis, canStopJarvis } = useVoiceSession();
  const label = BANNER[eqState];

  if (!canStopJarvis && !label && !jarvisPending) return null;
  if (eqState === 'idle' || eqState === 'listening') {
    if (!jarvisPending) return null;
  }

  const showSpinner = eqState === 'thinking' || eqState === 'transcribing' || jarvisPending;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-3 border-b border-cyan-400/20 bg-black/40 px-4 py-2.5 backdrop-blur-xl"
    >
      {showSpinner && (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-sky-300" aria-hidden />
      )}
      <span className="text-sm font-semibold text-white sm:text-base">
        {label ?? 'Jarvis is processing…'}
      </span>
      {(eqState === 'thinking' || jarvisPending) && <RequestProgress active />}
      {canStopJarvis && (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={stopJarvis}
          className="ml-2 shrink-0 gap-1.5"
          title="Stop Jarvis — use if it misheard you"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          Stop
        </Button>
      )}
    </div>
  );
}
