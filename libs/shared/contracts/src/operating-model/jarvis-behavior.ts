/**
 * Jarvis daily operating system behavior specifications.
 */

import type { OperatingMode } from './context';

export const DAY_PHASES = [
  'arrival',
  'execution',
  'intelligence',
  'synthesis',
  'background',
] as const;

export type DayPhase = (typeof DAY_PHASES)[number];

export interface JarvisBehaviorSpec {
  phase: DayPhase;
  jarvisBehavior: string[];
  platformBehavior: string[];
  userActions: string[];
}

export const DAILY_OPERATING_SPECS: JarvisBehaviorSpec[] = [
  {
    phase: 'arrival',
    platformBehavior: [
      'Run overnight background intelligence (feeds, alerts, sync checks).',
      'Assemble daily context into working memory.',
    ],
    jarvisBehavior: [
      'Deliver proactive morning briefing when configured.',
      'Surface pending decisions, approvals, deadlines, and overnight alerts.',
      'Set temporal context to morning/planning.',
    ],
    userActions: [
      'Confirm or reprioritize the day.',
      'Drill into venture, wealth, or research via conversation.',
      'Approve queued automations.',
    ],
  },
  {
    phase: 'execution',
    platformBehavior: [
      'Maintain working memory of open threads.',
      'Execute write actions through external systems of record.',
      'Run scheduled automations (publish, price refresh, alerts).',
    ],
    jarvisBehavior: [
      'Handle ad-hoc requests and delegate to specialists.',
      'Context-switch cleanly between personal and venture scopes.',
      'Capture decisions and significant notes into memory.',
      'Confirm write actions per approval matrix.',
    ],
    userActions: [
      'Conduct research and brainstorming via conversation.',
      'Manage projects through venture apps or Jarvis orchestration.',
      'Log financial events through Finance Tracker via Jarvis.',
      'Control environment via voice, gesture, or automation.',
    ],
  },
  {
    phase: 'intelligence',
    platformBehavior: [
      'Monitor topics tied to ventures and wealth.',
      'Evaluate alert rules and ingestion signals.',
      'Notify when async research completes.',
    ],
    jarvisBehavior: [
      'Deliver intelligence in context with cross-domain impact.',
      'Link intelligence to decisions and goals proactively.',
      'Interrupt only when attention context warrants.',
    ],
    userActions: [
      'Consume briefings and alerts conversationally.',
      'Ask follow-up research or wealth impact questions.',
    ],
  },
  {
    phase: 'synthesis',
    platformBehavior: [
      'Review working memory for completed and slipped items.',
      'Capture significant events into episodic memory.',
      'Seed tomorrow working memory.',
    ],
    jarvisBehavior: [
      'Offer optional evening review of what moved today.',
      'Prompt for decision capture if choices were discussed but not recorded.',
      'Clear stale focus context.',
    ],
    userActions: [
      'Confirm decisions and priorities for tomorrow.',
      'Close or defer open threads.',
    ],
  },
  {
    phase: 'background',
    platformBehavior: [
      'Worker runs briefing prep, feed collection, portfolio sync, publish due.',
      'Update knowledge memory from new intelligence.',
      'Revalidate graph resource refs per freshness policy.',
    ],
    jarvisBehavior: [
      'No proactive user interruption unless critical alert threshold met.',
    ],
    userActions: [],
  },
];

export interface OperatingModeSpec {
  mode: OperatingMode;
  domainEmphasis: string[];
  jarvisPosture: string;
}

export const OPERATING_MODE_SPECS: OperatingModeSpec[] = [
  {
    mode: 'general',
    domainEmphasis: ['life', 'ventures', 'wealth', 'knowledge', 'execution'],
    jarvisPosture:
      'Fully adaptable — route to any specialist as needed. No domain assumed until the user steers or context is clear.',
  },
  {
    mode: 'personal',
    domainEmphasis: ['life', 'relationships', 'environment'],
    jarvisPosture: 'Shorter responses, minimal venture context unless asked.',
  },
  {
    mode: 'business',
    domainEmphasis: ['ventures', 'execution', 'communications'],
    jarvisPosture: 'Venture-aware, action-oriented, cross-venture synthesis available.',
  },
  {
    mode: 'wealth',
    domainEmphasis: ['wealth', 'intelligence'],
    jarvisPosture: 'Precise numbers, live Finance Tracker queries, decision memory aware.',
  },
  {
    mode: 'research',
    domainEmphasis: ['knowledge', 'intelligence'],
    jarvisPosture: 'Deep, citation-rich, topic graph aware.',
  },
  {
    mode: 'focus',
    domainEmphasis: ['execution'],
    jarvisPosture: 'Narrow context stack, minimal interruption, single project or goal.',
  },
  {
    mode: 'operator',
    domainEmphasis: ['systems', 'automation'],
    jarvisPosture: 'Diagnostics and integration health - not default user experience.',
  },
];

/** Five simultaneous lives BellasOS integrates into one narrative. */
export const LIFE_DIMENSIONS = [
  'personal_life',
  'financial_life',
  'business_life',
  'intellectual_life',
  'digital_life',
] as const;

export type LifeDimension = (typeof LIFE_DIMENSIONS)[number];

export const LIFE_DIMENSION_DOMAINS: Record<LifeDimension, string[]> = {
  personal_life: ['life', 'relationships', 'environment'],
  financial_life: ['wealth'],
  business_life: ['ventures', 'execution', 'communications'],
  intellectual_life: ['knowledge', 'intelligence'],
  digital_life: ['systems', 'automation', 'applications'],
};
