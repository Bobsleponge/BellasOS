'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Brain,
  Camera,
  Code2,
  Home,
  Mic,
  PieChart,
  Share2,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { HIDDEN_DESKTOP_MODULES } from '@/lib/navigation';
import { useConsoleNavigation } from '@/hooks/useConsoleNavigation';
import { AppIcon } from './AppIcon';

const FIXED_APPS = [
  { id: 'system.console', label: 'Command Center', icon: Terminal },
  { id: 'ai.studio', label: 'AI & LLMs', icon: Sparkles },
];

const MODULE_ICONS: Record<string, typeof PieChart> = {
  'bellasos.portfolio': PieChart,
  'bellasos.research': BookOpen,
  'bellasos.intelligence': Brain,
  'bellasos.social': Share2,
  'bellasos.automation': Home,
  'bellasos.voice': Mic,
  'bellasos.camera': Camera,
  'bellasos.coding': Code2,
};

export function Desktop() {
  const { navigateToApp } = useConsoleNavigation();
  const { data: modules } = useQuery({ queryKey: queryKeys.modules, queryFn: api.modules });

  return (
    <div className="absolute inset-0 pt-8 pb-24 px-8 pointer-events-none">
      <div className="flex flex-wrap gap-6 content-start pointer-events-auto max-w-5xl">
        {FIXED_APPS.map((app) => (
          <AppIcon
            key={app.id}
            label={app.label}
            icon={app.icon}
            status="enabled"
            onOpen={() => navigateToApp(app.id)}
          />
        ))}
        {(modules ?? [])
          .filter((m) => !HIDDEN_DESKTOP_MODULES.has(m.manifest.id))
          .map((m) => {
            const Icon = MODULE_ICONS[m.manifest.id] ?? Sparkles;
            return (
              <AppIcon
                key={m.manifest.id}
                label={m.manifest.name}
                icon={Icon}
                status={m.status}
                onOpen={() => navigateToApp(m.manifest.id)}
              />
            );
          })}
      </div>
    </div>
  );
}
