type AckKind =
  | 'coding_build'
  | 'coding_fix'
  | 'research'
  | 'task'
  | 'question'
  | 'general';

const POOLS: Record<AckKind, string[]> = {
  coding_build: [
    "Great idea - I'll build that for you. This may take a minute.",
    'Love it. Let me put that together in Coding Studio.',
    'On it - generating that now. Give me a moment.',
  ],
  coding_fix: [
    "Got it - I'll update your project with that fix.",
    'Understood. Let me apply that change to your code.',
    'Good catch - working on that edit now.',
  ],
  research: [
    "That's a great question - let me research that properly.",
    "Interesting - I'll dig into that for you.",
    'Good one. Give me a moment to pull that together.',
  ],
  task: [
    "On it - I'm working on that now.",
    'Sure thing - let me handle that.',
    'Got you - give me a few seconds.',
  ],
  question: [
    'Good question - let me think that through.',
    "That's worth a proper answer. One moment.",
    'Let me work through that for you.',
  ],
  general: [
    'Understood - give me a moment.',
    'Let me take care of that.',
    'Working on it now.',
  ],
};

function classifyAckKind(message: string): AckKind | null {
  const m = message.toLowerCase().trim();
  if (!m) return null;
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|stop|cancel|test)\b/.test(m)) return null;
  if (/^(open|show|launch|go to)\s/.test(m)) return null;
  if (m.length < 10 && !m.includes('?')) return null;

  const financeWrite =
    /\b(smart transaction)\b/i.test(m) ||
    (/\b(transaction|buy|purchase|invest|record)\b/i.test(m) &&
      /\b(stock|share|shares|rand|\d[\d,]*\s*r\b|spacex|nvidia|intel|apple)\b/i.test(m)) ||
    (/\b(make|do|create)\b/i.test(m) &&
      /\b(smart transaction|transaction)\b/i.test(m));
  if (financeWrite) return 'task';

  const refine =
    /\b(fix|update|edit|change|modify|adjust|improve|refine|tweak|arrow keys|keydown|preventdefault|doesn't work|not working|broken)\b/i.test(
      m,
    );
  const build =
    /\b(build|create|make|write|develop|implement|game|snake|html|app|playable)\b/i.test(m) &&
    !refine;
  if (refine && /\b(game|snake|code|project|app|html|it|this|that)\b/i.test(m)) return 'coding_fix';
  if (build) return 'coding_build';

  if (/\b(research|analyze|analysis|compare|investigate|briefing|report|company|stock|sector)\b/i.test(m)) {
    return 'research';
  }
  if (
    /\b(portfolio|order|draft|post|schedule|automation|device|briefing|code|build)\b/i.test(m) ||
    (/\b(transaction|buy|purchase|invest)\b/i.test(m) &&
      /\b(stock|share|shares|nvidia|nvda|apple|aapl|\d+\s*(rand|r\b))\b/i.test(m))
  ) {
    return 'task';
  }
  if (/\?/.test(m) || /\b(how|why|what|when|where|who|explain|tell me)\b/i.test(m)) {
    return 'question';
  }
  if (m.length > 40) return 'general';
  return 'question';
}

export function pickJarvisAcknowledgment(message: string): string | null {
  const kind = classifyAckKind(message);
  if (!kind) return null;
  const pool = POOLS[kind];
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}