'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Hand, Mic, MicOff } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useVoiceSession } from '@/components/shell/VoiceSessionProvider';
import { useShellStore } from '@/stores/shellStore';

export function Taskbar() {
  const [time, setTime] = useState('');
  const eqState = useShellStore((s) => s.eqState);
  const gestureEnabled = useShellStore((s) => s.gestureEnabled);
  const setGestureEnabled = useShellStore((s) => s.setGestureEnabled);
  const windows = useShellStore((s) => s.windows);
  const focusWindow = useShellStore((s) => s.focusWindow);
  const micListening = useShellStore((s) => s.micListening);
  const { toggleMicListening, supported } = useVoiceSession();
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: api.health });

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <footer className="fixed bottom-0 inset-x-0 h-14 glass-panel border-t border-white/10 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white">
          Bellas<span className="text-accent">OS</span>
        </span>
        <Badge variant={health?.db ? 'success' : 'muted'}>
          {health?.status === 'ok' ? 'online' : '...'}
        </Badge>
        <Badge variant="default">{eqState}</Badge>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto max-w-[50%]">
        {windows.map((w) => (
          <Button
            key={w.id}
            variant="ghost"
            size="sm"
            onClick={() => focusWindow(w.id)}
            className={w.minimized ? 'opacity-50' : ''}
          >
            {w.title}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant={micListening ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleMicListening}
          disabled={!supported || eqState === 'transcribing' || eqState === 'thinking'}
          title={micListening ? 'Stop listening' : 'Start listening'}
        >
          {micListening ? (
            <Mic className="w-4 h-4 mr-1" />
          ) : (
            <MicOff className="w-4 h-4 mr-1" />
          )}
          Voice
        </Button>
        <Button
          variant={gestureEnabled ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setGestureEnabled(!gestureEnabled)}
        >
          <Hand className="w-4 h-4 mr-1" />
          Gestures
        </Button>
        <span className="text-sm text-muted tabular-nums">{time}</span>
      </div>
    </footer>
  );
}
