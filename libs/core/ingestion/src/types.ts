export type IngestSource = 'web_search' | 'rss' | 'market' | 'url_fetch';

export interface IngestDocument {
  id: string;
  source: IngestSource;
  title: string;
  url?: string;
  snippet: string;
  body?: string;
  tags: string[];
  fetchedAt: string;
  expiresAt?: string;
  metadata: Record<string, unknown>;
}

export interface IngestSourceRef {
  url?: string;
  title: string;
  fetchedAt: string;
}
