import { NOTIFICATION_TYPE_LIST } from '@/services/notifications/notification-rules';
import {
  chatInboxIdFromData,
  routeForNotification,
  routeForNotificationData,
  routeForWebPath,
} from '../push-routing';

describe('routeForNotificationData', () => {
  it('opens the chat of a chat_message push', () => {
    expect(routeForNotificationData({ type: 'chat_message', inboxId: 'abc', seq: 4 })).toBe(
      '/chat/abc'
    );
  });

  it('opens the listing of an offer or bid push', () => {
    expect(routeForNotificationData({ listingId: 'l1', dealId: 'd1' })).toBe('/l/l1');
  });

  it('opens the report, the case or the card a push is about', () => {
    expect(routeForNotificationData({ reportId: 'r1' })).toBe('/reports/r1');
    expect(routeForNotificationData({ caseId: 'c1' })).toBe('/cases/c1');
    expect(routeForNotificationData({ penaltyId: 'p1' })).toBe('/penalty/p1');
  });

  it('opens a transaction or a stock item before the listing', () => {
    expect(routeForNotificationData({ transactionId: 't1' })).toBe('/transactions/t1');
    expect(routeForNotificationData({ listingId: 'l1', dealId: 'd1', transactionId: 't1' })).toBe(
      '/transactions/t1'
    );
    expect(routeForNotificationData({ itemId: 'i1' })).toBe('/stock/i1');
  });

  it('ignores unknown or malformed data', () => {
    expect(routeForNotificationData(undefined)).toBeNull();
    expect(routeForNotificationData({ type: 'other' })).toBeNull();
    expect(routeForNotificationData({ type: 'chat_message', inboxId: 5 })).toBeNull();
  });
});

describe('chatInboxIdFromData', () => {
  it('reads the inbox of a chat push only', () => {
    expect(chatInboxIdFromData({ type: 'chat_message', inboxId: 'abc' })).toBe('abc');
    expect(chatInboxIdFromData({ type: 'task', inboxId: 'abc' })).toBeNull();
  });
});

describe('routeForWebPath', () => {
  it.each([
    ['/app/l/l1', '/l/l1'],
    ['/app/listings/l1', '/listings/l1'],
    ['/app/stock/i1', '/stock/i1'],
    ['/app/transactions/t1', '/transactions/t1'],
    ['/app/transactions/t1/review', '/transactions/t1/review'],
    ['/app/chat/item/l1', '/l/l1'],
    ['/app/chat', '/chat'],
    ['/app/u/u1', '/u/u1'],
    ['/app/me', '/me'],
    ['/app/reports/r1', '/reports/r1'],
    ['/app/cases/c1', '/cases/c1'],
    ['/app/penalty/p1', '/penalty/p1'],
    ['/app/penalty', '/penalty'],
    ['/app/listings', '/listings'],
    ['/app/stock', '/stock'],
    ['/app', '/'],
  ])('%s opens %s', (href, route) => {
    expect(routeForWebPath(href)).toBe(route);
  });

  it('knows nothing of other paths', () => {
    expect(routeForWebPath('/somewhere')).toBeNull();
    expect(routeForWebPath('/app/unknown/1')).toBeNull();
    expect(routeForWebPath('/app/l')).toBeNull();
  });
});

describe('routeForNotification', () => {
  // The path the web API writes for each type (`describe-notification.ts`), with and without ids.
  const WITH_IDS: Record<string, string> = {
    bid_outbid: '/app/l/l1',
    bid_ending_soon: '/app/l/l1',
    bid_won: '/app/transactions/t1',
    bid_lost: '/app/l/l1',
    bid_offered: '/app/l/l1',
    deal_offer_received: '/app/chat/item/l1',
    deal_offer_withdrawn: '/app/chat/item/l1',
    deal_offer_accepted: '/app/transactions/t1',
    deal_offer_declined: '/app/l/l1',
    offer_auto_declined: '/app/l/l1',
    transaction_confirmed: '/app/transactions/t1',
    transaction_completed: '/app/transactions/t1',
    transaction_cancelled: '/app/transactions/t1',
    transaction_reminder: '/app/transactions/t1',
    review_received: '/app/u/u1',
    review_waiting: '/app/transactions/t1/review',
    review_reminder: '/app/transactions/t1/review',
    listing_approved: '/app/l/l1',
    listing_rejected: '/app/listings/l1',
    listing_edit_dropped: '/app/listings/l1',
    listing_hidden: '/app/listings/l1',
    item_media_removed: '/app/stock/i1',
    my_auction_ended: '/app/transactions/t1',
    my_auction_failed: '/app/listings/l1',
    my_auction_bid: '/app/listings/l1',
    listing_comment: '/app/l/l1',
    liked_listing_price: '/app/l/l1',
    liked_listing_closed: '/app/l/l1',
    followee_listing: '/app/l/l1',
    liked_listing_comment: '/app/l/l1',
    comment_reply: '/app/l/l1',
    reward_received: '/app/me',
    reward_revoked: '/app/me',
    report_resolved: '/app/reports/r1',
    case_statement_requested: '/app/cases/c1',
    case_decided: '/app/cases/c1',
    penalty_issued: '/app/penalty/p1',
    penalty_revoked: '/app/penalty/p1',
    appeal_decided: '/app/penalty/p1',
    violation_notice: '/app/me',
  };
  const EXPECTED: Record<string, string> = {
    deal_offer_received: '/l/l1',
    deal_offer_withdrawn: '/l/l1',
  };

  it('covers every notification type', () => {
    expect(Object.keys(WITH_IDS).sort()).toEqual([...NOTIFICATION_TYPE_LIST].sort());
  });

  it.each(Object.entries(WITH_IDS))('opens a screen for %s (%s)', (type, href) => {
    const route = routeForNotification({ type, href });
    const web = routeForWebPath(href);
    expect(route).toBe(web);
    expect(route.startsWith('/')).toBe(true);
    if (EXPECTED[type]) expect(route).toBe(EXPECTED[type]);
  });

  it('falls back to the home of the group when the path is unknown', () => {
    expect(routeForNotification({ type: 'bid_outbid', href: '/app/nowhere' })).toBe('/chat');
    expect(routeForNotification({ type: 'listing_rejected', href: '' })).toBe('/listings');
    expect(routeForNotification({ type: 'followee_listing', href: '/app/l' })).toBe('/');
    expect(routeForNotification({ type: 'penalty_issued', href: '/app/zzz' })).toBe('/me');
    expect(routeForNotification({ type: 'something_new', href: '/app/zzz' })).toBe('/');
  });

  it('agrees with the push of the same place', () => {
    expect(routeForNotification({ type: 'case_decided', href: '/app/cases/c1' })).toBe(
      routeForNotificationData({ caseId: 'c1' })
    );
    expect(routeForNotification({ type: 'bid_won', href: '/app/transactions/t1' })).toBe(
      routeForNotificationData({ listingId: 'l1', transactionId: 't1' })
    );
    expect(routeForNotification({ type: 'item_media_removed', href: '/app/stock/i1' })).toBe(
      routeForNotificationData({ itemId: 'i1' })
    );
    expect(routeForNotification({ type: 'bid_outbid', href: '/app/l/l1' })).toBe(
      routeForNotificationData({ listingId: 'l1' })
    );
  });
});
