'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WealthPortfolioView } from '@/components/finance/WealthPortfolioView';
import { financeTrackerEmbedPath, getFinanceTrackerBaseUrl } from '@/lib/financeApp';
import { api } from '@/lib/api';

type WealthTab = 'accounts' | 'portfolio';

type Props = {
  pathSegments: string[];
};

export function FinanceAppFrame({ pathSegments }: Props) {
  const baseUrl = getFinanceTrackerBaseUrl();
  const embedPath = useMemo(() => financeTrackerEmbedPath(pathSegments), [pathSegments]);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [tab, setTab] = useState<WealthTab>('accounts');
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setAuthError(null);
    setIframeSrc(null);
    void api
      .financeTrackerEmbedUrl(embedPath)
      .then((res) => {
        if (!cancelled) setIframeSrc(res.url);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setAuthError(err.message);
          setIframeSrc(`${baseUrl}${embedPath}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [embedPath, frameKey, baseUrl]);

  useEffect(() => {
    if (!iframeSrc) return;
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
    }, 8000);

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
            <p className="truncate text-sm font-semibold">Wealth</p>
            <p className="truncate text-xs text-white/60">Finance Tracker + Portfolio</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="mr-2 flex rounded-lg border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setTab('accounts')}
              className={`rounded-md px-3 py-1 text-xs ${
                tab === 'accounts' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Accounts
            </button>
            <button
              type="button"
              onClick={() => setTab('portfolio')}
              className={`rounded-md px-3 py-1 text-xs ${
                tab === 'portfolio' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Portfolio
            </button>
          </div>
          {tab === 'accounts' && (
            <>
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
              <a href={iframeSrc ?? baseUrl} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Open tab
                </Button>
              </a>
            </>
          )}
        </div>
      </header>

      {tab === 'portfolio' ? (
        <WealthPortfolioView />
      ) : (
        <div className="relative min-h-0 flex-1 bg-gray-50">
          {authError && (
            <div className="absolute left-4 right-4 top-4 z-30 rounded-lg border border-amber-500/30 bg-amber-950/80 px-3 py-2 text-xs text-amber-100">
              Could not start unified Wealth sign-in ({authError}). Using direct Finance Tracker URL.
            </div>
          )}
          {!iframeSrc && !offline && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <p className="text-sm text-white/70">Signing in to Wealth with BellasOS…</p>
            </div>
          )}
          {iframeSrc && !loaded && !offline && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <p className="text-sm text-white/70">Loading Wealth…</p>
            </div>
          )}

          {offline && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/95 p-6">
              <div className="max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 text-center shadow-xl">
                <h2 className="text-lg font-semibold">Finance Tracker is not running</h2>
                <p className="mt-2 text-sm text-white/70">
                  Wealth opens your Finance Tracker app for accounts, assets, investments, and
                  transactions. Start it on port 5000, then reload — or switch to the Portfolio tab
                  for BellasOS holdings analysis.
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
                  <Button variant="ghost" onClick={() => setTab('portfolio')}>
                    Open Portfolio tab
                  </Button>
                  <a href={baseUrl} target="_blank" rel="noreferrer">
                    <Button variant="ghost">Open {baseUrl}</Button>
                  </a>
                </div>
              </div>
            </div>
          )}

          {iframeSrc && (
          <iframe
            key={frameKey}
            title="Wealth — Finance Tracker"
            src={iframeSrc}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            allow="clipboard-read; clipboard-write"
            onLoad={() => {
              loadedRef.current = true;
              setLoaded(true);
              setOffline(false);
            }}
          />
          )}
        </div>
      )}
    </div>
  );
}
