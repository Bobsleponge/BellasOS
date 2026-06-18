'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const AGENT_TIMEOUT_MS = 120_000;

export function useAgentCommand() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentType,
      prompt,
    }: {
      agentType: string;
      prompt: string;
    }) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
      try {
        return await api.command<Record<string, unknown>>(
          agentType,
          { prompt },
          controller.signal,
        );
      } finally {
        clearTimeout(timer);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.runs });
    },
  });
}
