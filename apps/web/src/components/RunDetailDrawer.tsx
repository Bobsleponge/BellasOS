'use client';

import { type AgentRun } from '@/lib/api';

export function RunDetailDrawer({
  run,
  onClose,
}: {
  run: AgentRun | null;
  onClose: () => void;
}) {
  if (!run) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        className="absolute inset-0 bg-black/50"
        aria-label="Close run detail"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-panel border-l border-edge h-full overflow-y-auto p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold">{run.agentType}</h3>
            <p className="text-xs text-muted">{run.id}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white text-sm">
            Close
          </button>
        </div>
        <dl className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <dt className="text-muted">Status</dt>
            <dd className="text-white">{run.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Started</dt>
            <dd className="text-white">{new Date(run.startedAt).toLocaleString()}</dd>
          </div>
          {run.finishedAt && (
            <div className="flex justify-between">
              <dt className="text-muted">Finished</dt>
              <dd className="text-white">{new Date(run.finishedAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>
        {run.error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {run.error}
          </div>
        )}
        {run.output && (
          <pre className="text-xs bg-panel2 border border-edge rounded-lg p-3 overflow-auto max-h-[60vh] whitespace-pre-wrap text-accent2">
            {JSON.stringify(run.output, null, 2)}
          </pre>
        )}
        {!run.output && !run.error && (
          <p className="text-xs text-muted">No output recorded for this run.</p>
        )}
      </div>
    </div>
  );
}