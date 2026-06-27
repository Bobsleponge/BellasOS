import type { QueryClient } from '@tanstack/react-query';
import { OPERATING_MODE_SPECS } from '@bellasos/contracts';
import { applicationFromPathname } from '@/lib/jarvisRhythm';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore, type OperatingMode } from '@/stores/shellStore';

export function getOperatingMode(): OperatingMode {
  return useShellStore.getState().operatingMode;
}

export function isOperatingModeManual(): boolean {
  return useShellStore.getState().operatingModeManual;
}

export function getOperatingModeSpec(mode: OperatingMode = getOperatingMode()) {
  return OPERATING_MODE_SPECS.find((s) => s.mode === mode);
}

/** Params sent to Today / briefing APIs. */
export function operatingContextParams(options?: {
  workspaceId?: string | null;
  pathname?: string;
  search?: string;
}) {
  const workspaceId =
    options?.workspaceId ?? useShellStore.getState().activeWorkspaceId ?? undefined;
  const application =
    options?.pathname != null
      ? applicationFromPathname(options.pathname, options.search ?? '')
      : undefined;

  return {
    mode: getOperatingMode(),
    workspaceId: workspaceId ?? undefined,
    application,
  };
}

export function todayQueryKey(workspaceId?: string | null) {
  return [...queryKeys.today, workspaceId ?? '', getOperatingMode()] as const;
}

export function briefingQueryKey(workspaceId?: string | null) {
  return [
    ...queryKeys.briefing,
    'bootstrap',
    workspaceId ?? '',
    getOperatingMode(),
  ] as const;
}

/** Apply auto-detected mode from Jarvis — skipped when user pinned a mode manually. */
export function applyJarvisModeSwitch(
  qc: QueryClient,
  mode: OperatingMode,
): boolean {
  if (useShellStore.getState().operatingModeManual) return false;

  const prev = getOperatingMode();
  if (prev === mode) return false;

  useShellStore.getState().setOperatingModeAuto(mode);
  const ws = useShellStore.getState().activeWorkspaceId;
  void qc.invalidateQueries({ queryKey: todayQueryKey(ws) });
  void qc.invalidateQueries({ queryKey: briefingQueryKey(ws) });
  void qc.invalidateQueries({ queryKey: queryKeys.briefing });

  return true;
}

export function isOperatingMode(value: string): value is OperatingMode {
  return (
    value === 'general' ||
    value === 'personal' ||
    value === 'business' ||
    value === 'wealth' ||
    value === 'research' ||
    value === 'focus'
  );
}
