import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ok, type CallContext } from '@bellasos/contracts';
import { buildTodaySnapshot } from '@bellasos/core-jarvis-intelligence';
import { PLATFORM, type Platform } from './platform.token';
import type { AuthedRequest } from './auth.guard';

export type TodayItemKind =
  | 'approval'
  | 'alert'
  | 'intelligence'
  | 'wealth'
  | 'activity'
  | 'priority'
  | 'goal'
  | 'decision'
  | 'world'
  | 'workspace';

export interface TodayItem {
  id: string;
  kind: TodayItemKind;
  title: string;
  subtitle?: string;
  href?: string;
  actionLabel?: string;
  createdAt?: string;
  priority: number;
}

export interface TodayFeed {
  greeting: string;
  contextLine?: string;
  items: TodayItem[];
  connection: { status: 'connected' | 'degraded' | 'offline'; label: string };
  generatedAt: string;
}

interface CacheEntry {
  expiresAt: number;
  feed: TodayFeed;
}

const CACHE_TTL_MS = 60_000;
const feedCache = new Map<string, CacheEntry>();

function callCtx(req: AuthedRequest): CallContext {
  return { principal: req.principal, traceId: req.traceId };
}

@Controller()
export class TodayController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get('today')
  async today(
    @Req() req: AuthedRequest,
    @Query('application') application?: string,
    @Query('mode') mode?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const cacheKey = `${req.principal.id}:${application ?? ''}:${mode ?? ''}:${workspaceId ?? ''}`;
    const cached = feedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return ok(cached.feed, req.traceId);
    }

    const { todayFeed } = await buildTodaySnapshot({
      platform: this.platform,
      ctx: callCtx(req),
      contextInput: {
        applicationId: application,
        operatingMode: mode,
        workspaceId,
        principalDisplayName: req.principal.displayName,
      },
    });

    feedCache.set(cacheKey, { feed: todayFeed, expiresAt: Date.now() + CACHE_TTL_MS });
    return ok(todayFeed, req.traceId);
  }
}
