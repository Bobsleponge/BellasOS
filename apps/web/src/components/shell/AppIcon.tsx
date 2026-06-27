'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppIcon({
  label,
  icon: Icon,
  status,
  compact = false,
  dock = false,
  onOpen,
}: {
  label: string;
  icon: LucideIcon;
  status?: string;
  compact?: boolean;
  /** Grid dock sizing — consistent columns in command deck. */
  dock?: boolean;
  onOpen: () => void;
}) {
  const online = status === 'enabled' || status === 'started';
  return (
    <motion.button
      whileHover={{ scale: 1.04, y: dock ? -2 : compact ? 0 : -2 }}
      whileTap={{ scale: 0.97 }}
      onDoubleClick={onOpen}
      onClick={onOpen}
      className={cn(
        'flex flex-col items-center group shrink-0',
        dock ? 'gap-1.5 w-[4.75rem]' : compact ? 'gap-1 w-16' : 'gap-2 w-24',
      )}
    >
      <div
        className={cn(
          'relative rounded-2xl flex items-center justify-center transition-all',
          'border border-white/10 bg-white/[0.03] backdrop-blur-sm',
          'group-hover:border-accent/50 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]',
          dock ? 'w-12 h-12' : compact ? 'w-11 h-11' : 'w-14 h-14',
        )}
      >
        <Icon
          className={cn(
            'text-accent2',
            dock ? 'w-5 h-5' : compact ? 'w-5 h-5' : 'w-7 h-7',
          )}
        />
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border border-bg',
            dock || compact ? 'h-2 w-2' : 'h-2.5 w-2.5',
            online ? 'bg-emerald-400' : 'bg-amber-400',
          )}
        />
      </div>
      <span
        className={cn(
          'text-center text-muted group-hover:text-white line-clamp-2 leading-tight',
          dock ? 'text-[10px]' : compact ? 'text-[10px]' : 'text-xs',
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}
