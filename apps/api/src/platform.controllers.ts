import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ok } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { PLATFORM, type Platform } from './platform.token';
import type { AuthedRequest } from './auth.guard';

function maskSecret(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

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
    const status = this.platform.ai.providerStatus().find((p) => p.provider === provider);
    if (!status?.configured) {
      return ok({ ok: false, error: 'Provider not configured' }, req.traceId);
    }
    if (provider === 'ollama') {
      try {
        const url = (await this.platform.config.getProviderCredential('ollama')) ?? '';
        const res = await fetch(`${url}/api/version`);
        const json = await res.json();
        return ok({ ok: res.ok, version: json }, req.traceId);
      } catch (err) {
        return ok({ ok: false, error: (err as Error).message }, req.traceId);
      }
    }
    try {
      const res = await this.platform.ai.complete({
        messages: [{ role: 'user', content: 'Reply with: ok' }],
        model: provider === 'openai' ? 'gpt-4o-mini' : undefined,
        taskType: 'general',
        traceId: req.traceId,
      });
      return ok({ ok: true, model: res.model, sample: res.text.slice(0, 80) }, req.traceId);
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
      items.push({
        moduleId: m.manifest.id,
        name: m.manifest.name,
        status: m.status,
        credentials: creds,
        linkedAccounts: linked,
      });
    }
    const providers = this.platform.ai.providerStatus();
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
}

export const PLATFORM_CONTROLLERS = [
  ModuleSettingsController,
  SecretsController,
  AiConfigController,
  IntegrationsController,
];
