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
export class WorkspacesController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get('workspaces')
  async listWorkspaces(
    @Req() req: AuthedRequest,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const workspaces = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.list',
      { status, type },
      callCtx(req),
    );
    return ok({ workspaces }, req.traceId);
  }

  @Post('workspaces')
  async createWorkspace(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const workspace = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.create',
      body,
      callCtx(req),
    );
    return ok({ workspace }, req.traceId);
  }

  @Get('workspaces/:id')
  async getWorkspace(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Query('context') context?: string,
  ) {
    if (context === 'true' || context === '1') {
      const workspaceContext = await this.platform.registry.dispatch(
        'bellasos.workspace',
        'workspace.context.load',
        { workspaceId: id },
        callCtx(req),
      );
      return ok(workspaceContext, req.traceId);
    }
    const workspace = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.get',
      { id },
      callCtx(req),
    );
    return ok({ workspace }, req.traceId);
  }

  @Patch('workspaces/:id')
  async updateWorkspace(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const workspace = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.update',
      { ...body, id },
      callCtx(req),
    );
    return ok({ workspace }, req.traceId);
  }

  @Post('workspaces/:id/activate')
  async activateWorkspace(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.activate',
      { id, ...body },
      callCtx(req),
    );
    return ok(result, req.traceId);
  }

  @Post('workspaces/:id/pause')
  async pauseWorkspace(@Req() req: AuthedRequest, @Param('id') id: string) {
    const workspace = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.pause',
      { id },
      callCtx(req),
    );
    return ok({ workspace }, req.traceId);
  }

  @Post('workspaces/:id/archive')
  async archiveWorkspace(@Req() req: AuthedRequest, @Param('id') id: string) {
    const workspace = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.archive',
      { id },
      callCtx(req),
    );
    return ok({ workspace }, req.traceId);
  }

  @Post('workspaces/:id/restore')
  async restoreWorkspace(@Req() req: AuthedRequest, @Param('id') id: string) {
    const workspace = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.restore',
      { id },
      callCtx(req),
    );
    return ok({ workspace }, req.traceId);
  }

  @Post('workspaces/:id/gather')
  async gatherWorkspace(@Req() req: AuthedRequest, @Param('id') id: string) {
    const result = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.gather',
      { id },
      callCtx(req),
    );
    return ok(result, req.traceId);
  }

  @Get('sessions/active')
  async activeSession(@Req() req: AuthedRequest) {
    const session = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'session.getActive',
      {},
      callCtx(req),
    );
    return ok({ session }, req.traceId);
  }

  @Post('sessions/:id/end')
  async endSession(@Req() req: AuthedRequest, @Param('id') id: string) {
    const session = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'session.end',
      { id },
      callCtx(req),
    );
    return ok({ session }, req.traceId);
  }

  @Get('artifacts')
  async listArtifacts(
    @Req() req: AuthedRequest,
    @Query('workspaceId') workspaceId?: string,
    @Query('kind') kind?: string,
  ) {
    const artifacts = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'artifact.list',
      { workspaceId, kind },
      callCtx(req),
    );
    return ok({ artifacts }, req.traceId);
  }

  @Post('artifacts')
  async createArtifact(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const artifact = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'artifact.create',
      body,
      callCtx(req),
    );
    return ok({ artifact }, req.traceId);
  }

  @Get('artifacts/:id')
  async getArtifact(@Req() req: AuthedRequest, @Param('id') id: string) {
    const artifact = await this.platform.registry.dispatch(
      'bellasos.workspace',
      'artifact.get',
      { id },
      callCtx(req),
    );
    return ok({ artifact }, req.traceId);
  }
}
