'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConsoleNavigation } from '@/hooks/useConsoleNavigation';
import { applicationLabel } from '@/lib/applications';

export function JarvisSuggestedAppButton({ appId }: { appId: string }) {
  const { navigateToApp } = useConsoleNavigation();
  const label = applicationLabel(appId);

  return (
    <Button
      type="button"
      variant="glass"
      size="sm"
      className="mt-2 h-8 text-xs"
      onClick={() => navigateToApp(appId)}
    >
      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
      Open {label}
    </Button>
  );
}
