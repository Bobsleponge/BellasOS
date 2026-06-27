import { Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ok, type CallContext } from '@bellasos/contracts';
import { buildWorldSnapshot } from '@bellasos/core-jarvis-intelligence';
import { getIngestionService } from '@bellasos/core-ingestion';
import { PLATFORM, type Platform } from './platform.token';
import type { AuthedRequest } from './auth.guard';

function callCtx(req: AuthedRequest): CallContext {
  return { principal: req.principal, traceId: req.traceId };
}

@Controller('world')
export class WorldController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get('signals')
  async signals(
    @Req() req: AuthedRequest,
    @Query('sector') sector?: string,
    @Query('sinceHours') sinceHours?: string,
  ) {
    const snapshot = await buildWorldSnapshot({
      platform: this.platform,
      ctx: callCtx(req),
      contextInput: {
        principalDisplayName: req.principal.displayName,
      },
    });

    let signals = snapshot.signals;
    if (sector) {
      const normalized = sector.toLowerCase().replace(/\s+/g, '_');
      signals = signals.filter((s) => s.worldSignal?.sector === normalized);
    }
    if (sinceHours) {
      const cutoff = Date.now() - Number(sinceHours) * 3_600_000;
      signals = signals.filter((s) => {
        const at = s.worldSignal?.fetchedAt ?? s.createdAt;
        return at ? Date.parse(at) >= cutoff : true;
      });
    }

    return ok({ count: signals.length, signals }, req.traceId);
  }

  @Get('trends')
  async trends(@Req() req: AuthedRequest) {
    const snapshot = await buildWorldSnapshot({
      platform: this.platform,
      ctx: callCtx(req),
      contextInput: {
        principalDisplayName: req.principal.displayName,
      },
    });
    return ok({ trends: snapshot.trends }, req.traceId);
  }

  @Get('relevance/:ingestDocId')
  async relevance(@Req() req: AuthedRequest, @Param('ingestDocId') ingestDocId: string) {
    const snapshot = await buildWorldSnapshot({
      platform: this.platform,
      ctx: callCtx(req),
      contextInput: {
        principalDisplayName: req.principal.displayName,
      },
    });
    const signal = snapshot.signals.find(
      (s) => s.worldSignal?.ingestDocId === ingestDocId || s.id === `world:${ingestDocId}`,
    );
    if (!signal) {
      return ok({ found: false }, req.traceId);
    }
    return ok(
      {
        found: true,
        ingestDocId,
        relevance: signal.worldRelevance,
        opportunity: signal.worldOpportunity,
        signal,
      },
      req.traceId,
    );
  }

  @Post('collect')
  async collect(
    @Req() req: AuthedRequest,
    @Query('sectors') sectorsParam?: string,
    @Query('symbols') symbolsParam?: string,
  ) {
    const ingestion = getIngestionService();
    const sectors = sectorsParam?.split(',').map((s) => s.trim()).filter(Boolean);
    const symbols = symbolsParam?.split(',').map((s) => s.trim()).filter(Boolean);
    const result = await ingestion.runWorldCollection({ sectors, symbols });

    try {
      await this.platform.registry.dispatch(
        'bellasos.intelligence',
        'world.memory.summarize',
        { rhythm: 'morning' },
        callCtx(req),
      );
    } catch {
      /* optional rollup */
    }

    return ok(result, req.traceId);
  }
}
