'use client';

import { useState } from 'react';
import { useJarvisBootstrap, useJarvisSession } from '@/hooks/useJarvisSession';
import { useShellStore } from '@/stores/shellStore';
import { JarvisHistoryPanel } from '@/components/shell/JarvisHistoryPanel';
import { JarvisSuggestedAppButton } from '@/components/shell/JarvisSuggestedAppButton';

/**
 * Jarvis console sidebar — uses shared useJarvisSession for chat + navigation.
 */
export function JarvisConsole() {
  useJarvisBootstrap();

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const transcript = useShellStore((s) => s.transcript);
  const jarvisPending = useShellStore((s) => s.jarvisPending);
  const { sendMessage } = useJarvisSession();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    try {
      await sendMessage(text, 'text');
    } finally {
      setBusy(false);
    }
  }

  const active = busy || jarvisPending;

  return (
    <div className="panel glow p-4 flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-accent uppercase tracking-wide">
          Jarvis
        </h2>
      </div>
      <div className="mb-3">
        <JarvisHistoryPanel compact />
      </div>
      <div className="flex-1 overflow-auto space-y-2 mb-3 min-h-[8rem]">
        {transcript.map((line, i) => (
          <div key={i} className={line.role === 'user' ? 'text-white' : 'text-accent2'}>
            <span className="text-muted mr-2">
              {line.role === 'user' ? '>' : '*'}
            </span>
            {line.text}
            {line.role === 'jarvis' && line.suggestedApp ? (
              <JarvisSuggestedAppButton appId={line.suggestedApp} />
            ) : null}
          </div>
        ))}
        <RequestProgress active={active} />
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try: "research NVIDIA" or "brief me" or "open portfolio"'
          className="flex-1 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={active}
          className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
