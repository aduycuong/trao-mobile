import React from 'react';
import { CatIcon } from './cat-icon';

export type TabIconKind = 'home' | 'chat' | 'stock' | 'listings' | 'me';

/** Tab icons are the canvas CatIcons; inactive tabs are gray at 45% opacity. */
export function TabIcon({
  kind,
  active,
  size = 30,
}: {
  kind: TabIconKind;
  active: boolean;
  size?: number;
}) {
  return <CatIcon kind={kind} size={size} grayscale={!active} />;
}
