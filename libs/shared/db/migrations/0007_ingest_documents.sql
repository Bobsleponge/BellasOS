-- Fresh data ingestion documents (web search, news, market, URL fetch)
CREATE TABLE IF NOT EXISTS core.ingest_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  title text NOT NULL,
  url text,
  snippet text NOT NULL DEFAULT '',
  body text,
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ingest_source ON core.ingest_documents (source);
CREATE INDEX IF NOT EXISTS idx_ingest_fetched ON core.ingest_documents (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_tags ON core.ingest_documents USING gin (tags);
