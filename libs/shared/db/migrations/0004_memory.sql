-- Memory system schema: tiered items + pgvector embeddings + summaries.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS memory;

CREATE TABLE memory.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL CHECK (tier IN ('short','working','long')),
  owner_id text NOT NULL,
  content text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  source_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_owner_tier ON memory.items (owner_id, tier);
CREATE INDEX idx_memory_tags ON memory.items USING gin (tags);

CREATE TABLE memory.embeddings (
  item_id uuid PRIMARY KEY REFERENCES memory.items(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL
);
CREATE INDEX idx_memory_embedding ON memory.embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE TABLE memory.summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  tier text NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
