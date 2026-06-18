import { create } from 'zustand';

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
  transcript: Array<{ role: 'user' | 'jarvis'; text: string }>;
  setEqState: (state: EqState) => void;
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
  addTranscript: (role: 'user' | 'jarvis', text: string) => void;
}

let zCounter = 10;

export function canAcceptSpeechInput(eqState: EqState): boolean {
  return eqState === 'listening';
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
  transcript: [{ role: 'jarvis', text: 'BellasOS online. Click the mic to start voice.' }],
  setEqState: (eqState) => set({ eqState }),
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
  addTranscript: (role, text) =>
    set({ transcript: [...get().transcript, { role, text }] }),
}));
