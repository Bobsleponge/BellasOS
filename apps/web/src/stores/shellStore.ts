import { create } from 'zustand';
import type {
  DecisionRecommendation,
  GoalProgressSummary,
  NextAction,
  StrategicInsight,
  WorldIntelligenceSummary,
} from '@/lib/api';
import type { JarvisSessionSummary } from '@/lib/api';

export type OperatingMode = 'general' | 'personal' | 'business' | 'wealth' | 'research' | 'focus';

export interface BriefingInsights {
  goalProgress?: GoalProgressSummary[];
  decisionRecommendations?: DecisionRecommendation[];
  worldPulse?: WorldIntelligenceSummary[];
  strategicInsights?: StrategicInsight[];
  nextActions?: NextAction[];
}

export type EqState =
  | 'idle'
  | 'listening'
  | 'heard'
  | 'transcribing'
  | 'thinking'
  | 'speaking';

export interface ShellWindow {
  id: string;
  title: string;
  appId: string;
  minimized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface JarvisTranscriptLine {
  role: 'user' | 'jarvis';
  text: string;
  suggestedApp?: string;
}

interface ShellState {
  eqState: EqState;
  /** Voice conversation mode is engaged (Jarvis may still think/speak when mic is off). */
  voiceSessionActive: boolean;
  /** Mic is actively capturing user speech. */
  micListening: boolean;
  heardCaption: string | null;
  speechError: string | null;
  gestureEnabled: boolean;
  windows: ShellWindow[];
  focusedWindowId: string | null;
  transcript: JarvisTranscriptLine[];
  /** True from send until reply/error (survives eqState overwrites). */
  jarvisPending: boolean;
  jarvisSessionId: string | null;
  jarvisSessions: JarvisSessionSummary[];
  jarvisHistoryOpen: boolean;
  /** Coding project currently open in Studio — sent with Jarvis refine requests. */
  activeCodingProjectId: string | null;
  /** Active mission workspace — scopes Jarvis and Today. */
  activeWorkspaceId: string | null;
  activeFocusSessionId: string | null;
  operatingMode: OperatingMode;
  /** When true, user pinned mode via chip — Jarvis will not auto-switch. */
  operatingModeManual: boolean;
  lastBriefingInsights: BriefingInsights | null;
  setEqState: (state: EqState) => void;
  setJarvisPending: (pending: boolean) => void;
  setVoiceSessionActive: (active: boolean) => void;
  setMicListening: (listening: boolean) => void;
  setHeardCaption: (caption: string | null) => void;
  setSpeechError: (error: string | null) => void;
  setGestureEnabled: (enabled: boolean) => void;
  openApp: (appId: string, title: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  addTranscript: (role: 'user' | 'jarvis', text: string, meta?: { suggestedApp?: string }) => void;
  setTranscript: (transcript: JarvisTranscriptLine[]) => void;
  setJarvisSessionId: (sessionId: string | null) => void;
  setJarvisSessions: (sessions: JarvisSessionSummary[]) => void;
  setJarvisHistoryOpen: (open: boolean) => void;
  setActiveCodingProjectId: (projectId: string | null) => void;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
  setActiveFocusSessionId: (sessionId: string | null) => void;
  /** User picked a mode on the chip — stays until they pick General (auto) again. */
  setOperatingModeManual: (mode: OperatingMode) => void;
  /** Jarvis auto-detected a better mode — session only unless user pinned. */
  setOperatingModeAuto: (mode: OperatingMode) => void;
  setOperatingMode: (mode: OperatingMode) => void;
  setLastBriefingInsights: (insights: BriefingInsights | null) => void;
}

const SESSION_STORAGE_KEY = 'bellasos:jarvis:sessionId';
const WORKSPACE_STORAGE_KEY = 'bellasos:activeWorkspaceId';
const FOCUS_SESSION_STORAGE_KEY = 'bellasos:activeFocusSessionId';
const MODE_STORAGE_KEY = 'bellasos:operatingMode';
const MODE_MANUAL_KEY = 'bellasos:operatingModeManual';

function readStoredModeManual(): boolean {
  try {
    return localStorage.getItem(MODE_MANUAL_KEY) === '1';
  } catch {
    return false;
  }
}

function persistModeManual(manual: boolean) {
  try {
    if (manual) localStorage.setItem(MODE_MANUAL_KEY, '1');
    else localStorage.removeItem(MODE_MANUAL_KEY);
  } catch {
    /* ignore */
  }
}

function readStoredMode(): OperatingMode {
  if (!readStoredModeManual()) {
    return 'general';
  }
  try {
    const v = localStorage.getItem(MODE_STORAGE_KEY);
    if (
      v === 'general' ||
      v === 'personal' ||
      v === 'business' ||
      v === 'wealth' ||
      v === 'research' ||
      v === 'focus'
    ) {
      return v;
    }
  } catch {
    /* ignore */
  }
  return 'general';
}

function persistMode(mode: OperatingMode) {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function readStoredWorkspaceId(): string | null {
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readStoredFocusSessionId(): string | null {
  try {
    return localStorage.getItem(FOCUS_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistWorkspaceId(workspaceId: string | null) {
  try {
    if (workspaceId) localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    else localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function persistFocusSessionId(sessionId: string | null) {
  try {
    if (sessionId) localStorage.setItem(FOCUS_SESSION_STORAGE_KEY, sessionId);
    else localStorage.removeItem(FOCUS_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

let zCounter = 10;

function defaultJarvisGreeting(): string {
  const hour = new Date().getHours();
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${salutation}. Ask me anything, or pick an application below.`;
}

export function canAcceptSpeechInput(eqState: EqState): boolean {
  return eqState === 'listening';
}

/** Restore persisted shell preferences after mount (avoids SSR hydration mismatch). */
export function hydrateShellFromStorage(): void {
  const current = useShellStore.getState();
  const activeWorkspaceId = readStoredWorkspaceId();
  const activeFocusSessionId = readStoredFocusSessionId();
  const operatingMode = readStoredMode();
  const operatingModeManual = readStoredModeManual();

  if (
    current.activeWorkspaceId === activeWorkspaceId &&
    current.activeFocusSessionId === activeFocusSessionId &&
    current.operatingMode === operatingMode &&
    current.operatingModeManual === operatingModeManual
  ) {
    return;
  }

  useShellStore.setState({
    activeWorkspaceId,
    activeFocusSessionId,
    operatingMode,
    operatingModeManual,
  });
}

export const useShellStore = create<ShellState>((set, get) => ({
  eqState: 'idle',
  voiceSessionActive: false,
  micListening: false,
  heardCaption: null,
  speechError: null,
  gestureEnabled: false,
  windows: [],
  focusedWindowId: null,
  transcript: [{ role: 'jarvis', text: defaultJarvisGreeting() }],
  jarvisPending: false,
  jarvisSessionId: null,
  jarvisSessions: [],
  jarvisHistoryOpen: false,
  activeCodingProjectId: null,
  activeWorkspaceId: null,
  activeFocusSessionId: null,
  operatingMode: 'general',
  operatingModeManual: false,
  lastBriefingInsights: null,
  setEqState: (eqState) => set({ eqState }),
  setJarvisPending: (jarvisPending) => set({ jarvisPending }),
  setVoiceSessionActive: (voiceSessionActive) => set({ voiceSessionActive }),
  setMicListening: (micListening) => set({ micListening }),
  setHeardCaption: (heardCaption) => set({ heardCaption }),
  setSpeechError: (speechError) => set({ speechError }),
  setGestureEnabled: (gestureEnabled) => set({ gestureEnabled }),
  openApp: (appId, title) => {
    const existing = get().windows.find((w) => w.appId === appId && !w.minimized);
    if (existing) {
      zCounter += 1;
      set({
        focusedWindowId: existing.id,
        windows: get().windows.map((w) =>
          w.id === existing.id ? { ...w, zIndex: zCounter, minimized: false } : w,
        ),
      });
      return;
    }
    zCounter += 1;
    const offset = get().windows.length * 28;
    const win: ShellWindow = {
      id: crypto.randomUUID(),
      title,
      appId,
      minimized: false,
      zIndex: zCounter,
      x: 120 + offset,
      y: 80 + offset,
      width: 920,
      height: 640,
    };
    set({ windows: [...get().windows, win], focusedWindowId: win.id });
  },
  closeWindow: (id) =>
    set({
      windows: get().windows.filter((w) => w.id !== id),
      focusedWindowId: get().focusedWindowId === id ? null : get().focusedWindowId,
    }),
  focusWindow: (id) => {
    zCounter += 1;
    set({
      focusedWindowId: id,
      windows: get().windows.map((w) =>
        w.id === id ? { ...w, zIndex: zCounter, minimized: false } : w,
      ),
    });
  },
  toggleMinimize: (id) =>
    set({
      windows: get().windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized } : w,
      ),
    }),
  moveWindow: (id, x, y) =>
    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    }),
  addTranscript: (role, text, meta) =>
    set({
      transcript: [...get().transcript, { role, text, ...(meta?.suggestedApp ? { suggestedApp: meta.suggestedApp } : {}) }],
    }),
  setTranscript: (transcript) => set({ transcript }),
  setJarvisSessionId: (jarvisSessionId) => set({ jarvisSessionId }),
  setJarvisSessions: (jarvisSessions) => set({ jarvisSessions }),
  setJarvisHistoryOpen: (jarvisHistoryOpen) => set({ jarvisHistoryOpen }),
  setActiveCodingProjectId: (activeCodingProjectId) => set({ activeCodingProjectId }),
  setActiveWorkspaceId: (activeWorkspaceId) => {
    if (get().activeWorkspaceId === activeWorkspaceId) return;
    persistWorkspaceId(activeWorkspaceId);
    set({ activeWorkspaceId });
  },
  setActiveFocusSessionId: (activeFocusSessionId) => {
    if (get().activeFocusSessionId === activeFocusSessionId) return;
    persistFocusSessionId(activeFocusSessionId);
    set({ activeFocusSessionId });
  },
  setOperatingModeManual: (operatingMode) => {
    persistModeManual(true);
    persistMode(operatingMode);
    set({ operatingMode, operatingModeManual: true });
  },
  setOperatingModeAuto: (operatingMode) => {
    if (get().operatingModeManual) return;
    if (get().operatingMode === operatingMode) return;
    set({ operatingMode });
  },
  setOperatingMode: (operatingMode) => {
    if (operatingMode === 'general') {
      persistModeManual(false);
      set({ operatingMode: 'general', operatingModeManual: false });
      return;
    }
    get().setOperatingModeManual(operatingMode);
  },
  setLastBriefingInsights: (lastBriefingInsights) => set({ lastBriefingInsights }),
}));
