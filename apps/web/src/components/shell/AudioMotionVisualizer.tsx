'use client';

import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { useEffect, useRef } from 'react';
import { useShellStore, type EqState } from '@/stores/shellStore';

const GRADIENTS: Record<EqState, { stops: string[]; mode: number; spin: number }> = {
  idle: { stops: ['#0ea5e9', '#22d3ee', '#6366f1'], mode: 2, spin: 0.4 },
  listening: { stops: ['#22d3ee', '#38bdf8', '#a5f3fc'], mode: 10, spin: 1.2 },
  heard: { stops: ['#818cf8', '#6366f1', '#22d3ee'], mode: 10, spin: 1.6 },
  transcribing: { stops: ['#818cf8', '#38bdf8', '#22d3ee'], mode: 3, spin: 1.4 },
  thinking: { stops: ['#6366f1', '#38bdf8', '#22d3ee'], mode: 3, spin: 0.9 },
  speaking: { stops: ['#22d3ee', '#2dd4bf', '#38bdf8'], mode: 10, spin: 1.8 },
};

type MicBinding = {
  stream: MediaStream;
  node: MediaStreamAudioSourceNode;
};

function registerJarvisGradients(analyzer: AudioMotionAnalyzer) {
  for (const [name, cfg] of Object.entries(GRADIENTS)) {
    analyzer.registerGradient(`jarvis-${name}`, {
      colorStops: cfg.stops,
    });
  }
}

/** High-resolution spectrum orb powered by audioMotion-analyzer. */
export function AudioMotionVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<AudioMotionAnalyzer | null>(null);
  const micRef = useRef<MicBinding | null>(null);

  const eqState = useShellStore((s) => s.eqState);
  const micListening = useShellStore((s) => s.micListening);
  const jarvisPending = useShellStore((s) => s.jarvisPending);
  const visualState: EqState =
    jarvisPending && eqState === 'idle' ? 'thinking' : eqState;
  const micLive = micListening && eqState === 'listening';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const analyzer = new AudioMotionAnalyzer(container, {
      alphaBars: true,
      ansiBands: false,
      barSpace: 0.12,
      bgAlpha: 0,
      connectSpeakers: false,
      fadePeaks: true,
      fftSize: 8192,
      frequencyScale: 'log',
      gradient: 'classic',
      lineWidth: 1.5,
      loRes: false,
      mode: 2,
      overlay: true,
      radial: true,
      reflexRatio: 0.45,
      showScaleX: false,
      showScaleY: false,
      smoothing: 0.75,
      spinSpeed: 0.4,
    });

    registerJarvisGradients(analyzer);
    analyzer.setOptions({ gradient: 'jarvis-idle' });
    analyzerRef.current = analyzer;

    return () => {
      if (micRef.current) {
        analyzer.disconnectInput(micRef.current.node, true);
        micRef.current.stream.getTracks().forEach((t) => t.stop());
        micRef.current = null;
      }
      analyzer.destroy();
      analyzerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    const cfg = GRADIENTS[visualState];
    analyzer.setOptions({
      gradient: `jarvis-${visualState}`,
      mode: cfg.mode,
      spinSpeed: cfg.spin,
    });
  }, [visualState]);

  useEffect(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    let cancelled = false;

    const syncMic = async () => {
      if (!micLive) {
        if (micRef.current) {
          analyzer.disconnectInput(micRef.current.node, true);
          micRef.current.stream.getTracks().forEach((t) => t.stop());
          micRef.current = null;
        }
        return;
      }

      if (micRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const node = analyzer.audioCtx.createMediaStreamSource(stream);
        analyzer.connectInput(node);
        micRef.current = { stream, node };
      } catch {
        /* mic denied — idle animation still runs */
      }
    };

    void syncMic();

    return () => {
      cancelled = true;
    };
  }, [micLive]);

  return (
    <div className="relative mx-auto flex items-center justify-center">
      <div
        className="pointer-events-none absolute inset-0 rounded-full bg-cyan-400/10 blur-3xl animate-pulse"
        aria-hidden
      />
      <div
        ref={containerRef}
        className="relative h-[min(72vw,22rem)] w-[min(72vw,22rem)] max-h-80 max-w-80 [&_canvas]:!rounded-full"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-4 rounded-full border border-cyan-400/20 shadow-orb"
        aria-hidden
      />
    </div>
  );
}
