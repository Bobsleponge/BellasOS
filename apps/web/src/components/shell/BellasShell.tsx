'use client';

import { AnimatePresence } from 'framer-motion';
import { useShellStore } from '@/stores/shellStore';
import { AppWindow } from './AppWindow';
import { Desktop } from './Desktop';
import { GestureLayer } from './GestureLayer';
import { JarvisPresence } from './JarvisPresence';
import { Taskbar } from './Taskbar';
import { VoiceEQVisualizer } from './VoiceEQVisualizer';
import { VoiceSessionProvider } from './VoiceSessionProvider';

export function BellasShell() {
  const windows = useShellStore((s) => s.windows);

  return (
    <VoiceSessionProvider>
      <div className="shell-bg min-h-screen w-full overflow-hidden font-sans text-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.08)_0%,_transparent_55%)] pointer-events-none" />
        <Desktop />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pb-20 pt-16 px-4 gap-8 pointer-events-none">
          <div className="pointer-events-auto w-full">
            <VoiceEQVisualizer />
          </div>
          <div className="pointer-events-auto w-full">
            <JarvisPresence />
          </div>
        </div>

        <AnimatePresence>
          {windows.map((w) => (
            <AppWindow key={w.id} win={w} />
          ))}
        </AnimatePresence>

        <Taskbar />
        <GestureLayer />
      </div>
    </VoiceSessionProvider>
  );
}
