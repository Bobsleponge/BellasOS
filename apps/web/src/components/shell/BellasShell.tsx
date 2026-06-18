'use client';

import { Desktop } from './Desktop';
import { GestureLayer } from './GestureLayer';
import { JarvisProcessingBanner } from './JarvisProcessingBanner';
import { JarvisPresence } from './JarvisPresence';
import { DataIntelPanel } from './DataIntelPanel';
import { Taskbar } from './Taskbar';
import { VoiceEQVisualizer } from './VoiceEQVisualizer';
import { VoiceSessionProvider } from './VoiceSessionProvider';

export function BellasShell() {
  return (
    <VoiceSessionProvider>
      <div className="shell-bg min-h-screen w-full overflow-hidden font-sans text-white relative flex flex-col">
        <JarvisProcessingBanner />
        <Desktop />

        {/* Particle orb — upper zone, text-free */}
        <div className="relative z-0 flex-shrink-0 flex items-center justify-center pt-20 pb-2 pointer-events-none">
          <VoiceEQVisualizer />
        </div>

        {/* All controls & text below the orb */}
        <div className="relative z-10 flex-1 flex flex-col items-center px-4 pb-24 pt-4 gap-5 pointer-events-none min-h-0">
          <div className="pointer-events-auto w-full max-w-2xl">
            <JarvisPresence />
          </div>
          <div className="pointer-events-auto w-full max-w-2xl">
            <DataIntelPanel />
          </div>
        </div>

        <Taskbar />
        <GestureLayer />
      </div>
    </VoiceSessionProvider>
  );
}
