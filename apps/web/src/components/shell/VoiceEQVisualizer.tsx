'use client';

import { useEffect, useRef, useState } from 'react';
import { useIdlePulse, useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { useShellStore } from '@/stores/shellStore';

const COLS = 48;
const ROWS = 20;

export function VoiceEQVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eqState = useShellStore((s) => s.eqState);
  const voiceSessionActive = useShellStore((s) => s.voiceSessionActive);
  const micLive =
    voiceSessionActive && (eqState === 'listening' || eqState === 'idle');
  const levels = useAudioAnalyser(micLive);
  const idlePhase = useIdlePulse(eqState !== 'idle' && eqState !== 'listening');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const gap = 3;
    const dotW = (w - gap * (COLS + 1)) / COLS;
    const dotH = (h - gap * (ROWS + 1)) / ROWS;
    const t = performance.now() / 1000;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = gap + col * (dotW + gap);
        const y = gap + row * (dotH + gap);
        let intensity = 0.08;

        if (eqState === 'listening' || micLive) {
          const bar = levels[col] ?? 0;
          const threshold = 1 - row / ROWS;
          intensity = bar > threshold ? Math.min(1, bar * 1.4) : 0.06;
        } else if (eqState === 'processing') {
          const wave = Math.sin(t * 4 + col * 0.35 + row * 0.2) * 0.5 + 0.5;
          intensity = 0.2 + wave * 0.6;
        } else if (eqState === 'thinking') {
          const wave = Math.sin(t * 3 + col * 0.25 + row * 0.15) * 0.5 + 0.5;
          intensity = 0.15 + wave * 0.55;
        } else if (eqState === 'speaking') {
          const wave = Math.sin(t * 5 + col * 0.4) * 0.5 + 0.5;
          intensity = row > ROWS * 0.35 ? 0.1 + wave * 0.7 : 0.08;
        } else {
          const pulse = Math.sin(idlePhase + col * 0.12 + row * 0.08) * 0.5 + 0.5;
          intensity = 0.06 + pulse * 0.18;
        }

        const alpha = Math.max(0.05, Math.min(1, intensity));
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
        if (intensity > 0.4) {
          ctx.shadowColor = 'rgba(34, 211, 238, 0.8)';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, dotW, dotH, 2);
        } else {
          ctx.rect(x, y, dotW, dotH);
        }
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }, [eqState, levels, idlePhase, micLive, tick]);

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[2.4/1] orb-glow rounded-2xl overflow-hidden border border-accent/20 bg-black/30 backdrop-blur-sm">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-bg/40 via-transparent to-transparent" />
    </div>
  );
}
