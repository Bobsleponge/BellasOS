'use client';

import Link from 'next/link';
import { AiView } from '@/components/AiView';

export default function AiStudioPage() {
  return (
    <div className="min-h-screen bg-panel text-white">
      <header className="border-b border-edge bg-panel/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">BellasOS</p>
            <h1 className="text-lg font-semibold">AI Studio</h1>
          </div>
          <Link href="/" className="text-sm text-muted hover:text-accent">
            ← Back to Jarvis
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        <AiView />
      </main>
    </div>
  );
}
