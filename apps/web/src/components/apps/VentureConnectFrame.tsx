'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Globe } from 'lucide-react';
import { AskJarvisButton } from '@/components/jarvis/AskJarvisButton';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { homeSectionUrl } from '@/lib/missionRoutes';
import { queryKeys } from '@/lib/queryKeys';

const VENTURE_META = {
  'harvi-and-co': {
    label: 'Harvi & Co',
    icon: Building2,
    orgHint: 'harvi',
    connectPrompt: 'Help me connect Harvi and Co to BellasOS',
  },
  truafrica: {
    label: 'TruAfrica',
    icon: Globe,
    orgHint: 'truafrica',
    connectPrompt: 'Help me connect TruAfrica to BellasOS',
  },
} as const;

type VentureId = keyof typeof VENTURE_META;

export function VentureConnectFrame({ ventureId }: { ventureId: VentureId }) {
  const meta = VENTURE_META[ventureId];
  const Icon = meta.icon;

  const { data: integrations, isLoading } = useQuery({
    queryKey: queryKeys.integrations,
    queryFn: api.getIntegrations,
  });

  const connected = integrations?.modules?.some((m) =>
    m.linkedAccounts?.some(
      (a) =>
        a.status === 'connected' &&
        a.platform.toLowerCase().includes(meta.orgHint),
    ),
  );

  return (
    <div className="min-h-screen bg-panel text-white flex flex-col">
      <header className="shrink-0 border-b border-edge bg-panel/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Jarvis
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-5 w-5 text-accent shrink-0" />
            <h1 className="truncate text-lg font-semibold">{meta.label}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-6 space-y-6">
        <div className="rounded-xl border border-white/10 bg-black/20 p-6 space-y-4">
          <p className="text-sm text-white/70">
            {meta.label} is your venture operations system of record. Connect it through Jarvis to
            sync projects, tasks, and summaries into your workspace.
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-white/40">Status</span>
            {isLoading ? (
              <span className="text-sm text-muted">Checking…</span>
            ) : connected ? (
              <span className="text-sm text-emerald-400">Connected</span>
            ) : (
              <span className="text-sm text-amber-400">Not connected</span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <AskJarvisButton prompt={meta.connectPrompt}>
              Ask Jarvis to connect
            </AskJarvisButton>
            <Link href={homeSectionUrl('workspaces')}>
              <Button variant="outline" size="sm">
                View workspaces
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
