import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ok } from '@bellasos/contracts';
import { getIngestionService } from '@bellasos/core-ingestion';
import type { AuthedRequest } from './auth.guard';

@Controller('ingest')
export class IngestionController {
  @Get('status')
  async status(@Req() req: AuthedRequest) {
    const ingestion = getIngestionService();
    return ok(await ingestion.getStatusAsync(), req.traceId);
  }

  @Get('recent')
  async recent(
    @Req() req: AuthedRequest,
    @Query('limit') limit?: string,
    @Query('sinceHours') sinceHours?: string,
  ) {
    const ingestion = getIngestionService();
    const docs = await ingestion.listRecent({
      limit: limit ? Number(limit) : 30,
      sinceHours: sinceHours ? Number(sinceHours) : 48,
    });
    return ok({ count: docs.length, documents: docs }, req.traceId);
  }

  @Post('collect-all')
  async collectAll(
    @Req() req: AuthedRequest,
    @Body() body: { sectors?: string[]; symbols?: string[] },
  ) {
    const ingestion = getIngestionService();
    const result = await ingestion.runWorldCollection({
      sectors: body.sectors,
      symbols: body.symbols,
    });
    return ok(result, req.traceId);
  }

  @Post('search')
  async search(
    @Req() req: AuthedRequest,
    @Body() body: { query: string; tags?: string[]; maxResults?: number },
  ) {
    const ingestion = getIngestionService();
    const docs = await ingestion.searchAndFetch(
      body.query,
      body.tags ?? [],
      body.maxResults ?? 5,
    );
    return ok({ count: docs.length, documents: docs }, req.traceId);
  }

  @Post('feeds/poll')
  async pollFeeds(
    @Req() req: AuthedRequest,
    @Body() body: { sectors?: string[] },
  ) {
    const ingestion = getIngestionService();
    const sectors = body.sectors ?? [
      'AI',
      'Energy',
      'Mining',
      'Healthcare',
      'Macroeconomics',
    ];
    const docs = await ingestion.pollSectorNews(sectors);
    return ok({ count: docs.length, sectors }, req.traceId);
  }

  @Post('prices/refresh')
  async refreshPrices(
    @Req() req: AuthedRequest,
    @Body() body: { symbols: string[] },
  ) {
    const ingestion = getIngestionService();
    const docs = await ingestion.refreshPrices(body.symbols ?? []);
    return ok({ count: docs.length, documents: docs }, req.traceId);
  }
}
