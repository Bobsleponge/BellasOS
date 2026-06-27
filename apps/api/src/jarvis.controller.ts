import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ok, resolveJarvisOpenAppIds, type CallContext, type CompletionRequest } from '@bellasos/contracts';
import {
  buildIntelligenceBundle,
  formatContextForPrompt,
  loadDecisionContext,
  loadGoalContext,
  loadWorkspaceContext,
  formatReplyScopeForPrompt,
  looksLikeBriefingRequest,
  resolveAdaptiveModeSwitch,
  resolveContextStack,
  resolveOperatingModeForContext,
  rhythmFromHour,
  type BriefingRhythm,
} from '@bellasos/core-jarvis-intelligence';
import { getIngestionService } from '@bellasos/core-ingestion';
import {
  hybridIntentAiRequest,
  jarvisExecuteRequest,
  runHybridJarvisChat,
} from './jarvis-hybrid.runner';
import { sanitizeJarvisReply, shouldRejectVoiceTranscript, voiceMishearReply } from './transcript-guard';
import { PLATFORM, type Platform } from './platform.token';
import type { AuthedRequest } from './auth.guard';
import { getJarvisSessionStore } from './jarvis-sessions.service';
import {
  appendAppOffer,
  contextualUserMessage,
  defaultOpenAppForAgent,
  looksLikeFinanceWrite,
  looksLikeFinanceAdvisory,
  looksLikeRouterJsonLeak,
  resolveAgentType,
  resolveJarvisAppNavigation,
} from './jarvis-orchestrator';
import {
  buildJarvisIntentPrompt,
  formatClarificationReply,
  looksLikeIntentJsonLeak,
  looksLikeWorkspaceIntent,
  normalizeIntentAnalysis,
  parseJarvisIntentJson,
  shouldAskForClarification,
  type JarvisIntentAnalysis,
} from './jarvis-intent';
import { jarvisChatSystemPrompt } from './jarvis-acknowledgments';
import {
  extractFinanceText,
  friendlyFinanceConnectionError,
  resolveFinanceReplyDetail,
  withFinanceAttribution,
} from './finance-reply';
import { runJarvisCognition, runJarvisAdvisoryFallback, matchAdvisoryPlaybook } from './jarvis-cognition.runner';
import { synthesizeSpeech } from './tts.service';

function callCtx(req: AuthedRequest): CallContext {
  return { principal: req.principal, traceId: req.traceId };
}

function isFinanceWriteSuccess(data: unknown): boolean {
  const out = (data as { output?: Record<string, unknown> })?.output ?? data;
  if (!out || typeof out !== 'object') return false;
  const o = out as Record<string, unknown>;
  if (typeof o.error === 'string' && o.error.trim()) return false;
  if (o.needsClarification) return false;
  if (o.recorded != null) return true;
  if (o.action === 'investments.add' && typeof o.message === 'string' && /^done/i.test(o.message.trim())) {
    return true;
  }
  return false;
}

function financeReply(result: unknown, userMessage: string): string {
  const detail = resolveFinanceReplyDetail(userMessage);
  return withFinanceAttribution(extractFinanceText(result, userMessage), result, detail);
}

function replyScopeDomain(operatingMode?: string, applicationId?: string): string | undefined {
  const mode = resolveOperatingModeForContext({ operatingMode, applicationId });
  switch (mode) {
    case 'wealth':
      return 'wealth';
    case 'research':
      return 'research';
    case 'business':
      return 'business';
    case 'focus':
      return 'focus';
    case 'personal':
      return 'personal';
    default:
      return undefined;
  }
}

function parseRhythm(value?: string): BriefingRhythm {
  if (
    value === 'morning' ||
    value === 'midday' ||
    value === 'evening' ||
    value === 'night'
  ) {
    return value;
  }
  return rhythmFromHour(new Date().getHours());
}

function fastChatReply(message: string): string | null {
  const m = message.toLowerCase().trim();
  if (/^(hi|hello|hey)\b/.test(m)) return "Hello. I'm here and listening.";
  if (/can you hear me|do you hear me|are you there|you there|hear me/.test(m)) {
    return 'Yes — I can hear you loud and clear.';
  }
  if (/^(thanks|thank you)\b/.test(m)) return "You're welcome.";
  if (/^(test|testing)\b/.test(m)) return 'Test received. Voice and chat are working.';
  return null;
}

function codingProjectIdFromResult(data: unknown): string | undefined {
  const out = (data as { output?: unknown })?.output ?? data;
  if (out && typeof out === 'object') {
    const project = (out as { project?: { id?: string } }).project;
    if (typeof project?.id === 'string') return project.id;
  }
  return undefined;
}

function jarvisAiRequest(
  platform: Platform,
  message: string,
  partial: Omit<CompletionRequest, 'messages' | 'model' | 'taskType' | 'maxTokens' | 'temperature'>,
  opts?: { forceTier?: 'fast' | 'standard' | 'deep' },
): Omit<CompletionRequest, 'messages'> {
  return jarvisExecuteRequest(platform, message, partial, opts);
}

@Controller('jarvis')
export class JarvisController {
  private readonly sessions = getJarvisSessionStore();

  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get('sessions')
  async listSessions(@Req() req: AuthedRequest) {
    const sessions = await this.sessions.listSessions(req.principal.id);
    return ok({ sessions }, req.traceId);
  }

  @Post('sessions')
  async createSession(@Req() req: AuthedRequest) {
    const session = await this.sessions.createSession(req.principal.id);
    return ok({ session }, req.traceId);
  }

  @Get('sessions/:id')
  async getSession(@Req() req: AuthedRequest, @Param('id') id: string) {
    const data = await this.sessions.getSession(req.principal.id, id);
    if (!data) throw new NotFoundException('Session not found');
    return ok(data, req.traceId);
  }

  @Get('briefing')
  async briefing(
    @Req() req: AuthedRequest,
    @Query('rhythm') rhythmParam?: string,
    @Query('application') application?: string,
    @Query('mode') mode?: string,
    @Query('codingProjectId') codingProjectId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('deep') deep?: string,
    @Query('persist') persist?: string,
  ) {
    const rhythm = parseRhythm(rhythmParam);
    const bundle = await buildIntelligenceBundle({
      platform: this.platform,
      ctx: callCtx(req),
      rhythm,
      deep: deep === 'true' || deep === '1',
      contextInput: {
        sessionId,
        applicationId: application,
        operatingMode: mode,
        codingProjectId,
        workspaceId,
        principalDisplayName: req.principal.displayName,
      },
    });

    if (persist === 'true' || persist === '1') {
      let sid = sessionId?.trim();
      if (!sid || !(await this.sessions.assertSession(req.principal.id, sid))) {
        const created = await this.sessions.createSession(req.principal.id);
        sid = created.id;
      }
      const existing = await this.sessions.getSession(req.principal.id, sid!);
      if (!existing?.messages.length) {
        await this.sessions.appendExchange(
          req.principal.id,
          sid!,
          '[arrival]',
          bundle.transcript,
        );
      }
    }

    return ok(
      {
        briefing: bundle.briefing,
        todayItems: bundle.todayItems,
        transcript: bundle.transcript,
        goalProgress: bundle.goalProgress,
        strategicInsights: bundle.strategicInsights,
        decisionRecommendations: bundle.decisionRecommendations,
        openDecisions: bundle.openDecisions,
        nextActions: bundle.nextActions,
        worldPulse: bundle.briefing.worldPulse,
        worldTrends: bundle.briefing.worldTrends,
        externalHighlights: bundle.externalHighlights,
        workspaceProgress: bundle.workspaceProgress,
        sessionId: sessionId ?? undefined,
      },
      req.traceId,
    );
  }

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(
    @Req() req: AuthedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      return ok({ text: '' }, req.traceId);
    }
    try {
      const text = await transcribeWav(file.buffer);
      return ok({ text }, req.traceId);
    } catch (err) {
      return ok(
        {
          text: '',
          error: (err as Error).message || 'Transcription failed',
        },
        req.traceId,
      );
    }
  }

  @Post('warmup-stt')
  warmupStt(@Req() req: AuthedRequest) {
    warmupTranscriber();
    return ok({ status: 'warming' }, req.traceId);
  }

  @Post('speak')
  async speak(@Req() req: AuthedRequest, @Body() body: { text?: string }) {
    const text = body.text?.trim() ?? '';
    const result = await synthesizeSpeech(text);
    return ok(result, req.traceId);
  }

  private async buildChatContextBlock(
    input: {
      sessionId?: string;
      applicationId?: string;
      operatingMode?: string;
      codingProjectId?: string;
      workspaceId?: string;
    },
    ctx: CallContext,
  ): Promise<string> {
    const [goalContext, decisionContext, workspaceContext] = await Promise.all([
      loadGoalContext(this.platform, ctx, input.applicationId),
      loadDecisionContext(this.platform, ctx, input.applicationId),
      loadWorkspaceContext(this.platform, ctx, input.workspaceId),
    ]);
    const stack = resolveContextStack({
      sessionId: input.sessionId,
      applicationId: input.applicationId,
      operatingMode: input.operatingMode,
      codingProjectId: input.codingProjectId,
      goalContext,
      decisionContext,
      workspaceContext: workspaceContext ?? undefined,
    });
    return formatContextForPrompt(
      stack,
      goalContext,
      decisionContext,
      undefined,
      workspaceContext,
      input.applicationId,
    );
  }

  private async analyzeIntent(
    message: string,
    historyBlock: string,
    activeCodingProjectId: string | undefined,
    traceId: string,
    contextBlock?: string,
    operatingMode?: string,
  ): Promise<JarvisIntentAnalysis | null> {
    const agentInfos = this.platform.orchestrator.agentInfos();
    const agents = this.platform.orchestrator.listAgents();
    const modules = this.platform.registry.list().map((m) => m.manifest.id);

    const prompt = buildJarvisIntentPrompt({
      message,
      agents: agentInfos,
      moduleIds: modules,
      moduleApps: resolveJarvisOpenAppIds(),
      historyBlock: historyBlock || undefined,
      activeCodingProjectId,
      contextBlock,
      operatingMode,
    });

    const intentAi =
      (await hybridIntentAiRequest(this.platform, message, traceId)) ??
      jarvisAiRequest(this.platform, message, { traceId }, { forceTier: 'fast' });

    const routed = await this.platform.ai.complete({
      ...intentAi,
      messages: [
        { role: 'system', content: 'Return only JSON for intent analysis.' },
        { role: 'user', content: prompt },
      ],
    });

    const parsed = parseJarvisIntentJson(routed.text);
    if (!parsed) return null;
    return normalizeIntentAnalysis(parsed, agents, modules, message, historyBlock);
  }

  private async runGeneralChat(
    message: string,
    historyMessages: Awaited<ReturnType<ReturnType<typeof getJarvisSessionStore>['getChatHistory']>>,
    historyBlock: string,
    traceId: string,
    source?: 'voice' | 'text',
    clientAck?: boolean,
    contextBlock?: string,
    replyScopeBlock?: string,
  ): Promise<{ reply: string; extra: Record<string, unknown> }> {
    const ingestion = getIngestionService();
    const fast = await ingestion.tryFastAnswer(message);
    if (fast) {
      return {
        reply: fast.reply,
        extra: { dataAsOf: fast.dataAsOf, sources: fast.sources },
      };
    }

    let ctxBlock: string | undefined;
    let sources: Array<{ url?: string; title: string; fetchedAt: string; source?: string }> = [];
    let dataAsOf: string | undefined;
    if (ingestion.needsLiveLookup(message)) {
      const ctx = await ingestion.getContextForQuery(message, ['jarvis'], { maxDocs: 3 });
      ctxBlock = ctx.docs.length > 0 ? ctx.promptBlock : undefined;
      sources = ctx.sources.slice(0, 3);
      dataAsOf = ctx.fetchedAt;
    }

    const systemPrompt = jarvisChatSystemPrompt(source, clientAck, contextBlock, replyScopeBlock);
    const userContent = contextualUserMessage(
      message,
      '',
      ctxBlock ? `Relevant context:\n${ctxBlock}` : undefined,
    );

    const hybrid = await runHybridJarvisChat(this.platform, {
      message,
      traceId,
      historyBlock,
      contextBlock,
      systemPrompt,
      historyMessages,
      userContent,
    });

    if (hybrid) {
      return {
        reply: hybrid.text,
        extra: {
          dataAsOf,
          sources,
          hybridLead: true,
          hybridProfile: hybrid.meta.profile,
          guideModel: hybrid.meta.leadModel,
          executeModel: hybrid.meta.executeModel,
          reviewModel: hybrid.meta.reviewModel,
          synthesisModel: hybrid.meta.synthesisModel,
          reviewLoops: hybrid.meta.reviewLoops,
          reviewPassed: hybrid.meta.reviewPassed,
          synthesized: hybrid.meta.synthesized,
          taskBrief: hybrid.brief,
        },
      };
    }

    const chat = await this.platform.ai.complete({
      ...jarvisAiRequest(this.platform, message, { traceId }),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...historyMessages,
        {
          role: 'user',
          content: userContent,
        },
      ],
    });
    return {
      reply: chat.text.trim(),
      extra: { dataAsOf, sources },
    };
  }

  @Post('chat')
  async chat(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      message: string;
      sessionId?: string;
      source?: 'voice' | 'text';
      codingProjectId?: string;
      clientAck?: boolean;
      application?: string;
      mode?: string;
      modeManual?: boolean;
      workspaceId?: string;
    },
  ) {
    let sessionId = body.sessionId?.trim();
    if (!sessionId || !(await this.sessions.assertSession(req.principal.id, sessionId))) {
      const created = await this.sessions.createSession(req.principal.id);
      sessionId = created.id;
    }

    const message = body.message?.trim();
    if (!message) {
      return ok(
        { reply: 'Say something and I will help.', state: 'completed', sessionId },
        req.traceId,
      );
    }

    const historyMessages = await this.sessions.getChatHistory(
      req.principal.id,
      sessionId,
    );
    const historyBlock = await this.sessions.getHistoryBlock(
      req.principal.id,
      sessionId,
    );

    const activeCodingProjectId =
      body.codingProjectId?.trim() ||
      this.sessions.getActiveCodingProject(sessionId!) ||
      undefined;

    const contextBlock = await this.buildChatContextBlock(
      {
        sessionId,
        applicationId: body.application,
        operatingMode: body.mode,
        codingProjectId: activeCodingProjectId,
        workspaceId: body.workspaceId,
      },
      callCtx(req),
    );
    const replyScopeBlock = formatReplyScopeForPrompt(
      message,
      replyScopeDomain(body.mode, body.application),
    );

    const mergeAdaptiveMode = (
      extra: Record<string, unknown>,
      intent?: JarvisIntentAnalysis | null,
    ): Record<string, unknown> => {
      const routed = extra.routedTo as { id?: string; kind?: string } | undefined;
      const result = resolveAdaptiveModeSwitch({
        currentMode: resolveOperatingModeForContext({
          operatingMode: body.mode,
          applicationId: body.application,
        }),
        message,
        intentDomain: intent?.understanding.domain,
        agentType: routed?.kind === 'agent' ? routed.id : intent?.handler.agentType,
        openApp:
          typeof extra.openApp === 'string' ? extra.openApp : intent?.handler.openApp,
        applicationId: body.application,
        suggestedMode: intent?.suggestedOperatingMode ?? undefined,
        suggestionConfidence: intent?.confidence,
        modeManual: body.modeManual === true,
        actionKind: intent?.understanding.actionKind,
      });
      if (!result.switched) return extra;
      return {
        ...extra,
        operatingMode: result.mode,
        modeSwitched: true,
        modeSwitchReason: result.reason,
      };
    };

    const finish = async (
      reply: string,
      extra: Record<string, unknown> = {},
      state: 'completed' | 'needs_approval' | 'error' = 'completed',
      intent?: JarvisIntentAnalysis | null,
    ) => {
      const safeReply = sanitizeJarvisReply(reply, message, body.source);
      if (extra.codingProjectId && typeof extra.codingProjectId === 'string') {
        this.sessions.setActiveCodingProject(sessionId!, extra.codingProjectId);
      }
      await this.sessions.appendExchange(req.principal.id, sessionId!, message, safeReply);
      const merged = mergeAdaptiveMode(extra, intent);
      return ok({ reply: safeReply, state, sessionId, ...merged }, req.traceId);
    };

    if (body.source === 'voice' && shouldRejectVoiceTranscript(message)) {
      return ok(
        { reply: voiceMishearReply(), state: 'completed', sessionId },
        req.traceId,
      );
    }

    const instant = fastChatReply(message);
    if (instant) {
      return finish(instant);
    }

    const pendingExecution = this.sessions.getPendingExecution(sessionId!);
    const skipCognition =
      !pendingExecution &&
      !looksLikeFinanceAdvisory(message) &&
      !matchAdvisoryPlaybook(message) &&
      (looksLikeBriefingRequest(message).match || looksLikeWorkspaceIntent(message));

    if (!skipCognition) {
      const cognitionUserContent = contextualUserMessage(
        message,
        historyBlock,
        undefined,
        replyScopeBlock,
      );
      const cognitionSystemPrompt = jarvisChatSystemPrompt(
        body.source,
        body.clientAck,
        contextBlock,
        replyScopeBlock,
      );

      try {
        const cognition = await runJarvisCognition(this.platform, {
          message,
          traceId: req.traceId,
          actorId: req.principal.id,
          ctx: callCtx(req),
          historyBlock,
          contextBlock,
          systemPrompt: cognitionSystemPrompt,
          historyMessages,
          userContent: cognitionUserContent,
          pending: pendingExecution ?? null,
        });

        if (cognition.handled) {
          this.sessions.setPendingExecution(
            sessionId!,
            cognition.pending
              ? {
                  plan: cognition.pending.plan,
                  gatheredContext: cognition.pending.gatheredContext,
                  parsedInputs: cognition.pending.parsedInputs,
                  missingInputs: cognition.pending.missingInputs,
                  startedAt: cognition.pending.startedAt,
                }
              : null,
          );
          return finish(cognition.reply, {
            ...cognition.extra,
            cognition: true,
          });
        }

        if (matchAdvisoryPlaybook(message)) {
          const advisory = await runJarvisAdvisoryFallback(this.platform, {
            message,
            traceId: req.traceId,
            actorId: req.principal.id,
            ctx: callCtx(req),
            historyBlock,
            contextBlock,
            systemPrompt: cognitionSystemPrompt,
            historyMessages,
            userContent: cognitionUserContent,
            pending: pendingExecution ?? null,
          });
          if (advisory?.handled) {
            this.sessions.setPendingExecution(
              sessionId!,
              advisory.pending
                ? {
                    plan: advisory.pending.plan,
                    gatheredContext: advisory.pending.gatheredContext,
                    parsedInputs: advisory.pending.parsedInputs,
                    missingInputs: advisory.pending.missingInputs,
                    startedAt: advisory.pending.startedAt,
                  }
                : null,
            );
            return finish(advisory.reply, {
              ...advisory.extra,
              cognition: true,
              cognitionFallback: true,
            });
          }
        }
      } catch (err) {
        return finish(
          `I hit an error planning that request. ${(err as Error).message}`,
          { cognition: false, state: 'error' },
          'error',
        );
      }
    }

    if (looksLikeWorkspaceIntent(message)) {
      try {
        const created = (await this.platform.registry.dispatch(
          'bellasos.workspace',
          'workspace.fromMessage',
          { message, jarvisSessionId: sessionId },
          callCtx(req),
        )) as {
          matched?: boolean;
          workspace?: { id: string; title: string; progressSummary?: string };
          session?: { id: string };
          openApp?: string;
          added?: Record<string, number>;
        };
        if (created?.matched && created.workspace) {
          const added = created.added ?? {};
          const linked = [
            added.goals ? `${added.goals} goal${added.goals === 1 ? '' : 's'}` : null,
            added.decisions ? `${added.decisions} decision${added.decisions === 1 ? '' : 's'}` : null,
          ]
            .filter(Boolean)
            .join(' and ');
          const detail = linked ? ` I've linked ${linked}.` : '';
          return finish(
            `I've opened the ${created.workspace.title} workspace.${detail}`.trim(),
            {
              workspaceId: created.workspace.id,
              focusSessionId: created.session?.id,
              openApp: created.openApp,
            },
          );
        }
      } catch (err) {
        return finish(
          `I could not create that workspace right now. ${(err as Error).message}`,
          {},
          'error',
        );
      }
    }

    const briefingReq = looksLikeBriefingRequest(message);
    if (briefingReq.match) {
      try {
        const bundle = await buildIntelligenceBundle({
          platform: this.platform,
          ctx: callCtx(req),
          rhythm: parseRhythm(
            /evening|end of day/.test(message.toLowerCase())
              ? 'evening'
              : /midday|afternoon check/.test(message.toLowerCase())
                ? 'midday'
                : undefined,
          ),
          deep: briefingReq.deep,
          skipCache: briefingReq.deep,
          contextInput: {
            sessionId,
            codingProjectId: activeCodingProjectId,
            applicationId: body.application,
            operatingMode: body.mode,
            workspaceId: body.workspaceId,
            principalDisplayName: req.principal.displayName,
          },
        });
        return finish(bundle.transcript, {
          briefingRhythm: bundle.briefing.rhythm,
        });
      } catch (err) {
        return finish(
          `I could not compose a briefing right now. ${(err as Error).message}`,
          {},
          'error',
        );
      }
    }

    const financeContext = contextualUserMessage(message, historyBlock, undefined, replyScopeBlock);
    if (looksLikeFinanceWrite(message)) {
      try {
        const result = await this.platform.orchestrator.command({
          agentType: 'finance',
          prompt: financeContext,
          input: {},
          traceId: req.traceId,
          actorId: req.principal.id,
        });
        return finish(financeReply(result, message), {
          routedTo: { kind: 'agent', id: 'finance' },
          ...(isFinanceWriteSuccess(result) ? { suggestedApp: 'wealth' } : {}),
        });
      } catch (err) {
        return finish(
          `Error: ${friendlyFinanceConnectionError((err as Error).message)}`,
          {},
          'error',
        );
      }
    }

    let intent: JarvisIntentAnalysis | null = null;
    try {
      intent = await this.analyzeIntent(
        message,
        historyBlock,
        activeCodingProjectId,
        req.traceId,
        contextBlock,
        body.mode,
      );
    } catch (err) {
      return finish(`Error: ${(err as Error).message}`, {}, 'error');
    }

    if (!intent) {
      try {
        const chat = await this.runGeneralChat(
          message,
          historyMessages,
          historyBlock,
          req.traceId,
          body.source,
          body.clientAck,
          contextBlock,
          replyScopeBlock,
        );
        return finish(chat.reply, chat.extra);
      } catch (err) {
        return finish(`Error: ${(err as Error).message}`, {}, 'error');
      }
    }

    if (
      intent.handler.type === 'chat' &&
      looksLikeBriefingRequest(message).match
    ) {
      try {
        const bundle = await buildIntelligenceBundle({
          platform: this.platform,
          ctx: callCtx(req),
          rhythm: parseRhythm(
            /evening|end of day/.test(message.toLowerCase())
              ? 'evening'
              : /midday|afternoon check/.test(message.toLowerCase())
                ? 'midday'
                : undefined,
          ),
          deep: looksLikeBriefingRequest(message).deep,
          skipCache: looksLikeBriefingRequest(message).deep,
          contextInput: {
            sessionId,
            codingProjectId: activeCodingProjectId,
            applicationId: body.application,
            operatingMode: body.mode,
            workspaceId: body.workspaceId,
            principalDisplayName: req.principal.displayName,
          },
        });
        return finish(bundle.transcript, {
          briefingRhythm: bundle.briefing.rhythm,
        });
      } catch (err) {
        return finish(
          `I could not compose a briefing right now. ${(err as Error).message}`,
          {},
          'error',
        );
      }
    }

    if (
      shouldAskForClarification(
        intent,
        contextualUserMessage(message, historyBlock, undefined, replyScopeBlock),
      )
    ) {
      return finish(
        formatClarificationReply(intent),
        {
          intent: intent.understanding,
          state: 'needs_clarification',
        },
        'completed',
        intent,
      );
    }

    const agents = this.platform.orchestrator.listAgents();
    const agentPrompt = contextualUserMessage(
      intent.prompt ?? message,
      historyBlock,
      undefined,
      replyScopeBlock,
    );

    if (intent.handler.type === 'open_app' && intent.handler.openApp) {
      return finish(
        intent.reply ?? `Opening ${intent.handler.openApp}.`,
        {
          openApp: intent.handler.openApp,
          routedTo: { kind: 'module', id: intent.handler.openApp },
          intent: intent.understanding,
        },
        'completed',
        intent,
      );
    }

    if (intent.handler.type === 'agent' && intent.handler.agentType) {
      try {
        const agentType = resolveAgentType(intent.handler.agentType, agents) ?? intent.handler.agentType;
        const isCodingRefine =
          agentType === 'coding' &&
          intent.understanding.actionKind === 'write' &&
          Boolean(activeCodingProjectId);
        if (
          agentType === 'coding' &&
          intent.understanding.actionKind === 'write' &&
          !activeCodingProjectId &&
          intent.understanding.domain === 'coding' &&
          /\b(fix|edit|update|refine|change)\b/i.test(message)
        ) {
          return finish(
            'Select your project in Coding Studio first, then tell me what to fix.',
            { openApp: 'bellasos.coding', intent: intent.understanding },
            'completed',
            intent,
          );
        }
        const result = await this.platform.orchestrator.command({
          agentType,
          prompt: agentPrompt,
          input: {
            projectId: activeCodingProjectId,
            ...(isCodingRefine ? { refine: true } : {}),
          },
          traceId: req.traceId,
          actorId: req.principal.id,
        });
        const projectId = codingProjectIdFromResult(result);
        const appId =
          intent.handler.openApp ?? defaultOpenAppForAgent(agentType) ?? (projectId ? 'bellasos.coding' : undefined);
        const nav = resolveJarvisAppNavigation({
          appId,
          actionKind: intent.understanding.actionKind,
          agentType,
          explicitNavigate: intent.handler.type === 'open_app',
          hasCodingProject: Boolean(projectId),
        });
        let replyText =
          agentType === 'finance'
            ? financeReply(result, message)
            : extractFinanceText(result);
        const reply =
          agentType === 'coding' && projectId
            ? `Done. Opening Coding Studio — click the preview to play. ${replyText.slice(0, 120)}`
            : nav.suggestedApp
              ? appendAppOffer(replyText, nav.suggestedApp)
              : replyText;
        return finish(
          reply,
          {
            routedTo: { kind: 'agent', id: agentType },
            ...nav,
            codingProjectId: projectId,
            intent: intent.understanding,
          },
          'completed',
          intent,
        );
      } catch (err) {
        return finish(`Error: ${(err as Error).message}`, {}, 'error');
      }
    }

    if (intent.handler.type === 'module' && intent.handler.moduleId && intent.handler.action) {
      try {
        if (
          intent.handler.moduleId === 'bellasos.coding' &&
          intent.handler.action === 'task.refine' &&
          !activeCodingProjectId &&
          !(intent.handler.actionInput as { projectId?: string } | undefined)?.projectId
        ) {
          return finish(
            'Select your project in Coding Studio first, then tell me what to fix.',
            {
              openApp: 'bellasos.coding',
              intent: intent.understanding,
            },
            'completed',
            intent,
          );
        }
        const actionInput: Record<string, unknown> = {
          ...(intent.handler.actionInput ?? {}),
          ...(intent.handler.moduleId === 'bellasos.coding' && intent.handler.action === 'task.refine'
            ? {
                prompt:
                  (intent.handler.actionInput as { prompt?: string } | undefined)?.prompt ?? message,
                projectId:
                  (intent.handler.actionInput as { projectId?: string } | undefined)?.projectId ??
                  activeCodingProjectId,
              }
            : {}),
          ...(intent.handler.moduleId === 'bellasos.coding' &&
          intent.handler.action === 'task.execute' &&
          !(intent.handler.actionInput as { goal?: string } | undefined)?.goal
            ? { goal: agentPrompt }
            : {}),
        };
        const result = await this.platform.registry.dispatch(
          intent.handler.moduleId,
          intent.handler.action,
          actionInput,
          callCtx(req),
        );
        const projectId =
          intent.handler.moduleId === 'bellasos.coding' &&
          (intent.handler.action === 'task.execute' || intent.handler.action === 'task.refine')
            ? codingProjectIdFromResult(result)
            : undefined;
        const moduleAppId =
          intent.handler.openApp ??
          (intent.handler.moduleId === 'bellasos.finance-tracker' ? 'wealth' : intent.handler.moduleId);
        const nav = resolveJarvisAppNavigation({
          appId: moduleAppId,
          actionKind: intent.understanding.actionKind,
          agentType: intent.handler.moduleId === 'bellasos.coding' ? 'coding' : undefined,
          explicitNavigate: intent.handler.type === 'open_app',
          hasCodingProject: Boolean(projectId),
        });
        const moduleReplyBase =
          intent.handler.moduleId === 'bellasos.finance-tracker'
            ? financeReply(result, message)
            : extractFinanceText(result);
        const moduleReply = nav.suggestedApp
          ? appendAppOffer(moduleReplyBase, nav.suggestedApp)
          : moduleReplyBase;
        return finish(
          moduleReply,
          {
            routedTo: { kind: 'module', id: intent.handler.moduleId },
            action: {
              moduleId: intent.handler.moduleId,
              action: intent.handler.action,
              input: intent.handler.actionInput,
            },
            ...nav,
            codingProjectId: projectId,
            intent: intent.understanding,
          },
          'completed',
          intent,
        );
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.toLowerCase().includes('approval')) {
          return finish('That action needs your approval in System Console.', {}, 'needs_approval');
        }
        return finish(`Error: ${msg}`, {}, 'error');
      }
    }

    if (intent.handler.type === 'chat' && intent.reply && !looksLikeIntentJsonLeak(intent.reply)) {
      return finish(intent.reply, { intent: intent.understanding }, 'completed', intent);
    }

    if (intent.reply && !looksLikeRouterJsonLeak(intent.reply) && !looksLikeIntentJsonLeak(intent.reply)) {
      return finish(intent.reply, { intent: intent.understanding }, 'completed', intent);
    }

    try {
      if (looksLikeFinanceAdvisory(message) || matchAdvisoryPlaybook(message)) {
        const advisory = await runJarvisAdvisoryFallback(this.platform, {
          message,
          traceId: req.traceId,
          actorId: req.principal.id,
          ctx: callCtx(req),
          historyBlock,
          contextBlock,
          systemPrompt: jarvisChatSystemPrompt(
            body.source,
            body.clientAck,
            contextBlock,
            replyScopeBlock,
          ),
          historyMessages,
          userContent: contextualUserMessage(message, historyBlock, undefined, replyScopeBlock),
          pending: this.sessions.getPendingExecution(sessionId!) ?? null,
        });
        if (advisory?.handled) {
          this.sessions.setPendingExecution(
            sessionId!,
            advisory.pending
              ? {
                  plan: advisory.pending.plan,
                  gatheredContext: advisory.pending.gatheredContext,
                  parsedInputs: advisory.pending.parsedInputs,
                  missingInputs: advisory.pending.missingInputs,
                  startedAt: advisory.pending.startedAt,
                }
              : null,
          );
          return finish(advisory.reply, {
            ...advisory.extra,
            cognition: true,
            cognitionFallback: true,
            intent: intent.understanding,
          });
        }
      }

      const chat = await this.runGeneralChat(
        message,
        historyMessages,
        historyBlock,
        req.traceId,
        body.source,
        body.clientAck,
        contextBlock,
        replyScopeBlock,
      );
      return finish(chat.reply, { ...chat.extra, intent: intent.understanding }, 'completed', intent);
    } catch (err) {
      return finish(`Error: ${(err as Error).message}`, {}, 'error');
    }
  }
}
