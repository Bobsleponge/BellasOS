'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useJarvisSession } from '@/hooks/useJarvisSession';

export function UniversalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useJarvisSession();

  const search = useMutation({
    mutationFn: () => api.ingestSearch(query.trim(), [], 8),
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    setQuery('');
    search.reset();
    // Only re-run when the dialog opens/closes — not when the mutation object identity changes.
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function runSearch() {
    if (!query.trim()) return;
    search.mutate();
  }

  async function askJarvis() {
    const text = query.trim();
    if (!text) return;
    setOpen(false);
    await sendMessage(`Search and help me with: ${text}`, 'text');
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/50 hover:bg-black/30 hover:text-white/70 transition-colors text-left"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1">Search everything…</span>
        <kbd className="text-[10px] border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/60"
        aria-label="Close search"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-white/10 bg-panel shadow-2xl p-3">
        <div className="flex gap-2">
          <Search className="h-4 w-4 mt-2.5 text-white/50 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            placeholder="Search documents, goals, decisions…"
            className="flex-1 bg-transparent text-sm text-white outline-none py-2"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" disabled={!query.trim() || search.isPending} onClick={runSearch}>
            Search
          </Button>
          <Button size="sm" disabled={!query.trim()} onClick={() => void askJarvis()}>
            <Sparkles className="h-3 w-3 mr-1" />
            Ask Jarvis
          </Button>
        </div>
        {search.data && search.data.count > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto space-y-1 text-xs text-white/70">
            {search.data.documents.map((d) => (
              <div key={d.id} className="truncate px-1 py-0.5">
                <span className="text-sky-300/80">[{d.source}]</span> {d.title}
              </div>
            ))}
          </div>
        )}
        {search.data && search.data.count === 0 && (
          <p className="text-xs text-muted mt-2 px-1">No documents matched. Try Ask Jarvis.</p>
        )}
      </div>
    </>
  );
}
