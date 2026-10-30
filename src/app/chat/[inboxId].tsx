import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ChatThreadScreen } from '@/components/chat/chat-thread-screen';

/** A chat thread. `listing` is the listing the talk is about (opened from a listing page). */
export default function ChatThreadRoute() {
  const { inboxId, listing } = useLocalSearchParams<{ inboxId: string; listing?: string }>();
  return <ChatThreadScreen key={inboxId} inboxId={inboxId} listingId={listing} />;
}
