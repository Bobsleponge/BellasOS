import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ok } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { PLATFORM, type Platform } from './platform.token';
import type { AuthedRequest } from './auth.guard';
import { Public } from './auth.guard';
import { portfolioSyncKeyFromRequest } from './portfolio-sync';
import {
  maskSecret,
  PROVIDER_TEST_MODELS,
  resolveProviderStatuses,
} from './ai-provider-utils';

@Controller('config/modules')
export class ModuleSettingsController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get(':id/settings')
  async getSettings(@Req() req: AuthedRequest, @Param('id') id: string) {
    const mod = this.platform.registry.list().find((m) => m.manifest.id === id);
    if (!mod) return ok({ settings: [] }, req.traceId);
    const ns = `module:${id}`;
    const values: Record<string, unknown> = {};
    const masked: Record<string, string | undefined> = {};
    for (const s of mod.manifest.settings) {
      if (s.secret || s.type === 'secret') {
        const secret = await this.platform.config.getSecret(ns, s.key);
        masked[s.key] = maskSecret(secret);
      } else {
        values[s.key] =
          (await this.platform.config.get(ns, s.key)) ?? s.default ?? null;
      }
    }
    return ok(
      {
        moduleId: id,
        settings: mod.manifest.settings,
        values,
        maskedSecrets: masked,
      },
      req.traceId,
    );
  }

  @Put(':id/settings')
  async putSettings(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { values?: Record<string, unknown>; secrets?: Record<string, string> },
  ) {
    const ns = `module:${id}`;
    for (const [key, value] of Object.entries(body.values ?? {})) {
      await this.platform.config.set(ns, key, value);
    }
    for (const [key, value] of Object.entries(body.secrets ?? {})) {
      if (value) await this.platform.config.setSecret(ns, key, value);
    }
    return ok({ saved: true }, req.traceId);
  }
}

@Controller('config/secrets')
export class SecretsController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Put(':namespace/:key')
  async setSecret(
    @Req() req: AuthedRequest,
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    await this.platform.config.setSecret(namespace, key, body.value);
    if (namespace === 'ai' && key.endsWith('.credential')) {
      const provider = key.replace('.credential', '');
      await this.platform.config.setProviderCredential(provider, body.value);
      await this.platform.ai.refreshProviderCredentials();
    }
    return ok({ saved: true }, req.traceId);
  }

  @Delete(':namespace/:key')
  async deleteSecret(
    @Req() req: AuthedRequest,
    @Param('namespace') namespace: string,
    @Param('key') key: string,
  ) {
    await this.platform.config.deleteSecret(namespace, key);
    await this.platform.ai.refreshProviderCredentials();
    return ok({ deleted: true }, req.traceId);
  }
}

@Controller('config/ai')
export class AiConfigController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get('providers')
  async listProviders(@Req() req: AuthedRequest) {
    const statuses = await resolveProviderStatuses(
      this.platform.ai,
      this.platform.config,
    );
    return ok(statuses, req.traceId);
  }

  @Put('providers/:provider/credential')
  async setProviderCredential(
    @Req() req: AuthedRequest,
    @Param('provider') provider: string,
    @Body() body: { value: string },
  ) {
    await this.platform.config.setProviderCredential(provider, body.value);
    await this.platform.ai.refreshProviderCredentials();
    return ok({ saved: true, configured: true }, req.traceId);
  }

  @Delete('providers/:provider/credential')
  async clearProviderCredential(
    @Req() req: AuthedRequest,
    @Param('provider') provider: string,
  ) {
    await this.platform.config.deleteSecret('ai', `${provider}.credential`);
    await this.platform.ai.refreshProviderCredentials();
    return ok({ cleared: true }, req.traceId);
  }

  @Get('routing-strategy')
  routingStrategy(@Req() req: AuthedRequest) {
    return ok({ strategy: this.platform.ai.getRoutingStrategy() }, req.traceId);
  }

  @Put('routing-strategy')
  async setRoutingStrategy(
    @Req() req: AuthedRequest,
    @Body() body: { strategy: string },
  ) {
    await this.platform.ai.setRoutingStrategy(body.strategy as never);
    return ok({ strategy: body.strategy }, req.traceId);
  }

  @Post('providers/:provider/test')
  async testProvider(
    @Req() req: AuthedRequest,
    @Param('provider') provider: string,
  ) {
    await this.platform.ai.refreshProviderCredentials();
    const statuses = await resolveProviderStatuses(
      this.platform.ai,
      this.platform.config,
    );
    const status = statuses.find((p) => p.provider === provider);
    if (!status?.configured) {
      return ok(
        {
          ok: false,
          error:
            status?.source === 'none'
              ? 'Provider not configured — save a key below or set it in .env and restart the API'
              : 'Provider not configured',
        },
        req.traceId,
      );
    }
    if (provider === 'ollama') {
      try {
        const url = (await this.platform.config.getProviderCredential('ollama')) ?? '';
        const base = url.replace(/\/$/, '');
        const res = await fetch(`${base}/api/version`);
        const json = await res.json();
        return ok({ ok: res.ok, version: json }, req.traceId);
      } catch (err) {
        return ok({ ok: false, error: (err as Error).message }, req.traceId);
      }
    }
    const testModel = PROVIDER_TEST_MODELS[provider as keyof typeof PROVIDER_TEST_MODELS];
    try {
      const res = await this.platform.ai.complete({
        messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
        model: testModel,
        taskType: 'general',
        traceId: req.traceId,
      });
      const sample = res.text.trim().slice(0, 80);
      const okResult = /ok/i.test(sample);
      return ok(
        {
          ok: okResult,
          model: res.model,
          provider: res.provider,
          sample,
          error: okResult ? undefined : `Unexpected response: ${sample || '(empty)'}`,
        },
        req.traceId,
      );
    } catch (err) {
      return ok({ ok: false, error: (err as Error).message }, req.traceId);
    }
  }
}

@Controller('integrations')
export class IntegrationsController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  @Get()
  async list(@Req() req: AuthedRequest) {
    const modules = this.platform.registry.list();
    const items = [];
    for (const m of modules) {
      const creds: Record<string, boolean> = {};
      for (const s of m.manifest.settings) {
        if (s.secret || s.type === 'secret') {
          const v = await this.platform.config.getSecret(`module:${m.manifest.id}`, s.key);
          creds[s.key] = Boolean(v);
        }
      }
      let linked: Array<{ platform: string; accountName: string | null; status: string }> = [];
      if (isDbAvailable()) {
        linked = await getDb()
          .selectFrom('core.integrations')
          .select(['platform', 'account_name', 'status'])
          .where('module_id', '=', m.manifest.id)
          .execute()
          .then((rows) =>
            rows.map((r) => ({
              platform: r.platform,
              accountName: r.account_name,
              status: r.status,
            })),
          );
      }
      if (
        m.manifest.id === 'bellasos.finance-tracker' &&
        isDbAvailable() &&
        !creds.apiKey &&
        linked.some((l) => l.platform === 'finance-tracker' && l.status === 'connected')
      ) {
        await getDb()
          .deleteFrom('core.integrations')
          .where('module_id', '=', 'bellasos.finance-tracker')
          .where('platform', '=', 'finance-tracker')
          .execute();
        linked = linked.filter((l) => l.platform !== 'finance-tracker');
      }
      items.push({
        moduleId: m.manifest.id,
        name: m.manifest.name,
        status: m.status,
        credentials: creds,
        linkedAccounts: linked,
      });
    }
    const providers = await resolveProviderStatuses(
      this.platform.ai,
      this.platform.config,
    );
    return ok({ modules: items, providers }, req.traceId);
  }

  @Post('social/:platform/connect')
  async connectSocial(
    @Req() req: AuthedRequest,
    @Param('platform') platform: string,
    @Body() body: { accessToken: string; accountName?: string; refreshToken?: string },
  ) {
    const tokenRef = `social:${platform.toLowerCase()}:token`;
    const key = `token.${platform.toLowerCase()}`;
    await this.platform.config.setSecret('module:bellasos.social', key, body.accessToken);
    if (body.refreshToken) {
      await this.platform.config.setSecret(
        'module:bellasos.social',
        `refresh.${platform}`,
        body.refreshToken,
      );
    }
    if (isDbAvailable()) {
      await getDb()
        .insertInto('core.integrations')
        .values({
          user_id: req.principal.id,
          module_id: 'bellasos.social',
          platform,
          account_name: body.accountName ?? platform,
          status: 'connected',
          token_ref: tokenRef,
          metadata: {},
        })
        .onConflict((oc) =>
          oc.columns(['user_id', 'module_id', 'platform']).doUpdateSet({
            account_name: body.accountName ?? platform,
            status: 'connected',
            updated_at: new Date().toISOString(),
          }),
        )
        .execute();
    }
    return ok({ connected: true, platform }, req.traceId);
  }

  @Delete('social/:platform/disconnect')
  async disconnectSocial(@Req() req: AuthedRequest, @Param('platform') platform: string) {
    await this.platform.config.deleteSecret(
      'module:bellasos.social',
      `token.${platform.toLowerCase()}`,
    );
    if (isDbAvailable()) {
      await getDb()
        .deleteFrom('core.integrations')
        .where('module_id', '=', 'bellasos.social')
        .where('platform', '=', platform)
        .execute();
    }
    return ok({ disconnected: true }, req.traceId);
  }

  @Post('portfolio/connect')
  async connectPortfolio(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      syncUrl: string;
      appName: string;
      apiKey?: string;
    },
  ) {
    const syncUrl = body.syncUrl?.trim();
    const appName = body.appName?.trim() || 'Financial tracker';
    if (!syncUrl) {
      return ok({ ok: false, error: 'syncUrl is required' }, req.traceId);
    }

    const apiKey = body.apiKey?.trim() || crypto.randomUUID();
    const ns = 'module:bellasos.portfolio';

    await this.platform.config.setSecret(ns, 'syncApiKey', apiKey);
    await this.platform.config.set(ns, 'externalSyncUrl', syncUrl);
    await this.platform.config.set(ns, 'syncAppName', appName);
    await this.platform.config.set(ns, 'syncEnabled', true);

    if (isDbAvailable()) {
      await getDb()
        .insertInto('core.integrations')
        .values({
          user_id: req.principal.id,
          module_id: 'bellasos.portfolio',
          platform: 'external-app',
          account_name: appName,
          status: 'connected',
          token_ref: 'portfolio:syncApiKey',
          metadata: { syncUrl },
        })
        .onConflict((oc) =>
          oc.columns(['user_id', 'module_id', 'platform']).doUpdateSet({
            account_name: appName,
            status: 'connected',
            metadata: { syncUrl },
            updated_at: new Date().toISOString(),
          }),
        )
        .execute();
    }

    return ok(
      {
        connected: true,
        appName,
        syncUrl,
        apiKey,
        webhookUrl: '/api/v1/integrations/portfolio/webhook',
        exportUrl: '/api/v1/integrations/portfolio/export',
      },
      req.traceId,
    );
  }

  @Delete('portfolio/disconnect')
  async disconnectPortfolio(@Req() req: AuthedRequest) {
    const ns = 'module:bellasos.portfolio';
    await this.platform.config.deleteSecret(ns, 'syncApiKey');
    await this.platform.config.set(ns, 'syncEnabled', false);
    await this.platform.config.set(ns, 'externalSyncUrl', '');
    await this.platform.config.set(ns, 'syncAppName', '');

    if (isDbAvailable()) {
      await getDb()
        .deleteFrom('core.integrations')
        .where('module_id', '=', 'bellasos.portfolio')
        .where('platform', '=', 'external-app')
        .execute();
    }

    return ok({ disconnected: true }, req.traceId);
  }

  private async clearFinanceTrackerIntegration(): Promise<void> {
    if (!isDbAvailable()) return;
    await getDb()
      .deleteFrom('core.integrations')
      .where('module_id', '=', 'bellasos.finance-tracker')
      .where('platform', '=', 'finance-tracker')
      .execute();
  }

  private normalizeFinanceEmbedPath(path?: string): string {
    const raw = (path ?? '/dashboard').trim();
    if (!raw || raw === '/') return '/dashboard';
    return raw.startsWith('/') ? raw : `/${raw}`;
  }

  /** Auto-provision server bridge key from env when Jarvis needs Finance-Tracker API access. */
  private async ensureFinanceTrackerBridge(req: AuthedRequest): Promise<void> {
    const ns = 'module:bellasos.finance-tracker';
    const existing = await this.platform.config.getSecret(ns, 'apiKey');
    if (existing?.trim()) return;

    const envKey = process.env.FINANCE_TRACKER_API_KEY?.trim();
    if (!envKey) return;

    const baseUrl =
      process.env.FINANCE_TRACKER_URL?.trim() ||
      (await this.platform.config.get<string>(ns, 'baseUrl'))?.trim() ||
      'http://localhost:5000';

    await this.platform.config.setSecret(ns, 'apiKey', envKey);
    await this.platform.config.set(ns, 'baseUrl', baseUrl);

    if (isDbAvailable()) {
      await getDb()
        .insertInto('core.integrations')
        .values({
          user_id: req.principal.id,
          module_id: 'bellasos.finance-tracker',
          platform: 'finance-tracker',
          account_name: 'Finance-Tracker (service key)',
          status: 'connected',
          token_ref: 'finance-tracker:apiKey',
          metadata: { baseUrl, source: 'env' },
        })
        .onConflict((oc) =>
          oc.columns(['user_id', 'module_id', 'platform']).doUpdateSet({
            status: 'connected',
            metadata: { baseUrl, source: 'env' },
            updated_at: new Date().toISOString(),
          }),
        )
        .execute();
    }
  }

  @Get('finance-tracker/embed-url')
  async financeTrackerEmbedUrl(
    @Req() req: AuthedRequest,
    @Query('path') path?: string,
  ) {
    await this.ensureFinanceTrackerBridge(req);
    const baseUrl =
      (await this.platform.config.get<string>('module:bellasos.finance-tracker', 'baseUrl'))?.trim() ||
      process.env.FINANCE_TRACKER_URL?.trim() ||
      process.env.NEXT_PUBLIC_FINANCE_TRACKER_URL?.trim() ||
      'http://localhost:5000';
    const token = await this.platform.auth.issueEmbedToken(req.principal);
    const nextPath = this.normalizeFinanceEmbedPath(path);
    const url = `${baseUrl.replace(/\/$/, '')}/auth/bellasos?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`;
    return ok({ url, baseUrl, nextPath }, req.traceId);
  }

  @Post('finance-tracker/connect')
  async connectFinanceTracker(
    @Req() req: AuthedRequest,
    @Body() body: { baseUrl?: string; apiKey: string },
  ) {
    const apiKey = body.apiKey?.trim();
    if (!apiKey) {
      return ok({ connected: false, error: 'apiKey is required' }, req.traceId);
    }

    const baseUrl = body.baseUrl?.trim() || 'http://localhost:5000';
    const ns = 'module:bellasos.finance-tracker';
    const previousKey = await this.platform.config.getSecret(ns, 'apiKey');
    const previousBaseUrl = await this.platform.config.get<string>(ns, 'baseUrl');

    await this.platform.config.setSecret(ns, 'apiKey', apiKey);
    await this.platform.config.set(ns, 'baseUrl', baseUrl);

    const storedKey = await this.platform.config.getSecret(ns, 'apiKey');
    if (storedKey !== apiKey) {
      if (previousKey) {
        await this.platform.config.setSecret(ns, 'apiKey', previousKey);
      } else {
        await this.platform.config.deleteSecret(ns, 'apiKey');
      }
      if (previousBaseUrl) {
        await this.platform.config.set(ns, 'baseUrl', previousBaseUrl);
      }
      return ok(
        {
          connected: false,
          error:
            'Failed to store API key. Ensure the BellasOS database is running (DATABASE_URL).',
        },
        req.traceId,
      );
    }

    const status = await this.platform.registry.dispatch<{
      connected?: boolean;
      error?: string;
      user?: { email?: string; name?: string };
      baseUrl?: string;
    }>(
      'bellasos.finance-tracker',
      'connection.status',
      {},
      { principal: req.principal, traceId: req.traceId },
    );

    if (!status.connected) {
      if (previousKey) {
        await this.platform.config.setSecret(ns, 'apiKey', previousKey);
        if (previousBaseUrl) {
          await this.platform.config.set(ns, 'baseUrl', previousBaseUrl);
        }
      } else {
        await this.platform.config.deleteSecret(ns, 'apiKey');
        await this.clearFinanceTrackerIntegration();
      }
      return ok(
        {
          connected: false,
          error: status.error ?? 'Could not connect to Finance-Tracker with that API key',
        },
        req.traceId,
      );
    }

    if (isDbAvailable()) {
      await getDb()
        .insertInto('core.integrations')
        .values({
          user_id: req.principal.id,
          module_id: 'bellasos.finance-tracker',
          platform: 'finance-tracker',
          account_name: status.user?.email ?? 'Finance-Tracker',
          status: 'connected',
          token_ref: 'finance-tracker:apiKey',
          metadata: { baseUrl },
        })
        .onConflict((oc) =>
          oc.columns(['user_id', 'module_id', 'platform']).doUpdateSet({
            account_name: status.user?.email ?? 'Finance-Tracker',
            status: 'connected',
            metadata: { baseUrl },
            updated_at: new Date().toISOString(),
          }),
        )
        .execute();
    }

    return ok(
      {
        connected: true,
        baseUrl,
        user: status.user,
      },
      req.traceId,
    );
  }

  @Delete('finance-tracker/disconnect')
  async disconnectFinanceTracker(@Req() req: AuthedRequest) {
    const ns = 'module:bellasos.finance-tracker';
    await this.platform.config.deleteSecret(ns, 'apiKey');
    await this.clearFinanceTrackerIntegration();

    return ok({ disconnected: true }, req.traceId);
  }

  @Public()
  @Get('portfolio/export')
  async exportPortfolio(@Req() req: AuthedRequest) {
    const key = await portfolioSyncKeyFromRequest(this.platform, req);
    if (!key) {
      return ok({ ok: false, error: 'Invalid or missing sync API key' }, req.traceId);
    }

    const payload = await this.platform.registry.dispatch(
      'bellasos.portfolio',
      'sync.export',
      {},
      { principal: req.principal, traceId: req.traceId },
    );

    return ok(payload, req.traceId);
  }

  @Public()
  @Post('portfolio/webhook')
  async portfolioWebhook(@Req() req: AuthedRequest, @Body() body: unknown) {
    const key = await portfolioSyncKeyFromRequest(this.platform, req);
    if (!key) {
      return ok({ ok: false, error: 'Invalid or missing sync API key' }, req.traceId);
    }

    const payload = body as {
      holdings: unknown;
      watchlist?: unknown;
    };

    const result = await this.platform.registry.dispatch(
      'bellasos.portfolio',
      'holdings.import',
      {
        holdings: payload.holdings,
        watchlist: payload.watchlist,
        source: 'webhook',
      },
      { principal: req.principal, traceId: req.traceId },
    );

    return ok({ received: true, ...((result as object) ?? {}) }, req.traceId);
  }
}

export const PLATFORM_CONTROLLERS = [
  ModuleSettingsController,
  SecretsController,
  AiConfigController,
  IntegrationsController,
];
