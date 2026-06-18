'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioAnalyser(active: boolean) {
  const [levels, setLevels] = useState<number[]>(() => new Array(48).fill(0));
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      setLevels(new Array(48).fill(0));
      return;
    }

    let cancelled = false;
    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        ctxRef.current = ctx;
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const bars = 48;
          const step = Math.floor(data.length / bars);
          const next: number[] = [];
          for (let i = 0; i < bars; i++) {
            let sum = 0;
            for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
            next.push(sum / step / 255);
          }
          setLevels(next);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setLevels(new Array(48).fill(0.05));
      }
    };
    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [active]);

  return levels;
}

export function useIdlePulse(active: boolean) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (active) return;
    const t = setInterval(() => setPhase((p) => p + 0.08), 50);
    return () => clearInterval(t);
  }, [active]);
  return phase;
}
