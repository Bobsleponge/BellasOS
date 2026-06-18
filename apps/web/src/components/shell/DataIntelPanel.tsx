'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Database, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function DataIntelPanel() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: queryKeys.ingestStatus,
    queryFn: api.ingestStatus,
    refetchInterval: 60_000,
  });

  const recent = useQuery({
    queryKey: queryKeys.ingestRecent,
    queryFn: () => api.ingestRecent(12, 48),
    enabled: open,
    refetchInterval: open ? 60_000 : false,
  });

  const collect = useMutation({
    mutationFn: () => api.ingestCollectAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingest'] });
    },
  });

  const search = useMutation({
    mutationFn: () => api.ingestSearch(searchQuery, [], 8),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ingestRecent });
    },
  });

  const connectors = status.data?.connectors ?? [];
  const active = connectors.filter((c) => c.enabled && (!c.requiresKey || c.configured)).length;
  const lastAt = status.data?.lastCollectionAt;
  const unconfigured = connectors.filter((c) => c.requiresKey && !c.configured);

  return (
    <div className="pointer-events-auto w-full max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left text-sm text-white/80 hover:bg-black/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Database className="h-4 w-4 text-sky-400" />
          Live intel · {active}/{connectors.length} sources active
          {lastAt && (
            <span className="text-xs text-white/50">
              · updated {new Date(lastAt).toLocaleTimeString()}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/40 p-3 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {connectors.map((c) => (
              <Badge
                key={c.id}
                variant={c.enabled && (!c.requiresKey || c.configured) ? 'success' : 'muted'}
                title={c.description}
              >
                {c.name}
                {c.requiresKey && !c.configured ? ' (key needed)' : ''}
              </Badge>
            ))}
          </div>

          {unconfigured.length > 0 && (
            <p className="text-xs text-amber-300">
              {unconfigured.length} connector(s) need API keys — configure in module settings via{' '}
              <Link href="/console?view=overview" className="text-sky-300 underline">
                Console
              </Link>
              .
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              disabled={collect.isPending}
              onClick={() => collect.mutate()}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${collect.isPending ? 'animate-spin' : ''}`} />
              Collect now
            </Button>
            {collect.data && (
              <span className="text-xs text-emerald-300">
                +{collect.data.total} docs (
                {Object.entries(collect.data.bySource)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(', ')}
                )
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ingested documents…"
              className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!searchQuery.trim() || search.isPending}
              onClick={() => search.mutate()}
            >
              <Search className="h-3 w-3 mr-1" />
              Search
            </Button>
          </div>
          {search.data && search.data.count > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto text-xs text-white/70">
              {search.data.documents.map((d) => (
                <div key={d.id} className="truncate">
                  <span className="text-sky-300/80">[{d.source}]</span> {d.title}
                </div>
              ))}
            </div>
          )}

          {recent.data && recent.data.documents.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto text-xs text-white/70">
              {recent.data.documents.slice(0, 8).map((d) => (
                <div key={d.id} className="truncate">
                  <span className="text-sky-300/80">[{d.source}]</span> {d.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
