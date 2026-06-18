'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { financeTrackerPath, getFinanceTrackerBaseUrl } from '@/lib/financeApp';

type Props = {
  pathSegments: string[];
};

export function FinanceAppFrame({ pathSegments }: Props) {
  const baseUrl = getFinanceTrackerBaseUrl();
  const iframeSrc = useMemo(() => financeTrackerPath(pathSegments), [pathSegments]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    setLoaded(false);
    setOffline(false);

    let cancelled = false;
    const probe = async () => {
      try {
        const ctrl = new AbortController();
        const timeout = window.setTimeout(() => ctrl.abort(), 4000);
        await fetch(baseUrl, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal });
        window.clearTimeout(timeout);
      } catch {
        if (!cancelled) {
          loadedRef.current = false;
          setLoaded(false);
          setOffline(true);
        }
      }
    };
    void probe();

    const timer = window.setTimeout(() => {
      if (!loadedRef.current) setOffline(true);
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [iframeSrc, frameKey, baseUrl]);

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-900/95 px-4 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              BellasOS
            </Button>
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Portfolio</p>
            <p className="truncate text-xs text-white/60">Finance Tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
            onClick={() => {
              setLoaded(false);
              setOffline(false);
              setFrameKey((k) => k + 1);
            }}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Reload
          </Button>
          <a href={iframeSrc} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open tab
            </Button>
          </a>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-gray-50">
        {!loaded && !offline && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm text-white/70">Loading Finance Tracker…</p>
          </div>
        )}

        {offline && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/95 p-6">
            <div className="max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 text-center shadow-xl">
              <h2 className="text-lg font-semibold">Finance Tracker is not running</h2>
              <p className="mt-2 text-sm text-white/70">
                Portfolio opens your full Finance Tracker app (dashboard, assets, investments, and
                more). Start it on port 5000, then reload.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-3 text-left text-xs text-emerald-300">
                {`cd Finance-Tracker\nnpm run dev\n\n# or from BellasOS root:\nnpm run dev:finance`}
              </pre>
              <p className="mt-3 text-xs text-white/50">Expected URL: {baseUrl}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button
                  onClick={() => {
                    setOffline(false);
                    setLoaded(false);
                    setFrameKey((k) => k + 1);
                  }}
                >
                  Try again
                </Button>
                <a href={baseUrl} target="_blank" rel="noreferrer">
                  <Button variant="ghost">Open {baseUrl}</Button>
                </a>
              </div>
            </div>
          </div>
        )}

        <iframe
          key={frameKey}
          title="Finance Tracker"
          src={iframeSrc}
          className="absolute inset-0 h-full w-full border-0 bg-white"
          allow="clipboard-read; clipboard-write"
          onLoad={() => {
            loadedRef.current = true;
            setLoaded(true);
            setOffline(false);
          }}
        />
      </div>
    </div>
  );
}
