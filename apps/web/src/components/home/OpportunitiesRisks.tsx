'use client';

import Link from 'next/link';
import { INTELLIGENCE_APP_URL } from '@bellasos/contracts';
import { useShellStore } from '@/stores/shellStore';
import { filterPulseOpportunities, filterPulseRisks } from '@/lib/worldSignalFilters';
import { useJarvisSession } from '@/hooks/useJarvisSession';

function SignalCard({
  headline,
  relevanceLine,
  prompt,
  tone,
}: {
  headline: string;
  relevanceLine?: string;
  prompt: string;
  tone: 'opportunity' | 'risk';
}) {
  const { sendMessage } = useJarvisSession();
  const border =
    tone === 'opportunity' ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-red-400/20 bg-red-400/5';

  return (
    <button
      type="button"
      onClick={() => void sendMessage(prompt, 'text')}
      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors hover:border-accent/30 ${border}`}
    >
      <p className="text-sm font-medium text-white">{headline}</p>
      {relevanceLine && <p className="text-xs text-muted mt-1">{relevanceLine}</p>}
      <p className="text-[10px] text-accent mt-1.5">Ask Jarvis about this →</p>
    </button>
  );
}

export function OpportunitiesRisks({ embedded = false }: { embedded?: boolean }) {
  const insights = useShellStore((s) => s.lastBriefingInsights);
  const pulse = insights?.worldPulse ?? [];

  const opportunities = filterPulseOpportunities(pulse).slice(0, 3);
  const risks = filterPulseRisks(pulse).slice(0, 3);

  if (opportunities.length === 0 && risks.length === 0) {
    if (embedded) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted">No opportunities or risks flagged right now.</p>
          <Link href={INTELLIGENCE_APP_URL} className="text-xs text-accent hover:underline">
            Open Intelligence →
          </Link>
        </div>
      );
    }
    return null;
  }

  return (
    <section
      id={embedded ? undefined : 'intelligence'}
      className={embedded ? 'grid gap-4 sm:grid-cols-2' : 'scroll-mt-24 grid gap-4 sm:grid-cols-2'}
    >
      <div>
        <h3 className="text-xs uppercase tracking-wider text-emerald-400/80 mb-2">Opportunities</h3>
        <div className="space-y-2">
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted">None flagged right now.</p>
          ) : (
            opportunities.map((item) => (
              <SignalCard
                key={item.id}
                headline={item.headline}
                relevanceLine={item.relevanceLine}
                prompt={`Tell me more about this opportunity and what I should do: ${item.headline}`}
                tone="opportunity"
              />
            ))
          )}
        </div>
      </div>
      <div>
        <h3 className="text-xs uppercase tracking-wider text-red-400/80 mb-2">Risks</h3>
        <div className="space-y-2">
          {risks.length === 0 ? (
            <p className="text-sm text-muted">None flagged right now.</p>
          ) : (
            risks.map((item) => (
              <SignalCard
                key={item.id}
                headline={item.headline}
                relevanceLine={item.relevanceLine}
                prompt={`Help me assess this risk and recommend mitigations: ${item.headline}`}
                tone="risk"
              />
            ))
          )}
        </div>
      </div>
      <Link
        href={INTELLIGENCE_APP_URL}
        className="sm:col-span-2 text-[10px] text-accent hover:underline"
      >
        Open Intelligence app →
      </Link>
    </section>
  );
}
