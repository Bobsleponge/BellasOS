'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppIcon({
  label,
  icon: Icon,
  status,
  onOpen,
}: {
  label: string;
  icon: LucideIcon;
  status?: string;
  onOpen: () => void;
}) {
  const online = status === 'enabled' || status === 'started';
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onDoubleClick={onOpen}
      onClick={onOpen}
      className="flex flex-col items-center gap-2 w-24 group"
    >
      <div
        className={cn(
          'relative w-14 h-14 rounded-2xl glass-panel flex items-center justify-center',
          'border border-white/10 group-hover:border-accent/40 transition-colors',
        )}
      >
        <Icon className="w-7 h-7 text-accent2" />
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-bg',
            online ? 'bg-green-400' : 'bg-amber-400',
          )}
        />
      </div>
      <span className="text-xs text-center text-muted group-hover:text-white line-clamp-2">
        {label}
      </span>
    </motion.button>
  );
}
