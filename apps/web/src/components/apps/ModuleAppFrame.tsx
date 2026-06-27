'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ModuleDetailView } from '@/components/views';
import { Button } from '@/components/ui/button';
import { shellAppTitle } from '@/lib/navigation';

type Props = {
  moduleId: string;
  initialProjectId?: string | null;
};

export function ModuleAppFrame({ moduleId, initialProjectId }: Props) {
  const title = shellAppTitle(moduleId);

  return (
    <div className="min-h-screen bg-panel text-white flex flex-col">
      <header className="shrink-0 border-b border-edge bg-panel/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Jarvis
            </Button>
          </Link>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted">BellasOS</p>
            <h1 className="truncate text-lg font-semibold">{title}</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        <ModuleDetailView moduleId={moduleId} initialProjectId={initialProjectId} />
      </main>
    </div>
  );
}
