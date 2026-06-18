import type { Platform } from './platform.token';

type ReqLike = { headers: Record<string, string | string[] | undefined> };

function headerValue(req: ReqLike, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()] ?? req.headers[name];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export async function portfolioSyncKeyFromRequest(
  platform: Platform,
  req: ReqLike,
): Promise<string | null> {
  const auth = headerValue(req, 'authorization');
  const fromBearer = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
  const key = headerValue(req, 'x-bellasos-sync-key') ?? fromBearer;
  if (!key) return null;

  const stored = await platform.config.getSecret('module:bellasos.portfolio', 'syncApiKey');
  if (!stored || stored !== key) return null;
  return key;
}
