import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ok, type CallContext, type CompletionRequest, type ProviderType } from '@bellasos/contracts';
import { getIngestionService } from '@bellasos/core-ingestion';
import { planJarvisCompletion } from '@bellasos/ai-routing';
import { sanitizeJarvisReply, shouldRejectVoiceTranscript, voiceMishearReply } from './transcript-guard';
import { PLATFORM, type Platform } from './platform.token';
import type { AuthedRequest } from './auth.guard';
import { getJarvisSessionStore } from './jarvis-sessions.service';
import {
  defaultOpenAppForAgent,
  looksLikeFinanceWrite,
  looksLikeRouterJsonLeak,
  resolveAgentType,
} from './jarvis-orchestrator';
import {
  buildJarvisIntentPrompt,
  formatClarificationReply,
  looksLikeIntentJsonLeak,
  normalizeIntentAnalysis,
  parseJarvisIntentJson,
  shouldAskForClarification,
  type JarvisIntentAnalysis,
} from './jarvis-intent';
import { jarvisChatSystemPrompt } from './jarvis-acknowledgments';
import { transcribeWav, warmupTranscriber } from './stt.service';
import { synthesizeSpeech } from './tts.service';

function callCtx(req: AuthedRequest): CallContext {
  return { principal: req.principal, traceId: req.traceId };
}

const MODULE_APPS: Record<string, string> = {
  portfolio: 'bellasos.portfolio',
  research: 'bellasos.research',
  intelligence: 'bellasos.intelligence',
  social: 'bellasos.social',
  automation: 'bellasos.automation',
  voice: 'bellasos.voice',
  camera: 'bellasos.camera',
  coding: 'bellasos.coding',
  code: 'bellasos.coding',
  llm: 'bellasos.llm',
  ai: 'ai.studio',
  console: 'system.console',
};

function friendlyFinanceConnectionError(message: string): string {
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|connect ETIMEDOUT|Finance-Tracker is not running/i.test(message)) {
    return 'Finance-Tracker is not running. Start it on port 5000 (`cd Finance-Tracker && npm run dev`), then try again.';
  }
  return message;
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

function extractText(data: unknown): string {
  const out = (data as { output?: Record<string, unknown> })?.output ?? data;
  if (out && typeof out === 'object') {
    const o = out as Record<string, unknown>;
    if (o.action === 'investments.add' && typeof o.message === 'string' && o.message.trim()) {
      return o.message.trim();
    }
    if (o.needsClarification && typeof o.message === 'string' && o.message.trim()) {
      return o.message.trim();
    }
    for (const key of ['message', 'answer', 'response', 'analysis', 'content', 'reply', 'text', 'result']) {
      const v = o[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    if (typeof o.netWorth === 'number') {
      return formatFinanceSummary(o);
    }
    if (typeof o.error === 'string') return friendlyFinanceConnectionError(o.error);
    const report = o.report as { content?: string } | undefined;
    if (report?.content) return report.content;
    const briefing = o.briefing as { content?: string } | undefined;
    if (briefing?.content) return briefing.content;
  }
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

function formatFinanceSummary(o: Record<string, unknown>): string {
  const currency = String(o.currency ?? 'ZAR');
  const fmt = (n: number) =>
    `${currency === 'ZAR' ? 'R' : ''}${Math.abs(n).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
  const netWorth = Number(o.netWorth ?? 0);
  const parts = [`Your net worth is ${netWorth < 0 ? '-' : ''}${fmt(netWorth)}.`];
  if (o.totalAssets != null || o.totalLiabilities != null) {
    parts.push(
      `Assets ${fmt(Number(o.totalAssets ?? 0))}, liabilities ${fmt(Number(o.totalLiabilities ?? 0))}, investments ${fmt(Number(o.investmentValue ?? 0))}.`,
    );
  }
  if (o.totalIncome != null && o.totalExpenses != null) {
    parts.push(
      `Income ${fmt(Number(o.totalIncome))}, expenses ${fmt(Number(o.totalExpenses))}, net cashflow ${fmt(Number(o.netCashflow ?? Number(o.totalIncome) - Number(o.totalExpenses)))}.`,
    );
  }
  return parts.join(' ');
}

function contextualUserMessage(
  message: string,
  historyBlock: string,
  extra?: string,
): string {
  const parts = [message];
  if (historyBlock) parts.unshift(`Conversation so far:\n${historyBlock}`);
  if (extra) parts.push(extra);
  return parts.join('\n\n');
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

function jarvisProviderConfigured(provider: ProviderType): boolean {
  const keys: Partial<Record<ProviderType, string>> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
  };
  const envKey = keys[provider];
  if (envKey) return Boolean(process.env[envKey]?.trim());
  return provider === 'ollama' || provider === 'mock';
}

function jarvisAiRequest(
  platform: Platform,
  message: string,
  partial: Omit<CompletionRequest, 'messages' | 'model' | 'taskType' | 'maxTokens' | 'temperature'>,
  opts?: { forceTier?: 'fast' | 'standard' | 'deep' },
): Omit<CompletionRequest, 'messages'> {
  const plan = planJarvisCompletion(message, platform.ai.listModels(), {
    pinModel: process.env.JARVIS_MODEL,
    forceTier: opts?.forceTier,
    isProviderConfigured: jarvisProviderConfigured,
  });

  return {
    taskType: plan.taskType,
    temperature: plan.temperature,
    maxTokens: plan.maxTokens,
    model: plan.model,
    ...partial,
  };
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

  private async analyzeIntent(
    message: string,
    historyBlock: string,
    activeCodingProjectId: string | undefined,
    traceId: string,
  ): Promise<JarvisIntentAnalysis | null> {
    const agentInfos = this.platform.orchestrator.agentInfos();
    const agents = this.platform.orchestrator.listAgents();
    const modules = this.platform.registry.list().map((m) => m.manifest.id);

    const prompt = buildJarvisIntentPrompt({
      message,
      agents: agentInfos,
      moduleIds: modules,
      moduleApps: Object.values(MODULE_APPS),
      historyBlock: historyBlock || undefined,
      activeCodingProjectId,
    });

    const routed = await this.platform.ai.complete({
      ...jarvisAiRequest(this.platform, message, { traceId }, { forceTier: 'fast' }),
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

    const chat = await this.platform.ai.complete({
      ...jarvisAiRequest(this.platform, message, { traceId }),
      messages: [
        {
          role: 'system',
          content: jarvisChatSystemPrompt(source, clientAck),
        },
        ...historyMessages,
        {
          role: 'user',
          content: contextualUserMessage(message, '', ctxBlock ? `Relevant context:\n${ctxBlock}` : undefined),
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

    const finish = async (
      reply: string,
      extra: Record<string, unknown> = {},
      state: 'completed' | 'needs_approval' | 'error' = 'completed',
    ) => {
      const safeReply = sanitizeJarvisReply(reply, message, body.source);
      if (extra.codingProjectId && typeof extra.codingProjectId === 'string') {
        this.sessions.setActiveCodingProject(sessionId!, extra.codingProjectId);
      }
      await this.sessions.appendExchange(req.principal.id, sessionId!, message, safeReply);
      return ok({ reply: safeReply, state, sessionId, ...extra }, req.traceId);
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

    const financeContext = contextualUserMessage(message, historyBlock);
    if (looksLikeFinanceWrite(financeContext)) {
      try {
        const result = await this.platform.orchestrator.command({
          agentType: 'finance',
          prompt: financeContext,
          input: {},
          traceId: req.traceId,
          actorId: req.principal.id,
        });
        return finish(extractText(result), {
          routedTo: { kind: 'agent', id: 'finance' },
          ...(isFinanceWriteSuccess(result) ? { openApp: 'bellasos.portfolio' } : {}),
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
      intent = await this.analyzeIntent(message, historyBlock, activeCodingProjectId, req.traceId);
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
        );
        return finish(chat.reply, chat.extra);
      } catch (err) {
        return finish(`Error: ${(err as Error).message}`, {}, 'error');
      }
    }

    if (shouldAskForClarification(intent, contextualUserMessage(message, historyBlock))) {
      return finish(formatClarificationReply(intent), {
        intent: intent.understanding,
        state: 'needs_clarification',
      });
    }

    const agents = this.platform.orchestrator.listAgents();
    const agentPrompt = contextualUserMessage(intent.prompt ?? message, historyBlock);

    if (intent.handler.type === 'open_app' && intent.handler.openApp) {
      return finish(intent.reply ?? `Opening ${intent.handler.openApp}.`, {
        openApp: intent.handler.openApp,
        routedTo: { kind: 'module', id: intent.handler.openApp },
        intent: intent.understanding,
      });
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
        const openApp =
          intent.handler.openApp ?? defaultOpenAppForAgent(agentType) ?? (projectId ? 'bellasos.coding' : undefined);
        const replyText = extractText(result);
        const reply =
          agentType === 'coding' && projectId
            ? `Done. Opening Coding Studio — click the preview to play. ${replyText.slice(0, 120)}`
            : replyText;
        return finish(reply, {
          routedTo: { kind: 'agent', id: agentType },
          openApp,
          codingProjectId: projectId,
          intent: intent.understanding,
        });
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
          return finish('Select your project in Coding Studio first, then tell me what to fix.', {
            openApp: 'bellasos.coding',
            intent: intent.understanding,
          });
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
        return finish(extractText(result), {
          routedTo: { kind: 'module', id: intent.handler.moduleId },
          action: {
            moduleId: intent.handler.moduleId,
            action: intent.handler.action,
            input: intent.handler.actionInput,
          },
          openApp: intent.handler.openApp ?? intent.handler.moduleId,
          codingProjectId: projectId,
          intent: intent.understanding,
        });
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.toLowerCase().includes('approval')) {
          return finish('That action needs your approval in System Console.', {}, 'needs_approval');
        }
        return finish(`Error: ${msg}`, {}, 'error');
      }
    }

    if (intent.handler.type === 'chat' && intent.reply && !looksLikeIntentJsonLeak(intent.reply)) {
      return finish(intent.reply, { intent: intent.understanding });
    }

    if (intent.reply && !looksLikeRouterJsonLeak(intent.reply) && !looksLikeIntentJsonLeak(intent.reply)) {
      return finish(intent.reply, { intent: intent.understanding });
    }

    try {
      const chat = await this.runGeneralChat(
        message,
        historyMessages,
        historyBlock,
        req.traceId,
        body.source,
        body.clientAck,
      );
      return finish(chat.reply, { ...chat.extra, intent: intent.understanding });
    } catch (err) {
      return finish(`Error: ${(err as Error).message}`, {}, 'error');
    }
  }
}
