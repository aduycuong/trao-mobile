let activeInboxId: string | null = null;

/** The chat thread on screen; its pushes are not shown as banners while it is open. */
export function setActiveChatInbox(inboxId: string | null) {
  activeInboxId = inboxId;
}

export function getActiveChatInbox() {
  return activeInboxId;
}
