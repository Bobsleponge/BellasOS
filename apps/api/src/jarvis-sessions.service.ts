import type { ChatMessage } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { sql } from 'kysely';

export interface JarvisSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview?: string;
}

export interface JarvisMessage {
  id: string;
  role: 'user' | 'jarvis';
  content: string;
  createdAt: string;
}

interface MemorySession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: JarvisMessage[];
  activeCodingProjectId?: string;
}

const HISTORY_LIMIT = 24;

function isJarvisSchemaError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  return (
    msg.includes('jarvis.sessions') ||
    msg.includes('jarvis.messages') ||
    (msg.includes('relation') && msg.includes('jarvis'))
  );
}

function sessionTitleFromMessage(message: string): string {
  const trimmed = message.replace(/\s+/g, ' ').trim();
  if (!trimmed) return 'New conversation';
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

function toSummary(session: MemorySession): JarvisSessionSummary {
  const last = session.messages[session.messages.length - 1];
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
    preview: last?.content,
  };
}

function toChatMessages(messages: JarvisMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    role: message.role === 'jarvis' ? 'assistant' : 'user',
    content: message.content,
  }));
}

function formatHistoryBlock(messages: JarvisMessage[]): string {
  return messages
    .map((message) =>
      message.role === 'user'
        ? `User: ${message.content}`
        : `Jarvis: ${message.content}`,
    )
    .join('\n');
}

/**
 * Persists Jarvis conversations per user. Uses Postgres when available and an
 * in-process store otherwise.
 */
export class JarvisSessionStore {
  private readonly sessions = new Map<string, MemorySession>();
  private readonly userSessionIds = new Map<string, string[]>();
  /** sessionId → active coding project for refine/edit follow-ups */
  private readonly activeCodingProject = new Map<string, string>();
  private dbEnabled = isDbAvailable();

  private rememberSession(session: MemorySession): void {
    this.sessions.set(session.id, session);
    const ids = this.userSessionIds.get(session.userId) ?? [];
    this.userSessionIds.set(session.userId, [session.id, ...ids.filter((id) => id !== session.id)]);
  }

  private createMemorySession(userId: string, id: string, now: string): JarvisSessionSummary {
    this.rememberSession({
      id,
      userId,
      title: 'New conversation',
      createdAt: now,
      updatedAt: now,
      messages: [],
    });
    return {
      id,
      title: 'New conversation',
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };
  }

  async createSession(userId: string): Promise<JarvisSessionSummary> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    if (this.dbEnabled) {
      try {
        await getDb()
          .insertInto('jarvis.sessions')
          .values({
            id,
            user_id: userId,
            title: 'New conversation',
            created_at: now,
            updated_at: now,
          })
          .execute();
        return {
          id,
          title: 'New conversation',
          createdAt: now,
          updatedAt: now,
          messageCount: 0,
        };
      } catch (err) {
        if (!isJarvisSchemaError(err)) throw err;
        this.dbEnabled = false;
      }
    }

    return this.createMemorySession(userId, id, now);
  }

  async listSessions(
    userId: string,
    limit = 30,
  ): Promise<JarvisSessionSummary[]> {
    if (this.dbEnabled) {
      try {
        const rows = await sql<{
          id: string;
          title: string;
          created_at: string;
          updated_at: string;
          message_count: number;
          preview: string | null;
        }>`
          SELECT
            s.id,
            s.title,
            s.created_at,
            s.updated_at,
            COUNT(m.id)::int AS message_count,
            (
              SELECT content
              FROM jarvis.messages
              WHERE session_id = s.id
              ORDER BY created_at DESC
              LIMIT 1
            ) AS preview
          FROM jarvis.sessions s
          LEFT JOIN jarvis.messages m ON m.session_id = s.id
          WHERE s.user_id = ${userId}
          GROUP BY s.id
          ORDER BY s.updated_at DESC
          LIMIT ${limit}
        `.execute(getDb());

        return rows.rows.map((row) => ({
          id: row.id,
          title: row.title,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          messageCount: Number(row.message_count),
          preview: row.preview ?? undefined,
        }));
      } catch (err) {
        if (!isJarvisSchemaError(err)) throw err;
        this.dbEnabled = false;
      }
    }

    const ids = this.userSessionIds.get(userId) ?? [];
    return ids
      .map((id) => this.sessions.get(id))
      .filter((session): session is MemorySession => !!session)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map(toSummary);
  }

  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<{ session: JarvisSessionSummary; messages: JarvisMessage[] } | null> {
    if (this.dbEnabled) {
      try {
        const session = await getDb()
          .selectFrom('jarvis.sessions')
          .selectAll()
          .where('id', '=', sessionId)
          .where('user_id', '=', userId)
          .executeTakeFirst();
        if (!session) return null;

        const messages = await getDb()
          .selectFrom('jarvis.messages')
          .selectAll()
          .where('session_id', '=', sessionId)
          .orderBy('created_at', 'asc')
          .execute();

        return {
          session: {
            id: session.id,
            title: session.title,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
            messageCount: messages.length,
            preview: messages[messages.length - 1]?.content,
          },
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role as 'user' | 'jarvis',
            content: message.content,
            createdAt: message.created_at,
          })),
        };
      } catch (err) {
        if (!isJarvisSchemaError(err)) throw err;
        this.dbEnabled = false;
      }
    }

    const memory = this.sessions.get(sessionId);
    if (!memory || memory.userId !== userId) return null;
    return {
      session: toSummary(memory),
      messages: [...memory.messages],
    };
  }

  async assertSession(userId: string, sessionId: string): Promise<boolean> {
    if (this.dbEnabled) {
      try {
        const session = await getDb()
          .selectFrom('jarvis.sessions')
          .select('id')
          .where('id', '=', sessionId)
          .where('user_id', '=', userId)
          .executeTakeFirst();
        return !!session;
      } catch (err) {
        if (!isJarvisSchemaError(err)) throw err;
        this.dbEnabled = false;
      }
    }
    const memory = this.sessions.get(sessionId);
    return !!memory && memory.userId === userId;
  }

  async getRecentMessages(
    userId: string,
    sessionId: string,
    limit = HISTORY_LIMIT,
  ): Promise<JarvisMessage[]> {
    const session = await this.getSession(userId, sessionId);
    if (!session) return [];
    return session.messages.slice(-limit);
  }

  async getChatHistory(
    userId: string,
    sessionId: string,
    limit = HISTORY_LIMIT,
  ): Promise<ChatMessage[]> {
    const messages = await this.getRecentMessages(userId, sessionId, limit);
    return toChatMessages(messages);
  }

  async getHistoryBlock(
    userId: string,
    sessionId: string,
    limit = HISTORY_LIMIT,
  ): Promise<string> {
    const messages = await this.getRecentMessages(userId, sessionId, limit);
    return formatHistoryBlock(messages);
  }

  getActiveCodingProject(sessionId: string): string | undefined {
    return this.activeCodingProject.get(sessionId);
  }

  setActiveCodingProject(sessionId: string, projectId: string | undefined): void {
    if (projectId) this.activeCodingProject.set(sessionId, projectId);
    else this.activeCodingProject.delete(sessionId);
  }

  async appendExchange(
    userId: string,
    sessionId: string,
    userMessage: string,
    jarvisReply: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const userEntry: JarvisMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      createdAt: now,
    };
    const jarvisEntry: JarvisMessage = {
      id: crypto.randomUUID(),
      role: 'jarvis',
      content: jarvisReply,
      createdAt: now,
    };

    if (this.dbEnabled) {
      try {
        const session = await getDb()
          .selectFrom('jarvis.sessions')
          .select(['id', 'title'])
          .where('id', '=', sessionId)
          .where('user_id', '=', userId)
          .executeTakeFirst();
        if (!session) return;

        const count = await getDb()
          .selectFrom('jarvis.messages')
          .select((eb) => eb.fn.countAll<number>().as('count'))
          .where('session_id', '=', sessionId)
          .executeTakeFirst();
        const isFirstExchange = Number(count?.count ?? 0) === 0;
        const title = isFirstExchange ? sessionTitleFromMessage(userMessage) : session.title;

        await getDb()
          .insertInto('jarvis.messages')
          .values([
            {
              id: userEntry.id,
              session_id: sessionId,
              role: 'user',
              content: userMessage,
              created_at: now,
            },
            {
              id: jarvisEntry.id,
              session_id: sessionId,
              role: 'jarvis',
              content: jarvisReply,
              created_at: now,
            },
          ])
          .execute();

        await getDb()
          .updateTable('jarvis.sessions')
          .set({
            title,
            updated_at: now,
          })
          .where('id', '=', sessionId)
          .execute();
        return;
      } catch (err) {
        if (!isJarvisSchemaError(err)) throw err;
        this.dbEnabled = false;
      }
    }

    const memory = this.sessions.get(sessionId);
    if (!memory || memory.userId !== userId) return;
    memory.messages.push(userEntry, jarvisEntry);
    if (memory.messages.length === 2) {
      memory.title = sessionTitleFromMessage(userMessage);
    }
    memory.updatedAt = now;
  }
}

let store: JarvisSessionStore | undefined;

export function getJarvisSessionStore(): JarvisSessionStore {
  if (!store) store = new JarvisSessionStore();
  return store;
}

export { formatHistoryBlock, toChatMessages };
