"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readWatchlist,
  subscribeWatchlist,
  toggleWatch,
  removeFromWatchlist,
  type WatchItem,
} from "@/lib/watchlist";

export function useWatchlist() {
  const [items, setItems] = useState<WatchItem[]>([]);

  useEffect(() => {
    setItems(readWatchlist());
    return subscribeWatchlist(() => setItems(readWatchlist()));
  }, []);

  const isWatched = useCallback((id: number) => items.some((w) => w.id === id), [items]);
  const toggle = useCallback((item: Omit<WatchItem, "baseline_momentum" | "watched_at">) => toggleWatch(item), []);
  const remove = useCallback((id: number) => removeFromWatchlist(id), []);

  return { items, isWatched, toggle, remove };
}
