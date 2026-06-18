'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Hand, Mic, MicOff, Terminal } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useVoiceSession } from '@/components/shell/VoiceSessionProvider';
import { useShellStore } from '@/stores/shellStore';

export function Taskbar() {
  const [time, setTime] = useState('');
  const eqState = useShellStore((s) => s.eqState);
  const gestureEnabled = useShellStore((s) => s.gestureEnabled);
  const setGestureEnabled = useShellStore((s) => s.setGestureEnabled);
  const micListening = useShellStore((s) => s.micListening);
  const { toggleMicListening, supported } = useVoiceSession();
  const { data: health } = useQuery({ queryKey: queryKeys.health, queryFn: api.health });

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  const dbOk = health?.db;
  const degradedModules =
    health?.modules.filter((m) => m.status !== 'enabled' && m.status !== 'started') ?? [];

  return (
    <footer className="fixed bottom-0 inset-x-0 h-14 glass-panel border-t border-white/10 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white">
          Bellas<span className="text-accent">OS</span>
        </span>
        <Link href="/console?view=overview">
          <Badge variant={health?.status === 'ok' ? (dbOk ? 'success' : 'muted') : 'muted'}>
            {health?.status === 'ok' ? (dbOk ? 'online' : 'in-memory') : '...'}
          </Badge>
        </Link>
        {degradedModules.length > 0 && (
          <Link href="/console?view=overview">
            <Badge variant="muted">{degradedModules.length} module issue(s)</Badge>
          </Link>
        )}
        <Badge variant="default">{eqState}</Badge>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/console?view=overview">
          <Button variant="ghost" size="sm">
            <Terminal className="w-4 h-4 mr-1" />
            Console
          </Button>
        </Link>
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
