'use client';

import { useCallback, useMemo } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions } from '@tsparticles/engine';

function ShellParticlesInner() {
  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: { value: 'transparent' } },
      fpsLimit: 60,
      detectRetina: true,
      particles: {
        number: { value: 55, density: { enable: true, width: 1200, height: 800 } },
        color: { value: ['#38bdf8', '#22d3ee', '#6366f1'] },
        opacity: { value: { min: 0.08, max: 0.35 } },
        size: { value: { min: 0.6, max: 2.2 } },
        move: {
          enable: true,
          speed: 0.35,
          direction: 'none',
          random: true,
          outModes: { default: 'out' },
        },
        links: {
          enable: true,
          distance: 140,
          opacity: 0.12,
          width: 0.8,
          color: '#38bdf8',
        },
      },
      interactivity: {
        detectsOn: 'canvas',
        events: {
          onHover: { enable: true, mode: 'grab' },
          resize: { enable: true },
        },
        modes: {
          grab: { distance: 120, links: { opacity: 0.25 } },
        },
      },
    }),
    [],
  );

  return (
    <Particles
      id="shell-particles"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      options={options}
    />
  );
}

export function ShellParticles() {
  const init = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <ParticlesProvider init={init}>
      <ShellParticlesInner />
    </ParticlesProvider>
  );
}
