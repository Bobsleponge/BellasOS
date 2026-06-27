'use client';

import { ExecutiveHome } from '@/components/home/ExecutiveHome';
import { HomeHeader, HeroGreeting } from '@/components/home/HomeHeader';
import { useWorkspaceBootstrap } from '@/hooks/useWorkspaceBootstrap';
import { AudioMotionVisualizer } from './AudioMotionVisualizer';
import { GestureLayer } from './GestureLayer';
import { JarvisProcessingBanner } from './JarvisProcessingBanner';
import { JarvisPresence } from './JarvisPresence';
import { ShellParticles } from './ShellParticles';
import { Taskbar } from './Taskbar';
import { VoiceSessionProvider } from './VoiceSessionProvider';

export function BellasShell() {
  useWorkspaceBootstrap();

  return (
    <VoiceSessionProvider>
      <div className="shell-bg relative flex min-h-screen w-full flex-col overflow-hidden font-sans text-white">
        <ShellParticles />
        <JarvisProcessingBanner />

        <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto pb-24 pt-4 px-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:gap-8">
            <HomeHeader />

            <section
              aria-label="Jarvis"
              className="relative flex flex-col items-center gap-2 py-2 sm:py-4"
            >
              <HeroGreeting />
              <AudioMotionVisualizer />
              <div className="pointer-events-auto -mt-6 w-full max-w-xl sm:-mt-8">
                <JarvisPresence compact />
              </div>
            </section>

            <ExecutiveHome />
          </div>
        </main>

        <Taskbar />
        <GestureLayer />
      </div>
    </VoiceSessionProvider>
  );
}
