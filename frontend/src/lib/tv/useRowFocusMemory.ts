import { useEffect, useState } from 'react';

/**
 * Remembers a TV row's focused index (and loop state) across unmount/remount.
 * The rows are windowed carousels — only ~6 cards exist in the DOM — so when
 * the user navigates back to the page, the focus memory in focusMemory.ts can
 * only re-focus the card they left from if the row renders its window around
 * that card again instead of resetting to index 0.
 *
 * Keyed by pathname + a per-row key so the same row component on different
 * pages (and different rows on one page) don't share state. Session-scoped:
 * a module Map, deliberately not persisted.
 */

interface RowFocusState {
  index: number;
  hasLooped: boolean;
}

const rowMemory = new Map<string, RowFocusState>();

export function useRowFocusMemory(rowKey: string) {
  const key = `${window.location.pathname}|${rowKey}`;
  const remembered = rowMemory.get(key);
  const [focusedIndex, setFocusedIndex] = useState(remembered?.index ?? 0);
  const [hasLooped, setHasLooped] = useState(remembered?.hasLooped ?? false);

  useEffect(() => {
    rowMemory.set(key, { index: focusedIndex, hasLooped });
  }, [key, focusedIndex, hasLooped]);

  return { focusedIndex, setFocusedIndex, hasLooped, setHasLooped };
}
