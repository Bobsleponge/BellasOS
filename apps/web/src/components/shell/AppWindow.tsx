'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, X } from 'lucide-react';
import { useShellStore, type ShellWindow } from '@/stores/shellStore';
import { cn } from '@/lib/utils';
import { AppContent } from './AppContent';

export function AppWindow({ win }: { win: ShellWindow }) {
  const focusWindow = useShellStore((s) => s.focusWindow);
  const closeWindow = useShellStore((s) => s.closeWindow);
  const toggleMinimize = useShellStore((s) => s.toggleMinimize);
  const moveWindow = useShellStore((s) => s.moveWindow);
  const focusedWindowId = useShellStore((s) => s.focusedWindowId);
  const dragRef = useRef<{ x: number; y: number; wx: number; wy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    focusWindow(win.id);
    dragRef.current = { x: e.clientX, y: e.clientY, wx: win.x, wy: win.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    moveWindow(win.id, dragRef.current.wx + dx, dragRef.current.wy + dy);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  if (win.minimized) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex }}
      className={cn(
        'fixed flex flex-col rounded-xl overflow-hidden glass-panel border shadow-2xl',
        focusedWindowId === win.id ? 'border-accent/40' : 'border-white/10',
      )}
      onMouseDown={() => focusWindow(win.id)}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-white/10 cursor-grab active:cursor-grabbing bg-black/20"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="text-sm text-white truncate">{win.title}</span>
        <div className="flex gap-1">
          <button
            onClick={() => toggleMinimize(win.id)}
            className="p-1 rounded hover:bg-white/10 text-muted"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => closeWindow(win.id)}
            className="p-1 rounded hover:bg-red-500/20 text-muted hover:text-red-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-panel/95 overflow-hidden">
        <AppContent appId={win.appId} />
      </div>
    </motion.div>
  );
}
