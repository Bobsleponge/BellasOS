'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const ONBOARDING_KEY = 'bellasos:onboardingSeen';

export function OnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_KEY) !== '1') {
        setVisible(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 flex items-start gap-3">
      <div className="flex-1 text-sm text-white/90">
        <p className="font-medium text-white">Welcome to BellasOS</p>
        <p className="mt-1 text-white/70">
          Talk to Jarvis above, then check your briefing for goals and decisions. Use the app dock
          below to open Wealth, Research, and more.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="text-white/50 hover:text-white shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
