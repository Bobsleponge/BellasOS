'use client';

import { useEffect, useState } from 'react';

export function RequestProgress({
  active,
  onCancel,
}: {
  active: boolean;
  onCancel?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span>Thinking… {elapsed}s</span>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-red-400 hover:underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
