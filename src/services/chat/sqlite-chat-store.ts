import * as SQLite from 'expo-sqlite';
import type {
  ChatDialog,
  ChatDraft,
  ChatLocalStore,
  ChatMessage,
  ChatSnapshot,
  ChatStoreBatch,
  OutgoingMediaMessage,
  OutgoingMessage,
} from '@/types/chat';

const PTS_KEY = 'pts';
/**
 * Bump when cached server objects gain fields; the cache is then dropped and
 * reloaded from the server. Unsent messages and drafts are kept.
 * 2: dialogs gained `unsendWindowSeconds`/`sendLocked`, messages `censorStatus`.
 */
const CACHE_VERSION = 2;

type JsonRow = { json: string };

/**
 * `ChatLocalStore` on expo-sqlite. One database per user. Rows keep the API
 * object as JSON next to the columns needed for ordering and lookups.
 *
 * Writes run one at a time (a single connection cannot interleave
 * transactions). After `close()`, reads return empty results and writes do
 * nothing, so in-flight calls from an unmounted provider do not throw.
 */
export class SqliteChatStore implements ChatLocalStore {
  private readonly listeners = new Set<() => void>();
  private readonly ready: Promise<SQLite.SQLiteDatabase | null>;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private closed = false;

  constructor(userKey: string) {
    this.ready = (async () => {
      const db = await SQLite.openDatabaseAsync(`trao-chat-${userKey}.db`);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS dialogs (
          id TEXT PRIMARY KEY, last_activity_at TEXT NOT NULL, json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
          inbox_id TEXT NOT NULL, seq INTEGER NOT NULL, client_msg_id TEXT NOT NULL,
          version INTEGER NOT NULL, json TEXT NOT NULL, PRIMARY KEY (inbox_id, seq)
        );
        CREATE TABLE IF NOT EXISTS outgoing (
          client_msg_id TEXT PRIMARY KEY, inbox_id TEXT NOT NULL,
          created_at_local INTEGER NOT NULL, json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS outgoing_inbox ON outgoing (inbox_id, created_at_local);
        CREATE TABLE IF NOT EXISTS outgoing_media (
          client_msg_id TEXT PRIMARY KEY, inbox_id TEXT NOT NULL,
          created_at_local INTEGER NOT NULL, json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS outgoing_media_inbox
          ON outgoing_media (inbox_id, created_at_local);
        CREATE TABLE IF NOT EXISTS drafts (inbox_id TEXT PRIMARY KEY, json TEXT NOT NULL);
      `);

      const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      if ((version?.user_version ?? 0) < CACHE_VERSION) {
        await db.execAsync(`
          DELETE FROM dialogs;
          DELETE FROM messages;
          DELETE FROM meta;
          PRAGMA user_version = ${CACHE_VERSION};
        `);
      }

      if (this.closed) {
        await db.closeAsync();
        return null;
      }
      return db;
    })();
    // Keep the promise handled; callers see an empty store if opening failed.
    this.ready.catch((error) => console.warn('[chat] sqlite open failed', error));
  }

  private async read<T>(fallback: T, run: (db: SQLite.SQLiteDatabase) => Promise<T>) {
    if (this.closed) return fallback;
    try {
      const db = await this.ready;
      return db && !this.closed ? await run(db) : fallback;
    } catch (error) {
      if (this.closed) return fallback;
      throw error;
    }
  }

  private write(run: (db: SQLite.SQLiteDatabase) => Promise<void>) {
    const task = this.writeQueue.then(async () => {
      if (this.closed) return;
      const db = await this.ready;
      if (!db || this.closed) return;
      await db.withTransactionAsync(() => run(db));
    });
    this.writeQueue = task.catch(() => undefined);
    return task.then(() => this.notify());
  }

  async getPts() {
    return this.read<number | null>(null, async (db) => {
      const row = await db.getFirstAsync<{ value: number }>(
        'SELECT value FROM meta WHERE key = ?',
        PTS_KEY
      );
      return row ? row.value : null;
    });
  }

  listDialogs() {
    return this.read<ChatDialog[]>([], async (db) => {
      const rows = await db.getAllAsync<JsonRow>(
        'SELECT json FROM dialogs ORDER BY last_activity_at DESC'
      );
      return rows.map((row) => JSON.parse(row.json) as ChatDialog);
    });
  }

  getDialog(inboxId: string) {
    return this.read<ChatDialog | undefined>(undefined, async (db) => {
      const row = await db.getFirstAsync<JsonRow>('SELECT json FROM dialogs WHERE id = ?', inboxId);
      return row ? (JSON.parse(row.json) as ChatDialog) : undefined;
    });
  }

  listMessages(inboxId: string, options: { beforeSeq?: number; limit: number }) {
    return this.read<ChatMessage[]>([], async (db) => {
      const rows = await db.getAllAsync<JsonRow>(
        'SELECT json FROM messages WHERE inbox_id = ? AND seq < ? ORDER BY seq DESC LIMIT ?',
        inboxId,
        options.beforeSeq ?? Number.MAX_SAFE_INTEGER,
        options.limit
      );
      return rows.reverse().map((row) => JSON.parse(row.json) as ChatMessage);
    });
  }

  listOutgoing(inboxId?: string) {
    return this.listQueue<OutgoingMessage>('outgoing', inboxId);
  }

  listOutgoingMedia(inboxId?: string) {
    return this.listQueue<OutgoingMediaMessage>('outgoing_media', inboxId);
  }

  private listQueue<T>(table: 'outgoing' | 'outgoing_media', inboxId?: string) {
    return this.read<T[]>([], async (db) => {
      const rows = inboxId
        ? await db.getAllAsync<JsonRow>(
            `SELECT json FROM ${table} WHERE inbox_id = ? ORDER BY created_at_local`,
            inboxId
          )
        : await db.getAllAsync<JsonRow>(`SELECT json FROM ${table} ORDER BY created_at_local`);
      return rows.map((row) => JSON.parse(row.json) as T);
    });
  }

  getDraft(inboxId: string) {
    return this.read<ChatDraft | undefined>(undefined, async (db) => {
      const row = await db.getFirstAsync<JsonRow>(
        'SELECT json FROM drafts WHERE inbox_id = ?',
        inboxId
      );
      return row ? (JSON.parse(row.json) as ChatDraft) : undefined;
    });
  }

  listDrafts() {
    return this.read<ChatDraft[]>([], async (db) => {
      const rows = await db.getAllAsync<JsonRow>('SELECT json FROM drafts');
      return rows.map((row) => JSON.parse(row.json) as ChatDraft);
    });
  }

  private static async putDialog(db: SQLite.SQLiteDatabase, dialog: ChatDialog) {
    await db.runAsync(
      'INSERT OR REPLACE INTO dialogs (id, last_activity_at, json) VALUES (?, ?, ?)',
      dialog.id,
      dialog.lastActivityAt,
      JSON.stringify(dialog)
    );
  }

  resetFromSnapshot(snapshot: ChatSnapshot) {
    return this.write(async (db) => {
      await db.runAsync('DELETE FROM dialogs');
      await db.runAsync('DELETE FROM messages');
      for (const dialog of snapshot.dialogs) await SqliteChatStore.putDialog(db, dialog);
      await db.runAsync(
        'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
        PTS_KEY,
        snapshot.pts
      );
    });
  }

  applyBatch(batch: ChatStoreBatch) {
    return this.write(async (db) => {
      for (const dialog of batch.dialogs) await SqliteChatStore.putDialog(db, dialog);

      for (const message of batch.messages) {
        const stored = await db.getFirstAsync<{ version: number }>(
          'SELECT version FROM messages WHERE inbox_id = ? AND seq = ?',
          message.inboxId,
          message.seq
        );
        if (!stored || message.version >= stored.version) {
          await db.runAsync(
            `INSERT OR REPLACE INTO messages (inbox_id, seq, client_msg_id, version, json)
             VALUES (?, ?, ?, ?, ?)`,
            message.inboxId,
            message.seq,
            message.clientMsgId,
            message.version,
            JSON.stringify(message)
          );
        }
        await db.runAsync('DELETE FROM outgoing WHERE client_msg_id = ?', message.clientMsgId);
        await db.runAsync(
          'DELETE FROM outgoing_media WHERE client_msg_id = ?',
          message.clientMsgId
        );
      }

      for (const messageId of batch.removedMessageIds ?? []) {
        await db.runAsync("DELETE FROM messages WHERE json_extract(json, '$.id') = ?", messageId);
      }

      for (const inboxId of batch.removedInboxIds ?? []) {
        await db.runAsync('DELETE FROM dialogs WHERE id = ?', inboxId);
        await db.runAsync('DELETE FROM messages WHERE inbox_id = ?', inboxId);
        await db.runAsync('DELETE FROM outgoing WHERE inbox_id = ?', inboxId);
        await db.runAsync('DELETE FROM outgoing_media WHERE inbox_id = ?', inboxId);
        await db.runAsync('DELETE FROM drafts WHERE inbox_id = ?', inboxId);
      }

      if (batch.pts !== null) {
        await db.runAsync(
          'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
          PTS_KEY,
          batch.pts
        );
      }
    });
  }

  patchDialog(inboxId: string, patch: Partial<ChatDialog>) {
    return this.write(async (db) => {
      const row = await db.getFirstAsync<JsonRow>('SELECT json FROM dialogs WHERE id = ?', inboxId);
      if (!row) return;
      await SqliteChatStore.putDialog(db, { ...(JSON.parse(row.json) as ChatDialog), ...patch });
    });
  }

  private static async putQueueRow(
    db: SQLite.SQLiteDatabase,
    table: 'outgoing' | 'outgoing_media',
    message: OutgoingMessage | OutgoingMediaMessage
  ) {
    await db.runAsync(
      `INSERT OR REPLACE INTO ${table} (client_msg_id, inbox_id, created_at_local, json)
       VALUES (?, ?, ?, ?)`,
      message.clientMsgId,
      message.inboxId,
      message.createdAtLocal,
      JSON.stringify(message)
    );
  }

  private patchQueueRow<T extends OutgoingMessage | OutgoingMediaMessage>(
    table: 'outgoing' | 'outgoing_media',
    clientMsgId: string,
    patch: Partial<T>
  ) {
    return this.write(async (db) => {
      const row = await db.getFirstAsync<JsonRow>(
        `SELECT json FROM ${table} WHERE client_msg_id = ?`,
        clientMsgId
      );
      if (!row) return;
      await SqliteChatStore.putQueueRow(db, table, { ...(JSON.parse(row.json) as T), ...patch });
    });
  }

  putOutgoing(message: OutgoingMessage) {
    return this.write((db) => SqliteChatStore.putQueueRow(db, 'outgoing', message));
  }

  updateOutgoing(clientMsgId: string, patch: Partial<OutgoingMessage>) {
    return this.patchQueueRow('outgoing', clientMsgId, patch);
  }

  deleteOutgoing(clientMsgId: string) {
    return this.write(async (db) => {
      await db.runAsync('DELETE FROM outgoing WHERE client_msg_id = ?', clientMsgId);
    });
  }

  putOutgoingMedia(message: OutgoingMediaMessage) {
    return this.write(async (db) => {
      await SqliteChatStore.putQueueRow(db, 'outgoing_media', message);
      await db.runAsync('DELETE FROM drafts WHERE inbox_id = ?', message.inboxId);
    });
  }

  updateOutgoingMedia(clientMsgId: string, patch: Partial<OutgoingMediaMessage>) {
    return this.patchQueueRow('outgoing_media', clientMsgId, patch);
  }

  deleteOutgoingMedia(clientMsgId: string) {
    return this.write(async (db) => {
      await db.runAsync('DELETE FROM outgoing_media WHERE client_msg_id = ?', clientMsgId);
    });
  }

  putDraft(draft: ChatDraft) {
    return this.write(async (db) => {
      if (!draft.text.trim() && draft.media.length === 0) {
        await db.runAsync('DELETE FROM drafts WHERE inbox_id = ?', draft.inboxId);
        return;
      }
      await db.runAsync(
        'INSERT OR REPLACE INTO drafts (inbox_id, json) VALUES (?, ?)',
        draft.inboxId,
        JSON.stringify(draft)
      );
    });
  }

  deleteDraft(inboxId: string) {
    return this.write(async (db) => {
      await db.runAsync('DELETE FROM drafts WHERE inbox_id = ?', inboxId);
    });
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    this.listeners.clear();
    try {
      await this.writeQueue;
      const db = await this.ready;
      await db?.closeAsync();
    } catch {
      // Closing is best effort.
    }
  }

  private notify() {
    if (this.closed) return;
    for (const listener of this.listeners) listener();
  }
}
