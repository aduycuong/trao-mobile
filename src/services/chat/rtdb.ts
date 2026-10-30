import {
  getDatabase,
  goOffline,
  goOnline,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  type Database,
} from 'firebase/database';
import { getFirebaseApp, isRtdbConfigured } from '@/services/firebase';
import type { PhoneVerifiedSignal } from '@/types/profile';
import { CHAT_PRESENCE_PATH, CHAT_SYNC_PATH, CHAT_TYPING_PATH } from './constants';

/**
 * Chat realtime on the Firebase JS SDK. RTDB only carries tiny signals (sync
 * doorbell, typing, presence); everything else goes through the REST API. It
 * shares the Firebase app with Auth, so the connection is authenticated as the
 * signed-in user. When RTDB is not configured, helpers no-op and the sync engine
 * falls back to polling.
 */
let database: Database | null = null;

function getDb() {
  if (database) return database;
  const app = isRtdbConfigured() ? getFirebaseApp() : null;
  database = app ? getDatabase(app) : null;
  return database;
}

/**
 * Drops the socket while the app is in the background (the server's onDisconnect then marks
 * the kid offline) and reconnects on return; the SDK resubscribes listeners and re-auths.
 */
export function setRtdbConnected(connected: boolean) {
  const db = getDb();
  if (!db) return;
  if (connected) goOnline(db);
  else goOffline(db);
}

/** Writes "offline" right away (before sign-out, while the user can still write it). */
export async function markPresenceOffline(firebaseUid: string, timeoutMs = 2000) {
  const db = getDb();
  if (!db) return;
  const write = set(ref(db, `${CHAT_PRESENCE_PATH}/${firebaseUid}`), {
    online: false,
    lastSeen: serverTimestamp(),
  }).catch(() => undefined);
  // Offline, the write only resolves once reconnected; don't hold sign-out hostage to it.
  await Promise.race([write, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
}

export function subscribeChatSyncSignal(firebaseUid: string, onPts: (pts: number) => void) {
  const db = getDb();
  if (!db) return null;
  return onValue(
    ref(db, `${CHAT_SYNC_PATH}/${firebaseUid}`),
    (snapshot) => {
      const value = snapshot.val() as { pts?: unknown } | null;
      if (value && typeof value.pts === 'number') onPts(value.pts);
    },
    (error) => console.warn('[chat] sync signal error', error)
  );
}

/** Marks the user online and flips it to offline on disconnect (server side). */
export function startChatPresence(firebaseUid: string) {
  const db = getDb();
  if (!db) return null;
  const presenceRef = ref(db, `${CHAT_PRESENCE_PATH}/${firebaseUid}`);
  const unsubscribe = onValue(ref(db, '.info/connected'), (snapshot) => {
    if (snapshot.val() !== true) return;
    void onDisconnect(presenceRef)
      .set({ online: false, lastSeen: serverTimestamp() })
      .then(() => set(presenceRef, { online: true, lastSeen: serverTimestamp() }))
      .catch((error) => console.warn('[chat] presence error', error));
  });
  return () => {
    unsubscribe();
    void set(presenceRef, { online: false, lastSeen: serverTimestamp() }).catch(() => undefined);
  };
}

export function subscribeChatPresence(firebaseUid: string, onChange: (online: boolean) => void) {
  const db = getDb();
  if (!db) return null;
  return onValue(
    ref(db, `${CHAT_PRESENCE_PATH}/${firebaseUid}`),
    (snapshot) => onChange((snapshot.val() as { online?: unknown } | null)?.online === true),
    () => onChange(false)
  );
}

function typingRef(inboxId: string, firebaseUid: string) {
  const db = getDb();
  return db ? ref(db, `${CHAT_TYPING_PATH}/${inboxId}/${firebaseUid}`) : null;
}

export async function sendChatTyping(inboxId: string, firebaseUid: string) {
  const target = typingRef(inboxId, firebaseUid);
  if (!target) return;
  try {
    void onDisconnect(target).remove();
    await set(target, Date.now());
  } catch (error) {
    console.warn('[chat] typing error', error);
  }
}

export async function clearChatTyping(inboxId: string, firebaseUid: string) {
  const target = typingRef(inboxId, firebaseUid);
  if (!target) return;
  try {
    await remove(target);
  } catch {
    // Typing is ephemeral; ignore.
  }
}

/**
 * Per user, the local time we last saw their typing value change (so clock
 * skew between devices does not matter); readers drop entries older than
 * `CHAT_TYPING_EXPIRE_MS`.
 */
export function subscribeChatTyping(
  inboxId: string,
  onChange: (lastSeenByUid: Record<string, number>) => void
) {
  const db = getDb();
  if (!db) return null;

  const lastValue = new Map<string, number>();
  const lastSeen: Record<string, number> = {};

  return onValue(
    ref(db, `${CHAT_TYPING_PATH}/${inboxId}`),
    (snapshot) => {
      const value = (snapshot.val() ?? {}) as Record<string, number>;
      const now = Date.now();
      for (const [uid, marker] of Object.entries(value)) {
        if (lastValue.get(uid) !== marker) {
          lastValue.set(uid, marker);
          lastSeen[uid] = now;
        }
      }
      for (const uid of [...lastValue.keys()]) {
        if (!(uid in value)) {
          lastValue.delete(uid);
          delete lastSeen[uid];
        }
      }
      onChange({ ...lastSeen });
    },
    () => onChange({})
  );
}

/** Doorbell for phone verification: the server writes the last verified number (masked) here. */
export const PHONE_VERIFICATION_SIGNAL_PATH = 'phone-verification';

export function subscribePhoneVerifiedSignal(
  firebaseUid: string,
  onSignal: (signal: PhoneVerifiedSignal) => void
) {
  const db = getDb();
  if (!db) return null;
  return onValue(
    ref(db, `${PHONE_VERIFICATION_SIGNAL_PATH}/${firebaseUid}`),
    (snapshot) => {
      const value = snapshot.val() as Partial<PhoneVerifiedSignal> | null;
      if (
        value &&
        typeof value.verifiedAt === 'number' &&
        typeof value.maskedPhone === 'string' &&
        typeof value.rewardAmount === 'number'
      ) {
        onSignal({
          verifiedAt: value.verifiedAt,
          maskedPhone: value.maskedPhone,
          rewardAmount: value.rewardAmount,
        });
      }
    },
    (error) => console.warn('[phone-verification] signal error', error)
  );
}

/**
 * Calls `onRing` at every change the server writes to a doorbell node, not for the value
 * already there when subscribing (the screen has just read that). Returns the unsubscribe
 * function, or null when RTDB is not available.
 */
function subscribeDoorbell(path: string, label: string, onRing: () => void) {
  const db = getDb();
  if (!db) return null;
  let first = true;
  return onValue(
    ref(db, path),
    () => {
      if (first) {
        first = false;
        return;
      }
      onRing();
    },
    (error) => console.warn(`[${label}] signal error`, error)
  );
}

/** Doorbell of a live auction: the server writes here at every bid and when the round ends. */
export const AUCTION_SIGNAL_PATH = 'auction-signal';

export function subscribeAuctionSignal(listingId: string, onRing: () => void) {
  return subscribeDoorbell(`${AUCTION_SIGNAL_PATH}/${listingId}`, 'auctions', onRing);
}

/**
 * Doorbell of the public parts of a listing page: `listing-signal/{listingId}/comments` gets the
 * time of the last comment or reply posted, deleted or hidden. Guests may read it.
 */
export const LISTING_SIGNAL_PATH = 'listing-signal';
export type ListingSignalKind = 'comments';

export function subscribeListingSignal(
  listingId: string,
  kind: ListingSignalKind,
  onRing: () => void
) {
  return subscribeDoorbell(`${LISTING_SIGNAL_PATH}/${listingId}/${kind}`, 'listings', onRing);
}

/**
 * Doorbell of what changed for one user, readable by that user only: `deals` (an offer was sent,
 * taken back, answered or declined, or a transaction was confirmed, cancelled or reviewed) and
 * `notifications` (one was added to the list).
 */
export const USER_EVENT_PATH = 'user-events';
export type UserEventKind = 'deals' | 'notifications';

export function subscribeUserEvent(firebaseUid: string, kind: UserEventKind, onRing: () => void) {
  return subscribeDoorbell(`${USER_EVENT_PATH}/${firebaseUid}/${kind}`, 'user-events', onRing);
}

/**
 * Doorbell of the check of the user's items (`item-media/{firebaseUid}`): the server writes the
 * last change when a file of one of the items finishes its check. Unlike the other doorbells the
 * callback also runs right after subscribing, in case the change came before the listener was
 * ready.
 */
export const ITEM_MEDIA_SIGNAL_PATH = 'item-media';

export function subscribeItemMediaSignal(firebaseUid: string, onRing: () => void) {
  const db = getDb();
  if (!db) return null;
  return onValue(
    ref(db, `${ITEM_MEDIA_SIGNAL_PATH}/${firebaseUid}`),
    () => onRing(),
    (error) => console.warn('[items] item media signal error', error)
  );
}
