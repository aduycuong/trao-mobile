import { chatInboxIdFromData, routeForNotificationData } from '../push-routing';

describe('routeForNotificationData', () => {
  it('opens the chat of a chat_message push', () => {
    expect(routeForNotificationData({ type: 'chat_message', inboxId: 'abc', seq: 4 })).toBe(
      '/chat/abc'
    );
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
