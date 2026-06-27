'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const MEMORY_CATEGORIES = [
  { id: 'preferences', label: 'Preferences', query: 'preference settings' },
  { id: 'decisions', label: 'Decisions', query: 'decision outcome' },
  { id: 'people', label: 'People', query: 'person contact' },
  { id: 'topics', label: 'Topics', query: 'topic project' },
] as const;

export function MemoryTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: queryKeys.ingestStatus,
    queryFn: api.ingestStatus,
    refetchInterval: 60_000,
  });

  const recent = useQuery({
    queryKey: queryKeys.ingestRecent,
    queryFn: () => api.ingestRecent(12, 48),
    refetchInterval: 60_000,
  });

  const recall = useMutation({
    mutationFn: (query: string) => api.memoryRecall({ query, tier: 'long', limit: 12 }),
  });

  const collect = useMutation({
    mutationFn: () => api.ingestCollectAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingest'] });
    },
  });

  const search = useMutation({
    mutationFn: () => api.ingestSearch(searchQuery, [], 8),
  });

  const connectors = status.data?.connectors ?? [];
  const active = connectors.filter((c) => c.enabled && (!c.requiresKey || c.configured)).length;

  function runCategoryQuery(categoryId: string, query: string) {
    setActiveCategory(categoryId);
    recall.mutate(query);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-white">Memory</h2>
        <p className="text-sm text-muted mt-1">
          What Jarvis remembers — preferences, decisions, people, and topics from your data sources.
        </p>
      </div>

      <section className="rounded-lg border border-edge bg-panel2/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-white/80">
          <Database className="h-4 w-4 text-sky-400" />
          Live intel · {active}/{connectors.length} sources active
        </div>
        <div className="flex flex-wrap gap-2">
          {connectors.map((c) => (
            <Badge
              key={c.id}
              variant={c.enabled && (!c.requiresKey || c.configured) ? 'success' : 'muted'}
            >
              {c.name}
            </Badge>
          ))}
        </div>
        <Button size="sm" variant="outline" disabled={collect.isPending} onClick={() => collect.mutate()}>
          <RefreshCw className={`h-3 w-3 mr-1 ${collect.isPending ? 'animate-spin' : ''}`} />
          Collect now
        </Button>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {MEMORY_CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={activeCategory === cat.id ? 'default' : 'outline'}
              onClick={() => runCategoryQuery(cat.id, cat.query)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
        {recall.data && recall.data.length > 0 && (
          <ul className="mt-3 space-y-2">
            {recall.data.map((hit) => (
              <li
                key={hit.item.id}
                className="rounded-lg border border-edge bg-panel2/40 px-3 py-2 text-xs text-white/80"
              >
                {hit.item.content}
                {hit.item.tags.length > 0 && (
                  <span className="text-muted ml-2">({hit.item.tags.join(', ')})</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {recall.isPending && <p className="text-xs text-muted mt-2">Recalling…</p>}
        {recall.data && recall.data.length === 0 && (
          <p className="text-xs text-muted mt-2">No memories in this category yet.</p>
        )}
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Search documents</h3>
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingested documents…"
            className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1.5 text-sm"
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
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto text-xs text-white/70">
            {search.data.documents.map((d) => (
              <div key={d.id} className="truncate">
                <span className="text-sky-300/80">[{d.source}]</span> {d.title}
              </div>
            ))}
          </div>
        )}
      </section>

      {recent.data && recent.data.documents.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Recent ingest</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto text-xs text-white/70">
            {recent.data.documents.slice(0, 10).map((d) => (
              <div key={d.id} className="truncate">
                <span className="text-sky-300/80">[{d.source}]</span> {d.title}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
