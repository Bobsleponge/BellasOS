'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Hand } from 'lucide-react';
import { DEVELOPER_MODE_ROUTE } from '@/lib/applications';
import { enableDeveloperMode } from '@/lib/devMode';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useShellStore } from '@/stores/shellStore';

function connectionLabel(
  health: Awaited<ReturnType<typeof api.health>> | undefined,
): { label: string; variant: 'success' | 'muted' | 'default' } {
  if (!health || health.status !== 'ok') {
    return { label: 'Offline', variant: 'muted' };
  }
  const degraded = health.modules.filter(
    (m) => m.status !== 'enabled' && m.status !== 'started',
  ).length;
  if (degraded > 0) {
    return { label: 'Connected · attention needed', variant: 'default' };
  }
  return { label: health.db ? 'Connected' : 'Connected · in-memory', variant: 'success' };
}

export function Taskbar() {
  const router = useRouter();
  const [time, setTime] = useState('');
  const logoClicks = useRef(0);
  const logoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureEnabled = useShellStore((s) => s.gestureEnabled);
  const setGestureEnabled = useShellStore((s) => s.setGestureEnabled);
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

  const connection = connectionLabel(health);

  function onLogoClick() {
    logoClicks.current += 1;
    if (logoTimer.current) clearTimeout(logoTimer.current);
    logoTimer.current = setTimeout(() => {
      logoClicks.current = 0;
    }, 600);
    if (logoClicks.current >= 3) {
      logoClicks.current = 0;
      enableDeveloperMode();
      router.push(DEVELOPER_MODE_ROUTE);
    }
  }

  return (
    <footer className="fixed bottom-0 inset-x-0 h-14 glass-panel border-t border-white/10 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onLogoClick}
          className="text-sm font-semibold text-white hover:text-accent transition-colors"
          title="Triple-click for Developer Mode"
        >
          Bellas<span className="text-accent">OS</span>
        </button>
        <Badge variant={connection.variant}>{connection.label}</Badge>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant={gestureEnabled ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setGestureEnabled(!gestureEnabled)}
        >
          <Hand className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Gestures</span>
        </Button>
        <span className="text-sm text-muted tabular-nums">{time}</span>
      </div>
    </footer>
  );
}
