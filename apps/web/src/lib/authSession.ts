const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';

const STORAGE_KEY = 'bellasos:auth:token';

let cachedToken: string | null = null;

/** BellasOS access token for unified identity across apps and API calls. */
export async function getBellasAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedToken = stored;
      return stored;
    }
  }

  try {
    const res = await fetch(`${API_BASE}/auth/dev-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
      cache: 'no-store',
    });
    const json = (await res.json()) as {
      data?: { token?: string };
      error?: { message?: string };
    };
    const token = json.data?.token?.trim();
    if (!token) return null;
    cachedToken = token;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, token);
    }
    return token;
  } catch {
    return null;
  }
}

export function clearBellasAuthToken(): void {
  cachedToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
