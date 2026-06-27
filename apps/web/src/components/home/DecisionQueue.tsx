'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';
import type { DecisionRecommendation } from '@/lib/api';

const EMPTY_RECOMMENDATIONS: DecisionRecommendation[] = [];

export function DecisionQueue({ hideJarvisPick = false }: { hideJarvisPick?: boolean }) {
  const qc = useQueryClient();
  const [committingId, setCommittingId] = useState<string | null>(null);
  const recommendations = useShellStore(
    (s) => s.lastBriefingInsights?.decisionRecommendations ?? EMPTY_RECOMMENDATIONS,
  );

  const { data: decisions, isLoading } = useQuery({
    queryKey: queryKeys.decisions,
    queryFn: async () => (await api.decisions({ status: 'open' })).decisions,
    staleTime: 30_000,
  });

  const commit = useMutation({
    mutationFn: ({
      decisionId,
      chosenOptionId,
    }: {
      decisionId: string;
      chosenOptionId: string;
    }) => api.commitDecision(decisionId, { chosenOptionId }),
    onSuccess: () => {
      setCommittingId(null);
      qc.invalidateQueries({ queryKey: queryKeys.decisions });
      qc.invalidateQueries({ queryKey: queryKeys.today });
      qc.invalidateQueries({ queryKey: queryKeys.briefing });
    },
  });

  const open = (decisions ?? []).slice(0, 3);

  if (isLoading) {
    return <p className="text-sm text-muted">Loading decisions…</p>;
  }

  if (open.length === 0 && recommendations.length === 0) {
    return (
      <div className="rounded-lg border border-edge bg-panel2/40 px-4 py-3 text-sm text-muted">
        No open decisions.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!hideJarvisPick &&
        recommendations.slice(0, 1).map((rec) => (
        <div key={rec.id} className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
          <p className="text-[10px] uppercase text-accent">Jarvis pick</p>
          <p className="text-sm font-medium text-white mt-0.5">{rec.title}</p>
          <p className="text-xs text-muted mt-1">{rec.recommendedOption}</p>
        </div>
      ))}
      {open.map((decision) => {
        const recommended = decision.options.find((o) => o.recommended);
        return (
          <div key={decision.id} className="rounded-lg border border-edge bg-panel2/40 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <GitBranch className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{decision.title}</p>
                <p className="text-xs text-muted mt-0.5 line-clamp-2">{decision.question}</p>
                {committingId === decision.id ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {decision.options.map((opt) => (
                      <Button
                        key={opt.id}
                        size="sm"
                        variant={opt.recommended ? 'default' : 'outline'}
                        disabled={commit.isPending}
                        onClick={() =>
                          commit.mutate({ decisionId: decision.id, chosenOptionId: opt.id })
                        }
                      >
                        {opt.label}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => setCommittingId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => setCommittingId(decision.id)}
                  >
                    Commit{recommended ? `: ${recommended.label}` : ''}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
