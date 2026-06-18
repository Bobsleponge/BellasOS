'use client';

import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useShellStore } from '@/stores/shellStore';

/** Webcam hand-gesture layer (MediaPipe). Opt-in via taskbar. */
export function GestureLayer() {
  const enabled = useShellStore((s) => s.gestureEnabled);
  const voiceSessionActive = useShellStore((s) => s.voiceSessionActive);
  const setVoiceSessionActive = useShellStore((s) => s.setVoiceSessionActive);
  const setEqState = useShellStore((s) => s.setEqState);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastGesture = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });

        timer = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          const result = landmarker.detectForVideo(video, performance.now());
          const landmarks = result.landmarks?.[0];
          if (!landmarks || landmarks.length < 21) return;

          const wrist = landmarks[0];
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const dist =
            Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) ?? 1;

          let gesture = 'none';
          if (dist < 0.05) gesture = 'pinch';
          else if (indexTip.y < wrist.y - 0.15) gesture = 'point';
          else if (Math.abs(indexTip.x - wrist.x) > 0.2) gesture = 'swipe';

          if (gesture !== lastGesture.current && gesture !== 'none') {
            lastGesture.current = gesture;
            if (gesture === 'point') {
              if (!voiceSessionActive) {
                setVoiceSessionActive(true);
              }
              setEqState('listening');
              await api.invoke('bellasos.camera', 'ingest', {
                kind: 'gesture',
                detail: gesture,
              });
            }
          }
        }, 200);
      } catch {
        /* camera or model unavailable */
      }
    };

    start();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, setEqState, voiceSessionActive, setVoiceSessionActive]);

  if (!enabled) return null;

  return (
    <video
      ref={videoRef}
      className="fixed bottom-16 right-4 w-32 h-24 rounded-lg border border-accent/30 opacity-40 pointer-events-none z-40 object-cover"
      muted
      playsInline
    />
  );
}
