'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RequestProgress } from './RequestProgress';

interface Line {
  role: 'user' | 'jarvis';
  text: string;
}

const TIMEOUT_MS = 120_000;

/**
 * The Jarvis console: natural-language entry point. Recognises a few command
 * verbs (research/brief/draft) and routes them to the right module/agent;
 * otherwise it runs a direct completion through the AI gateway.
 */
export function JarvisConsole() {
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { role: 'jarvis', text: 'BellasOS online. How can I help?' },
  ]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const qc = useQueryClient();

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setLines((l) => [...l, { role: 'jarvis', text: 'Cancelled.' }]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setLines((l) => [...l, { role: 'user', text }]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const reply = await route(text, controller.signal);
      setLines((l) => [...l, { role: 'jarvis', text: reply }]);
      qc.invalidateQueries();
    } catch (err) {
      const msg = (err as Error).name === 'AbortError'
        ? 'Request timed out after 120s. The local model may still be loading — try a shorter prompt or wait and retry.'
        : (err as Error).message;
      setLines((l) => [...l, { role: 'jarvis', text: `Error: ${msg}` }]);
    } finally {
      clearTimeout(timer);
      abortRef.current = null;
      setBusy(false);
    }
  }

  return (
    <div className="panel glow p-4 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-accent uppercase tracking-wide mb-3">
        Jarvis
      </h2>
      <div className="flex-1 overflow-auto space-y-2 mb-3 min-h-[8rem]">
        {lines.map((l, i) => (
          <div key={i} className={l.role === 'user' ? 'text-white' : 'text-accent2'}>
            <span className="text-muted mr-2">
              {l.role === 'user' ? '>' : '*'}
            </span>
            {l.text}
          </div>
        ))}
        <RequestProgress active={busy} onCancel={cancel} />
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try: "research NVIDIA" or "brief me" or "draft a LinkedIn post about AI"'
          className="flex-1 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

async function route(text: string, signal?: AbortSignal): Promise<string> {
  const lower = text.toLowerCase();
  if (lower.startsWith('research ')) {
    const subject = text.slice(9).trim();
    const r = await api.command<{ output: { report: { content: string } } }>(
      'research',
      { prompt: subject },
    );
    return r.output.report.content;
  }
  if (lower.includes('brief')) {
    const r = await api.command<{ output: { briefing: { content: string } } }>(
      'intelligence',
      { prompt: text },
    );
    return r.output.briefing.content;
  }
  if (lower.startsWith('draft')) {
    const r = await api.invoke<{ content: string }>('bellasos.social', 'draft.create', {
      platform: 'LinkedIn',
      topic: text,
      tone: 'professional',
    });
    return r.content ?? JSON.stringify(r);
  }
  const r = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1'}/ai/complete`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: text }),
      cache: 'no-store',
      signal,
    },
  );
  const json = await r.json();
  if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
  return json.data.text as string;
}
