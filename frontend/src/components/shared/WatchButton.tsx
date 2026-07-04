"use client";

import { useWatchlist } from "@/hooks/useWatchlist";
import type { WatchItem } from "@/lib/watchlist";

type WatchInput = Omit<WatchItem, "baseline_momentum" | "watched_at">;

interface Props {
  repo: WatchInput;
  variant?: "button" | "icon";
}

/** Star toggle that adds/removes a repo from the local watchlist. */
export function WatchButton({ repo, variant = "button" }: Props) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(repo.id);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(repo);
  }

  if (variant === "icon") {
    return (
      <button
        className={`watchicon${watched ? " on" : ""}`}
        onClick={onClick}
        aria-pressed={watched}
        aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
        title={watched ? "Remove from watchlist" : "Add to watchlist"}
      >
        {watched ? "★" : "☆"}
      </button>
    );
  }

  return (
    <button className={`watchbtn${watched ? " on" : ""}`} onClick={onClick} aria-pressed={watched}>
      {watched ? "★ Watching" : "☆ Watch"}
    </button>
  );
}
