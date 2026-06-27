import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ok } from '@bellasos/contracts';
import { PLATFORM, type Platform } from './platform.token';
import type { AuthedRequest } from './auth.guard';

function callCtx(req: AuthedRequest) {
  return { principal: req.principal, traceId: req.traceId };
}

@Controller()
export class DecisionsController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get('decisions')
  async listDecisions(
    @Req() req: AuthedRequest,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('goalId') goalId?: string,
    @Query('initiativeId') initiativeId?: string,
  ) {
    const decisions = await this.platform.registry.dispatch(
      'bellasos.execution',
      'decision.list',
      { status, category, goalId, initiativeId },
      callCtx(req),
    );
    return ok({ decisions }, req.traceId);
  }

  @Get('decisions/recommendations')
  async recommendations(
    @Req() req: AuthedRequest,
    @Query('application') application?: string,
  ) {
    const context = await this.platform.registry.dispatch(
      'bellasos.execution',
      'decision.context.load',
      { applicationId: application },
      callCtx(req),
    );
    return ok({ context }, req.traceId);
  }

  @Post('decisions')
  async createDecision(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const decision = await this.platform.registry.dispatch(
      'bellasos.execution',
      'decision.create',
      body,
      callCtx(req),
    );
    return ok({ decision }, req.traceId);
  }

  @Patch('decisions/:id')
  async updateDecision(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const decision = await this.platform.registry.dispatch(
      'bellasos.execution',
      'decision.update',
      { ...body, id },
      callCtx(req),
    );
    return ok({ decision }, req.traceId);
  }

  @Post('decisions/:id/commit')
  async commitDecision(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const decision = await this.platform.registry.dispatch(
      'bellasos.execution',
      'decision.commit',
      { ...body, id },
      callCtx(req),
    );
    return ok({ decision }, req.traceId);
  }

  @Post('decisions/:id/outcome')
  async recordOutcome(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const outcome = await this.platform.registry.dispatch(
      'bellasos.execution',
      'decision.outcome.record',
      { ...body, decisionId: id },
      callCtx(req),
    );
    return ok({ outcome }, req.traceId);
  }

  @Get('decisions/:id/reviews')
  async listReviews(@Req() req: AuthedRequest, @Param('id') id: string) {
    const reviews = await this.platform.registry.dispatch(
      'bellasos.execution',
      'decision.review.list',
      { decisionId: id },
      callCtx(req),
    );
    return ok({ reviews }, req.traceId);
  }

  @Post('decisions/:id/reviews')
  async scheduleReview(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const review = await this.platform.registry.dispatch(
      'bellasos.execution',
      'decision.review.schedule',
      { ...body, decisionId: id },
      callCtx(req),
    );
    return ok({ review }, req.traceId);
  }
}
