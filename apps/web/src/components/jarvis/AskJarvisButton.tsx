'use client';

import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJarvisSession } from '@/hooks/useJarvisSession';

type Props = {
  prompt: string;
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm';
  className?: string;
};

export function AskJarvisButton({
  prompt,
  children,
  variant = 'default',
  size = 'sm',
  className,
}: Props) {
  const { sendMessage } = useJarvisSession();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => void sendMessage(prompt, 'text')}
    >
      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
      {children}
    </Button>
  );
}
