import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ok, type CallContext } from '@bellasos/contracts';
import { renderMetrics } from '@bellasos/observability';
import { PLATFORM, type Platform } from './platform.token';
import { Public, type AuthedRequest } from './auth.guard';
import { resolveProviderStatuses } from './ai-provider-utils';

function callCtx(req: AuthedRequest): CallContext {
  return { principal: req.principal, traceId: req.traceId };
}

@Controller()
export class HealthController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Public()
  @Get('health')
  health(@Req() req: AuthedRequest) {
    return ok(this.platform.health(), req.traceId);
  }

  @Public()
  @Get('metrics')
  async metrics(@Res() res: Response) {
    res.setHeader('content-type', 'text/plain; version=0.0.4');
    res.send(await renderMetrics());
  }
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Public()
  @Post('dev-token')
  async devToken(
    @Req() req: AuthedRequest,
    @Body() body: { sub?: string; roles?: string[]; name?: string },
  ) {
    const token = await this.platform.auth.issueDevToken({
      sub: body.sub ?? '00000000-0000-0000-0000-000000000001',
      name: body.name ?? 'Dev User',
      roles: body.roles ?? ['admin'],
    });
    return ok({ token }, req.traceId);
  }

  @Get('me')
  me(@Req() req: AuthedRequest) {
    return ok(req.principal, req.traceId);
  }
}

@Controller('modules')
export class ModulesController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return ok(this.platform.registry.list(), req.traceId);
  }

  @Post(':id/enable')
  async enable(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.platform.registry.enable(id);
    return ok({ id, status: 'enabled' }, req.traceId);
  }

  @Post(':id/disable')
  async disable(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.platform.registry.disable(id);
    return ok({ id, status: 'disabled' }, req.traceId);
  }

  @Post(':id/actions/:action')
  async invoke(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('action') action: string,
    @Body() body: unknown,
  ) {
    const result = await this.platform.registry.dispatch(
      id,
      action,
      body,
      callCtx(req),
    );
    return ok(result, req.traceId);
  }
}

@Controller('widgets')
export class WidgetsController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return ok(this.platform.registry.widgets(), req.traceId);
  }
}

@Controller('agents')
export class AgentsController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return ok(this.platform.orchestrator.agentInfos(), req.traceId);
  }

  @Get('runs')
  runs(@Req() req: AuthedRequest) {
    return ok(this.platform.orchestrator.recentRuns(), req.traceId);
  }

  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body() body: { name: string; role: string; taskType?: string },
  ) {
    const info = await this.platform.orchestrator.createAgent({
      name: body.name,
      role: body.role,
      taskType: body.taskType,
    });
    return ok(info, req.traceId);
  }

  @Delete(':name')
  async remove(@Req() req: AuthedRequest, @Param('name') name: string) {
    const removed = await this.platform.orchestrator.removeAgent(name);
    return ok({ removed }, req.traceId);
  }

  @Post('command')
  async command(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      agentType: string;
      prompt?: string;
      taskType?: string;
      input?: Record<string, unknown>;
    },
  ) {
    const result = await this.platform.orchestrator.command({
      agentType: body.agentType,
      prompt: body.prompt,
      taskType: body.taskType,
      input: body.input ?? {},
      traceId: req.traceId,
      actorId: req.principal.id,
    });
    return ok(result, req.traceId);
  }
}

@Controller('ai')
export class AiController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get('models')
  models(@Req() req: AuthedRequest) {
    return ok(this.platform.ai.listAllModels(), req.traceId);
  }

  @Get('providers')
  async providers(@Req() req: AuthedRequest) {
    const statuses = await resolveProviderStatuses(
      this.platform.ai,
      this.platform.config,
    );
    return ok(statuses, req.traceId);
  }

  @Post('discover')
  async discover(@Req() req: AuthedRequest) {
    const models = await this.platform.ai.refreshModels();
    return ok(models, req.traceId);
  }

  @Post('models')
  async registerModel(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      id: string;
      provider: string;
      displayName: string;
      capabilities?: string[];
      contextWindow?: number;
      cost?: { inputPerMTokensUsd: number; outputPerMTokensUsd: number };
      local?: boolean;
      enabled?: boolean;
    },
  ) {
    const models = await this.platform.ai.registerModel({
      id: body.id,
      provider: body.provider as never,
      displayName: body.displayName,
      capabilities: (body.capabilities ?? ['chat']) as never,
      contextWindow: body.contextWindow ?? 8192,
      cost: body.cost ?? { inputPerMTokensUsd: 0, outputPerMTokensUsd: 0 },
      local: body.local ?? false,
      enabled: body.enabled ?? true,
    });
    return ok(models, req.traceId);
  }

  @Post('models/:id/enable')
  async enableModel(@Req() req: AuthedRequest, @Param('id') id: string) {
    return ok(await this.platform.ai.enableModel(id), req.traceId);
  }

  @Post('models/:id/disable')
  async disableModel(@Req() req: AuthedRequest, @Param('id') id: string) {
    return ok(await this.platform.ai.disableModel(id), req.traceId);
  }

  @Post('complete')
  async complete(
    @Req() req: AuthedRequest,
    @Body() body: { prompt: string; taskType?: string; model?: string },
  ) {
    const res = await this.platform.ai.complete({
      messages: [{ role: 'user', content: body.prompt }],
      taskType: body.taskType as never,
      model: body.model,
      traceId: req.traceId,
    });
    return ok(res, req.traceId);
  }
}

@Controller('memory')
export class MemoryController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Post('remember')
  async remember(
    @Req() req: AuthedRequest,
    @Body()
    body: { content: string; tier?: 'short' | 'working' | 'long'; tags?: string[] },
  ) {
    const item = await this.platform.memory.remember({
      tier: body.tier ?? 'long',
      ownerId: req.principal.id,
      content: body.content,
      tags: body.tags,
    });
    return ok(item, req.traceId);
  }

  @Post('recall')
  async recall(
    @Req() req: AuthedRequest,
    @Body()
    body: { query: string; tier?: 'short' | 'working' | 'long'; limit?: number },
  ) {
    const hits = await this.platform.memory.recall({
      ownerId: req.principal.id,
      query: body.query,
      tier: body.tier,
      limit: body.limit,
    });
    return ok(hits, req.traceId);
  }
}

@Controller()
export class PlatformController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get('audit')
  audit(@Req() req: AuthedRequest) {
    return ok(this.platform.audit.recent(), req.traceId);
  }

  @Get('notifications')
  async notifications(@Req() req: AuthedRequest) {
    return ok(
      await this.platform.notifications.list(req.principal.id),
      req.traceId,
    );
  }

  @Get('approvals')
  async approvals(@Req() req: AuthedRequest) {
    return ok(await this.platform.approvals.pending(), req.traceId);
  }

  @Post('approvals/:id/resolve')
  async resolve(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { decision: 'approved' | 'rejected'; reason?: string },
  ) {
    const approval = await this.platform.approvals.resolve(
      id,
      body.decision,
      req.principal.id,
      body.reason,
    );
    let result: unknown;
    if (approval && body.decision === 'approved') {
      result = await this.platform.registry.dispatch(
        approval.moduleId,
        approval.action,
        approval.input,
        callCtx(req),
        { skipApproval: true },
      );
    }
    return ok({ approval, result }, req.traceId);
  }
}

export const CONTROLLERS = [
  HealthController,
  AuthController,
  ModulesController,
  WidgetsController,
  AgentsController,
  AiController,
  MemoryController,
  PlatformController,
];

export { JarvisController } from './jarvis.controller';
export { PLATFORM_CONTROLLERS } from './platform.controllers';
