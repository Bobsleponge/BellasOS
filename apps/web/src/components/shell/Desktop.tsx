'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Brain,
  Camera,
  Home,
  Mic,
  PieChart,
  Share2,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useShellStore } from '@/stores/shellStore';
import { AppIcon } from './AppIcon';

const FIXED_APPS = [
  { id: 'ai.studio', label: 'AI Studio', icon: Sparkles },
  { id: 'system.console', label: 'System Console', icon: Terminal },
];

const MODULE_ICONS: Record<string, typeof PieChart> = {
  'bellasos.portfolio': PieChart,
  'bellasos.research': BookOpen,
  'bellasos.intelligence': Brain,
  'bellasos.social': Share2,
  'bellasos.automation': Home,
  'bellasos.voice': Mic,
  'bellasos.camera': Camera,
  'bellasos.llm': Zap,
};

export function Desktop() {
  const openApp = useShellStore((s) => s.openApp);
  const { data: modules } = useQuery({ queryKey: ['modules'], queryFn: api.modules });

  return (
    <div className="absolute inset-0 pt-8 pb-24 px-8 pointer-events-none">
      <div className="flex flex-wrap gap-6 content-start pointer-events-auto max-w-5xl">
        {FIXED_APPS.map((app) => (
          <AppIcon
            key={app.id}
            label={app.label}
            icon={app.icon}
            status="enabled"
            onOpen={() => openApp(app.id, app.label)}
          />
        ))}
        {(modules ?? []).map((m) => {
          const Icon = MODULE_ICONS[m.manifest.id] ?? Sparkles;
          return (
            <AppIcon
              key={m.manifest.id}
              label={m.manifest.name}
              icon={Icon}
              status={m.status}
              onOpen={() => openApp(m.manifest.id, m.manifest.name)}
            />
          );
        })}
      </div>
    </div>
  );
}
