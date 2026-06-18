'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useModuleInvoke<T = unknown>(
  moduleId: string,
  action: string,
  options?: {
    onSuccess?: (data: T) => void;
    invalidateKeys?: readonly (readonly string[])[];
  },
) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: unknown = {}) =>
      api.invoke<T>(moduleId, action, input),
    onSuccess: (data) => {
      for (const key of options?.invalidateKeys ?? []) {
        qc.invalidateQueries({ queryKey: key as string[] });
      }
      options?.onSuccess?.(data);
    },
  });
}
