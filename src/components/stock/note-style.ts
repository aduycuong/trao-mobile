import type { ItemNoteTone } from '@/types/stock';

/** Colour and icon path of the placement note under an item (canvas StockList). */
export const NOTE_STYLE: Record<ItemNoteTone, { color: string; icon: string }> = {
  live: { color: '#1673D9', icon: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01' },
  soon: { color: '#5A6772', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2' },
  deal: { color: '#8A5A00', icon: 'M4 12l4 4 12-12' },
  bad: { color: '#B42318', icon: 'M12 3l9 16H3zM12 10v4M12 17h.01' },
};
