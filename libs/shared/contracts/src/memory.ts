export type MemoryTier = 'short' | 'working' | 'long';

export interface MemoryItem {
  id: string;
  tier: MemoryTier;
  ownerId: string;
  content: string;
  tags: string[];
  sourceRef?: Record<string, unknown>;
  createdAt: string;
}

export interface MemoryWriteInput {
  tier: MemoryTier;
  ownerId: string;
  content: string;
  tags?: string[];
  sourceRef?: Record<string, unknown>;
  /** When true (long tier), an embedding is generated for semantic search. */
  embed?: boolean;
}

export interface MemoryQuery {
  ownerId: string;
  query: string;
  tier?: MemoryTier;
  tags?: string[];
  limit?: number;
}

export interface MemoryHit extends MemoryItem {
  score: number;
}

/** Tiered memory surface handed to agents and modules via the module context. */
export interface MemoryGateway {
  remember(input: MemoryWriteInput): Promise<MemoryItem>;
  recall(query: MemoryQuery): Promise<MemoryHit[]>;
  forget(id: string): Promise<void>;
  summarize(ownerId: string, tier: MemoryTier): Promise<string>;
}
