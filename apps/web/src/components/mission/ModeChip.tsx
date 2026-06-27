'use client';

import { useQueryClient } from '@tanstack/react-query';
import { OPERATING_MODE_SPECS } from '@bellasos/contracts';
import { useShellStore, type OperatingMode } from '@/stores/shellStore';
import { briefingQueryKey, getOperatingModeSpec, todayQueryKey } from '@/lib/operatingMode';
import { queryKeys } from '@/lib/queryKeys';
import { ChevronDown, Lock, Sparkles } from 'lucide-react';
import { useState } from 'react';

const MODES: Array<{ id: OperatingMode; label: string; hint?: string }> = [
  {
    id: 'general',
    label: 'General',
    hint: 'Auto — Jarvis picks the best mode per task',
  },
  { id: 'personal', label: 'Personal' },
  { id: 'business', label: 'Business' },
  { id: 'wealth', label: 'Wealth' },
  { id: 'research', label: 'Research' },
  { id: 'focus', label: 'Focus' },
];

export function ModeChip({ compact }: { compact?: boolean }) {
  const qc = useQueryClient();
  const operatingMode = useShellStore((s) => s.operatingMode);
  const operatingModeManual = useShellStore((s) => s.operatingModeManual);
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const setOperatingMode = useShellStore((s) => s.setOperatingMode);
  const setOperatingModeManual = useShellStore((s) => s.setOperatingModeManual);
  const [open, setOpen] = useState(false);

  const current = MODES.find((m) => m.id === operatingMode) ?? MODES[0]!;
  const currentSpec = getOperatingModeSpec(current.id);
  const autoActive = !operatingModeManual;

  function selectMode(mode: OperatingMode) {
    if (mode === 'general') {
      setOperatingMode('general');
    } else {
      setOperatingModeManual(mode);
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: todayQueryKey(activeWorkspaceId) });
    qc.invalidateQueries({ queryKey: briefingQueryKey(activeWorkspaceId) });
    qc.invalidateQueries({ queryKey: queryKeys.briefing });
  }

  const title = operatingModeManual
    ? `Pinned: ${currentSpec?.jarvisPosture ?? current.label}`
    : autoActive && operatingMode === 'general'
      ? 'Auto — Jarvis adapts mode as needed'
      : `Auto-detected ${current.label} — select General to re-enable auto`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-xs text-white/80 hover:bg-black/50 transition-colors"
        title={title}
      >
        {!compact && <span className="text-white/50">Mode</span>}
        {autoActive && operatingMode === 'general' && (
          <Sparkles className="h-3 w-3 text-accent shrink-0" aria-hidden />
        )}
        {operatingModeManual && (
          <Lock className="h-3 w-3 text-white/50 shrink-0" aria-hidden />
        )}
        <span className="font-medium">{current.label}</span>
        <ChevronDown className="h-3 w-3 text-white/50" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close mode menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[14rem] rounded-lg border border-white/10 bg-panel shadow-lg py-1">
            <p className="px-3 py-1.5 text-[10px] text-white/40 border-b border-white/5">
              General = auto-adapt · others pin until you switch back
            </p>
            {MODES.map((mode) => {
              const spec =
                OPERATING_MODE_SPECS.find((s) => s.mode === mode.id) ??
                getOperatingModeSpec(mode.id);
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => selectMode(mode.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-white/5 ${
                    mode.id === operatingMode ? 'bg-accent/10' : ''
                  }`}
                >
                  <span
                    className={`block text-xs font-medium ${
                      mode.id === operatingMode ? 'text-accent' : 'text-white/90'
                    }`}
                  >
                    {mode.label}
                  </span>
                  {spec && (
                    <span className="block text-[10px] text-white/50 mt-0.5 leading-snug">
                      {mode.id === 'general' ? mode.hint : spec.jarvisPosture}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
