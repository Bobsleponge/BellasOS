const DEV_KEY = 'bellasos:devMode';

export function isDeveloperModeEnabled(search = ''): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (params.get('dev') === '1') return true;
  try {
    return localStorage.getItem(DEV_KEY) === '1';
  } catch {
    return false;
  }
}

export function enableDeveloperMode(): void {
  try {
    localStorage.setItem(DEV_KEY, '1');
  } catch {
    /* ignore */
  }
}
