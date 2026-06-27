'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function DecisionsTab() {
  const qc = useQueryClient();
  const [committingId, setCommittingId] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');

  const { data: decisions, isLoading } = useQuery({
    queryKey: queryKeys.decisions,
    queryFn: async () => (await api.decisions({ status: 'open' })).decisions,
  });

  const { data: recData } = useQuery({
    queryKey: queryKeys.briefing,
    queryFn: () => api.jarvisBriefing({ persist: false }),
  });

  const recommendations = recData?.decisionRecommendations ?? [];

  const commit = useMutation({
    mutationFn: ({
      decisionId,
      chosenOptionId,
      rationale: note,
    }: {
      decisionId: string;
      chosenOptionId: string;
      rationale?: string;
    }) => api.commitDecision(decisionId, { chosenOptionId, rationale: note }),
    onSuccess: () => {
      setCommittingId(null);
      setRationale('');
      qc.invalidateQueries({ queryKey: queryKeys.decisions });
      qc.invalidateQueries({ queryKey: queryKeys.today });
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-white">Decisions</h2>
        <p className="text-sm text-muted mt-1">
          Open strategic decisions with Jarvis recommendations — commit when you are ready.
        </p>
      </div>

      {recommendations.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Jarvis recommendations</h3>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3"
              >
                <p className="text-sm font-medium text-white">{rec.title}</p>
                <p className="text-xs text-muted mt-1">{rec.tradeoffLine}</p>
                <p className="text-xs text-accent mt-2">→ {rec.recommendedOption}</p>
                {rec.nextAction && (
                  <p className="text-[10px] text-muted mt-1">{rec.nextAction}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Open decisions</h3>
        {isLoading && <p className="text-sm text-muted">Loading…</p>}
        <div className="space-y-3">
          {(decisions ?? []).map((decision) => {
            const rec = recommendations.find((r) => r.decisionId === decision.id);
            const recommended = decision.options.find((o) => o.recommended);
            return (
              <div
                key={decision.id}
                className="rounded-lg border border-edge bg-panel2/40 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{decision.title}</p>
                  <span className="text-[10px] uppercase text-muted">{decision.category}</span>
                </div>
                <p className="text-xs text-muted mt-1">{decision.question}</p>
                {rec && (
                  <p className="text-xs text-accent/90 mt-2">{rec.tradeoffLine}</p>
                )}
                {decision.options.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {decision.options.map((opt) => (
                      <li key={opt.id} className="text-[11px] text-white/70">
                        {opt.recommended ? '→ ' : '· '}
                        {opt.label}
                        {opt.recommended ? ' (recommended)' : ''}
                      </li>
                    ))}
                  </ul>
                )}

                {committingId === decision.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      placeholder="Optional rationale…"
                      className="w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                      rows={2}
                    />
                    <div className="flex gap-2 flex-wrap">
                      {decision.options.map((opt) => (
                        <Button
                          key={opt.id}
                          size="sm"
                          variant={opt.recommended ? 'default' : 'outline'}
                          disabled={commit.isPending}
                          onClick={() =>
                            commit.mutate({
                              decisionId: decision.id,
                              chosenOptionId: opt.id,
                              rationale: rationale || undefined,
                            })
                          }
                        >
                          Commit: {opt.label}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => setCommittingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => setCommittingId(decision.id)}>
                      Commit
                    </Button>
                    <Button size="sm" variant="ghost">
                      Defer
                    </Button>
                    {recommended && (
                      <span className="text-[10px] text-muted self-center">
                        Recommended: {recommended.label}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!isLoading && (decisions ?? []).length === 0 && (
            <p className="text-sm text-muted">No open decisions.</p>
          )}
        </div>
      </section>
    </div>
  );
}
