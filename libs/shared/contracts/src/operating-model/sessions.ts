/**
 * Focus sessions - what the user is working on right now.
 * Distinct from Jarvis chat sessions (jarvis.sessions).
 */

import type { EntityRef } from './entities';

export const FOCUS_KINDS = [
  'research',
  'project',
  'decision',
  'analysis',
  'planning',
  'general',
] as const;

export type FocusKind = (typeof FOCUS_KINDS)[number];

export const FOCUS_SESSION_STATUSES = ['active', 'paused', 'ended'] as const;

export type FocusSessionStatus = (typeof FOCUS_SESSION_STATUSES)[number];

export interface FocusSession {
  id: string;
  workspaceId?: string;
  focusKind: FocusKind;
  focusEntity?: EntityRef;
  jarvisSessionId?: string;
  applicationId?: string;
  status: FocusSessionStatus;
  summary?: string;
  ownerId: string;
  startedAt: string;
  endedAt?: string;
}
