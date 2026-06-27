export interface PublishResult {
  postId: string;
  url?: string;
  platform: string;
}

export interface AnalyticsResult {
  followers?: number;
  impressions?: number;
  engagementRate?: number;
  note?: string;
  raw?: unknown;
}

async function apiError(res: Response, label: string): Promise<never> {
  const body = await res.text();
  throw new Error(`${label} API error (${res.status}): ${body.slice(0, 300)}`);
}

export async function publishToPlatform(
  platform: string,
  content: string,
  token: string,
): Promise<PublishResult> {
  switch (platform) {
    case 'X':
      return publishX(content, token);
    case 'LinkedIn':
      return publishLinkedIn(content, token);
    case 'Facebook':
      return publishFacebook(content, token);
    case 'Instagram':
      return publishInstagram(content, token);
    case 'YouTube':
      return publishYouTube(content, token);
    case 'TikTok':
      return publishTikTok(content, token);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function fetchPlatformAnalytics(
  platform: string,
  token: string,
): Promise<AnalyticsResult> {
  switch (platform) {
    case 'X':
      return analyticsX(token);
    case 'LinkedIn':
      return analyticsLinkedIn(token);
    default:
      return {
        note: `Analytics for ${platform} requires platform-specific scopes. Connect account and publish first.`,
      };
  }
}

async function publishX(content: string, token: string): Promise<PublishResult> {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ text: content.slice(0, 280) }),
  });
  if (!res.ok) await apiError(res, 'X');
  const json = (await res.json()) as { data: { id: string } };
  return {
    platform: 'X',
    postId: json.data.id,
    url: `https://x.com/i/web/status/${json.data.id}`,
  };
}

async function publishLinkedIn(content: string, token: string): Promise<PublishResult> {
  const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) await apiError(meRes, 'LinkedIn profile');
  const me = (await meRes.json()) as { sub: string };
  const author = `urn:li:person:${me.sub}`;
  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202405',
    },
    body: JSON.stringify({
      author,
      commentary: content,
      visibility: 'PUBLIC',
      lifecycleState: 'PUBLISHED',
      distribution: { feedDistribution: 'MAIN_FEED' },
    }),
  });
  if (!res.ok) await apiError(res, 'LinkedIn');
  const postId = res.headers.get('x-restli-id') ?? crypto.randomUUID();
  return { platform: 'LinkedIn', postId };
}

async function publishFacebook(content: string, token: string): Promise<PublishResult> {
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(token)}`,
  );
  if (!pagesRes.ok) await apiError(pagesRes, 'Facebook pages');
  const pages = (await pagesRes.json()) as {
    data: Array<{ id: string; access_token: string }>;
  };
  const page = pages.data[0];
  if (!page) throw new Error('No Facebook pages found for this token.');
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${page.id}/feed`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: content, access_token: page.access_token }),
    },
  );
  if (!res.ok) await apiError(res, 'Facebook');
  const json = (await res.json()) as { id: string };
  return {
    platform: 'Facebook',
    postId: json.id,
    url: `https://facebook.com/${json.id}`,
  };
}

async function publishInstagram(content: string, token: string): Promise<PublishResult> {
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,instagram_business_account&access_token=${encodeURIComponent(token)}`,
  );
  if (!pagesRes.ok) await apiError(pagesRes, 'Instagram account lookup');
  const pages = (await pagesRes.json()) as {
    data: Array<{ instagram_business_account?: { id: string } }>;
  };
  const igId = pages.data.find((p) => p.instagram_business_account)?.instagram_business_account?.id;
  if (!igId) throw new Error('No Instagram business account linked to this token.');
  throw new Error(
    'Instagram publishing requires a media container (image/video). Use draft + manual media upload for now.',
  );
}

async function publishYouTube(content: string, token: string): Promise<PublishResult> {
  throw new Error(
    'YouTube publishing requires video upload via Data API. Post metadata-only updates are not supported.',
  );
}

async function publishTikTok(content: string, token: string): Promise<PublishResult> {
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      post_info: { title: content.slice(0, 150), privacy_level: 'PUBLIC_TO_EVERYONE' },
      source_info: { source: 'PULL_FROM_URL', video_url: '' },
    }),
  });
  if (!res.ok) await apiError(res, 'TikTok');
  const json = (await res.json()) as { data?: { publish_id?: string } };
  return {
    platform: 'TikTok',
    postId: json.data?.publish_id ?? crypto.randomUUID(),
  };
}

async function analyticsX(token: string): Promise<AnalyticsResult> {
  const res = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=public_metrics',
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok) await apiError(res, 'X analytics');
  const json = (await res.json()) as {
    data: { public_metrics?: { followers_count?: number; tweet_count?: number } };
  };
  const m = json.data.public_metrics;
  return {
    followers: m?.followers_count,
    impressions: m?.tweet_count,
    engagementRate: 0,
  };
}

async function analyticsLinkedIn(token: string): Promise<AnalyticsResult> {
  return {
    note: 'LinkedIn org analytics require Marketing Developer Platform access.',
    raw: { configured: Boolean(token) },
  };
}
