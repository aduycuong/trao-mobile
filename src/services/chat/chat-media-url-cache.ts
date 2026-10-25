import { CHAT_MEDIA_URL_MAX_IDS } from './constants';
import type { ChatMediaVariant } from '@/types/chat';
import type { ChatApi } from './chat-api';

/** A URL with less than this left is asked for again before it is used. */
const REFRESH_MARGIN_MS = 5 * 60_000;
/** Requests made within this time are sent as one batch. */
const BATCH_DELAY_MS = 30;

type Entry = { url: string; expiresAt: number };
type Waiter = {
  resolve: (url: string | null) => void;
  reject: (error: unknown) => void;
};

/**
 * Signed view URLs of chat media. Asks the server for many ids at once, keeps
 * each URL until shortly before it expires and then asks again. The server
 * leaves out ids the user may not see; those resolve to `null`.
 */
export class ChatMediaUrlCache {
  private readonly entries = new Map<string, Entry>();
  private readonly waiting = new Map<string, Waiter[]>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly api: Pick<ChatApi, 'getMediaUrls'>,
    private readonly now: () => number = Date.now
  ) {}

  /** The URL when one is cached and not about to expire, else null. */
  peek(id: string, variant: ChatMediaVariant): string | null {
    const entry = this.entries.get(keyOf(id, variant));
    return entry && entry.expiresAt - this.now() > REFRESH_MARGIN_MS ? entry.url : null;
  }

  /** The URL of an image, from the cache or from the next batch request. */
  get(id: string, variant: ChatMediaVariant): Promise<string | null> {
    const cached = this.peek(id, variant);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
      const key = keyOf(id, variant);
      const waiters = this.waiting.get(key);
      if (waiters) waiters.push({ resolve, reject });
      else this.waiting.set(key, [{ resolve, reject }]);

      this.timer ??= setTimeout(() => void this.flush(), BATCH_DELAY_MS);
    });
  }

  /** Forgets a URL, for example after the image failed to load with it. */
  invalidate(id: string, variant: ChatMediaVariant) {
    this.entries.delete(keyOf(id, variant));
  }

  private async flush() {
    this.timer = null;
    const batch = new Map(this.waiting);
    this.waiting.clear();

    const byVariant: Record<ChatMediaVariant, string[]> = { thumb: [], full: [] };
    for (const key of batch.keys()) {
      const [variant, id] = splitKey(key);
      byVariant[variant].push(id);
    }

    await Promise.all(
      (Object.keys(byVariant) as ChatMediaVariant[]).flatMap((variant) =>
        chunk(byVariant[variant], CHAT_MEDIA_URL_MAX_IDS).map((ids) =>
          this.request(variant, ids, batch)
        )
      )
    );
  }

  private async request(variant: ChatMediaVariant, ids: string[], batch: Map<string, Waiter[]>) {
    try {
      const { urls } = await this.api.getMediaUrls(ids, variant);
      for (const id of ids) {
        const key = keyOf(id, variant);
        const entry = urls[id];
        if (entry) this.entries.set(key, entry);
        for (const waiter of batch.get(key) ?? []) {
          waiter.resolve(entry?.url ?? null);
        }
      }
    } catch (error) {
      for (const id of ids) {
        for (const waiter of batch.get(keyOf(id, variant)) ?? []) {
          waiter.reject(error);
        }
      }
    }
  }
}

function keyOf(id: string, variant: ChatMediaVariant) {
  return `${variant}:${id}`;
}

function splitKey(key: string): [ChatMediaVariant, string] {
  const separator = key.indexOf(':');
  return [key.slice(0, separator) as ChatMediaVariant, key.slice(separator + 1)];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
