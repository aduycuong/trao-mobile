import { Directory, File, Paths } from 'expo-file-system';
import type { ChatLocalStore, LocalMediaItem } from '@/types/chat';

/** A file nothing points to is only removed once it is this old (it may still be getting saved). */
const ORPHAN_MIN_AGE_MS = 10 * 60_000;

/**
 * Prepared images of one user's drafts and queued media messages. They live in
 * the document directory (the cache directory can be emptied by the OS while a
 * message still waits to upload) and are removed once nothing refers to them.
 */
export class ChatMediaFiles {
  readonly directory: Directory;

  constructor(userKey: string) {
    this.directory = new Directory(Paths.document, 'chat-media', userKey);
  }

  /** Moves a freshly encoded file into the user's folder and returns its new uri. */
  async keep(uri: string, name: string): Promise<string> {
    this.directory.create({ intermediates: true, idempotent: true });
    const target = new File(this.directory, name);
    await new File(uri).move(target);
    return target.uri;
  }

  /** Deletes the files of images that were dropped (removed from a draft, discarded). */
  remove(items: LocalMediaItem[]) {
    for (const item of items) {
      for (const uri of [item.uri, item.thumbUri]) {
        try {
          const file = new File(uri);
          if (file.exists) file.delete();
        } catch {
          // Best effort: the sweep picks it up later.
        }
      }
    }
  }

  /**
   * Deletes every file that no draft and no queued message refers to, for
   * example the images of a message the server has confirmed.
   */
  async sweep(store: ChatLocalStore) {
    if (!this.directory.exists) return;
    const [drafts, queued] = await Promise.all([store.listDrafts(), store.listOutgoingMedia()]);
    const used = new Set<string>();
    for (const item of [...drafts, ...queued].flatMap((entry) => entry.media)) {
      used.add(item.uri);
      used.add(item.thumbUri);
    }

    const now = Date.now();
    for (const entry of this.directory.list()) {
      if (!(entry instanceof File) || used.has(entry.uri)) continue;
      try {
        const modified = entry.info().modificationTime ?? 0;
        if (now - modified > ORPHAN_MIN_AGE_MS) entry.delete();
      } catch {
        // Try again at the next sweep.
      }
    }
  }
}
