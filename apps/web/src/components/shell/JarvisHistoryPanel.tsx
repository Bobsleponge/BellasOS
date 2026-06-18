'use client';

import { History, Plus, X } from 'lucide-react';
import type { JarvisSessionSummary } from '@/lib/api';
import { useJarvisSession } from '@/hooks/useJarvisSession';
import { useShellStore } from '@/stores/shellStore';
import { Button } from '@/components/ui/button';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface JarvisHistoryPanelProps {
  compact?: boolean;
}

export function JarvisHistoryPanel({ compact = false }: JarvisHistoryPanelProps) {
  const jarvisHistoryOpen = useShellStore((s) => s.jarvisHistoryOpen);
  const setJarvisHistoryOpen = useShellStore((s) => s.setJarvisHistoryOpen);
  const jarvisSessions = useShellStore((s) => s.jarvisSessions);
  const jarvisSessionId = useShellStore((s) => s.jarvisSessionId);
  const jarvisPending = useShellStore((s) => s.jarvisPending);
  const { startNewConversation, loadConversation, refreshSessions } = useJarvisSession();

  const handleNewConversation = async () => {
    if (jarvisPending) return;
    await startNewConversation();
    setJarvisHistoryOpen(false);
  };

  const handleSelect = async (session: JarvisSessionSummary) => {
    if (jarvisPending || session.id === jarvisSessionId) {
      setJarvisHistoryOpen(false);
      return;
    }
    await loadConversation(session);
    setJarvisHistoryOpen(false);
  };

  const toggleHistory = async () => {
    if (!jarvisHistoryOpen) {
      await refreshSessions().catch(() => {});
    }
    setJarvisHistoryOpen(!jarvisHistoryOpen);
  };

  return (
    <div className={compact ? 'w-full' : 'relative w-full max-w-md mx-auto'}>
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="glass"
          size="sm"
          onClick={() => void handleNewConversation()}
          disabled={jarvisPending}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New chat
        </Button>
        <Button
          type="button"
          variant="glass"
          size="sm"
          onClick={() => void toggleHistory()}
          className="gap-1.5"
        >
          <History className="w-4 h-4" />
          History
        </Button>
      </div>

      {jarvisHistoryOpen && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-xs uppercase tracking-wide text-accent">Past conversations</span>
            <button
              type="button"
              onClick={() => setJarvisHistoryOpen(false)}
              className="text-muted hover:text-white"
              aria-label="Close history"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {jarvisSessions.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">No saved conversations yet.</p>
            ) : (
              jarvisSessions.map((session) => {
                const active = session.id === jarvisSessionId;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => void handleSelect(session)}
                    disabled={jarvisPending}
                    className={`w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors ${
                      active ? 'bg-accent/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white truncate">{session.title}</span>
                      <span className="text-[11px] text-muted shrink-0">
                        {formatWhen(session.updatedAt)}
                      </span>
                    </div>
                    {session.preview && (
                      <p className="text-xs text-muted truncate mt-0.5">{session.preview}</p>
                    )}
                    <p className="text-[11px] text-muted/80 mt-1">
                      {session.messageCount} message{session.messageCount === 1 ? '' : 's'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}