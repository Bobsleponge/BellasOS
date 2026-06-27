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
export class GoalsController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get('goals')
  async listGoals(
    @Req() req: AuthedRequest,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('initiativeId') initiativeId?: string,
  ) {
    const goals = await this.platform.registry.dispatch(
      'bellasos.execution',
      'goal.list',
      { status, category, initiativeId },
      callCtx(req),
    );
    return ok({ goals }, req.traceId);
  }

  @Post('goals')
  async createGoal(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const goal = await this.platform.registry.dispatch(
      'bellasos.execution',
      'goal.create',
      body,
      callCtx(req),
    );
    return ok({ goal }, req.traceId);
  }

  @Patch('goals/:id')
  async updateGoal(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const goal = await this.platform.registry.dispatch(
      'bellasos.execution',
      'goal.update',
      { ...body, id },
      callCtx(req),
    );
    return ok({ goal }, req.traceId);
  }

  @Get('goals/progress')
  async goalProgress(@Req() req: AuthedRequest, @Query('application') application?: string) {
    const bundle = await this.platform.registry.dispatch(
      'bellasos.execution',
      'context.load',
      { applicationId: application },
      callCtx(req),
    );
    return ok(bundle, req.traceId);
  }

  @Get('initiatives')
  async listInitiatives(
    @Req() req: AuthedRequest,
    @Query('status') status?: string,
  ) {
    const initiatives = await this.platform.registry.dispatch(
      'bellasos.execution',
      'initiative.list',
      { status },
      callCtx(req),
    );
    return ok({ initiatives }, req.traceId);
  }

  @Post('initiatives')
  async createInitiative(
    @Req() req: AuthedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    const initiative = await this.platform.registry.dispatch(
      'bellasos.execution',
      'initiative.create',
      body,
      callCtx(req),
    );
    return ok({ initiative }, req.traceId);
  }

  @Patch('initiatives/:id')
  async updateInitiative(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const initiative = await this.platform.registry.dispatch(
      'bellasos.execution',
      'initiative.update',
      { ...body, id },
      callCtx(req),
    );
    return ok({ initiative }, req.traceId);
  }
}
