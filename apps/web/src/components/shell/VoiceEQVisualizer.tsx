'use client';

import { useEffect, useRef } from 'react';
import { useIdlePulse, useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { useShellStore, type EqState } from '@/stores/shellStore';

const PARTICLE_COUNT = 720;
const BAND_COUNT = 48;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

interface Particle {
  angle: number;
  radius: number;
  size: number;
  phase: number;
}

/** Even spacing around a single shell — no random overlap clusters. */
function initParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = i * GOLDEN_ANGLE;
    const t = i / (PARTICLE_COUNT - 1);
    return {
      angle,
      radius: 0.82 + (t - 0.5) * 0.06,
      size: 0.9 + (i % 3) * 0.15,
      phase: angle * 1.7,
    };
  });
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function avgLevel(levels: number[]) {
  if (levels.length === 0) return 0;
  let sum = 0;
  for (const v of levels) sum += v;
  return sum / levels.length;
}

function statePalette(state: EqState, t: number): [number, number, number] {
  switch (state) {
    case 'listening':
      return [56, 189, 248];
    case 'heard':
    case 'transcribing':
      return [129, 140, 248];
    case 'thinking':
      return [
        lerp(56, 167, Math.sin(t * 1.2) * 0.5 + 0.5),
        lerp(189, 139, Math.sin(t * 1.2) * 0.5 + 0.5),
        lerp(248, 250, Math.sin(t * 1.2) * 0.5 + 0.5),
      ];
    case 'speaking':
      return [34, 211, 238];
    default:
      return [56, 189, 248];
  }
}

/** Single-shell particle orb — every dot moves together, no per-band scatter. */
export function VoiceEQVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(initParticles());
  const eqStateRef = useRef<EqState>('idle');
  const jarvisPendingRef = useRef(false);
  const micLiveRef = useRef(false);
  const levelsRef = useRef<number[]>(new Array(BAND_COUNT).fill(0));
  const idlePhaseRef = useRef(0);
  const smoothEnergyRef = useRef(0);

  const eqState = useShellStore((s) => s.eqState);
  const jarvisPending = useShellStore((s) => s.jarvisPending);
  const micListening = useShellStore((s) => s.micListening);
  const micLive = micListening && eqState === 'listening';
  const levels = useAudioAnalyser(micLive);
  const idlePhase = useIdlePulse(eqState !== 'idle' && eqState !== 'listening');

  eqStateRef.current = eqState;
  jarvisPendingRef.current = jarvisPending;
  micLiveRef.current = micLive;
  levelsRef.current = levels;
  idlePhaseRef.current = idlePhase;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.48;
      const t = performance.now() / 1000;
      const state = eqStateRef.current;
      const pending = jarvisPendingRef.current;
      const lv = levelsRef.current;
      const idle = idlePhaseRef.current;
      const [cr, cg, cb] = statePalette(state, t);

      const targetEnergy = micLiveRef.current ? avgLevel(lv) : 0;
      smoothEnergyRef.current = lerp(smoothEnergyRef.current, targetEnergy, 0.18);
      const energy = smoothEnergyRef.current;

      let globalPulse = 0;
      let globalAlpha = 0.14;
      let spin = 0.012;

      if (micLiveRef.current) {
        globalPulse = energy * 0.14;
        globalAlpha = 0.22 + energy * 0.55;
        spin = 0.02 + energy * 0.04;
      } else if (state === 'heard' || state === 'transcribing') {
        globalPulse = Math.sin(t * 3.5) * 0.05 + 0.04;
        globalAlpha = 0.34 + Math.sin(t * 4) * 0.12;
        spin = 0.035;
      } else if (state === 'thinking' || pending) {
        globalPulse = Math.sin(t * 2.2) * 0.045;
        globalAlpha = 0.28 + Math.sin(t * 2.8) * 0.1;
        spin = 0.028;
      } else if (state === 'speaking') {
        globalPulse = Math.sin(t * 5.5) * 0.07 + 0.05;
        globalAlpha = 0.32 + Math.sin(t * 5.5) * 0.18;
        spin = 0.04;
      } else {
        globalPulse = Math.sin(idle + t * 0.6) * 0.018;
        globalAlpha = 0.1 + Math.sin(idle * 0.7) * 0.06;
        spin = 0.008;
      }

      for (const p of particlesRef.current) {
        const ripple = Math.sin(p.angle * 5 + t * 4) * 0.012 * (0.35 + energy);
        const r = (p.radius + globalPulse + ripple) * baseRadius;
        const theta = p.angle + t * spin;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;

        const twinkle = 0.85 + Math.sin(t * 1.4 + p.phase) * 0.15;
        const alpha = Math.min(0.92, globalAlpha * twinkle);

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="particle-field relative w-[min(92vw,680px)] h-[min(92vw,680px)] mx-auto pointer-events-none select-none"
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
