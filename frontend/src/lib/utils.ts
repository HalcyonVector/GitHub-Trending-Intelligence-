import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with K/M suffix */
export function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/** Format a positive delta with + prefix */
export function formatDelta(n: number): string {
  if (n === 0) return "0";
  const s = formatStat(Math.abs(n));
  return n > 0 ? `+${s}` : `-${s}`;
}

/** Score → color class (Tailwind) */
export function scoreColor(score: number): string {
  if (score >= 80) return "text-score-hot";
  if (score >= 60) return "text-score-high";
  if (score >= 40) return "text-score-mid";
  return "text-score-low";
}

/** Score → background class */
export function scoreBg(score: number): string {
  if (score >= 80) return "bg-score-hot/10 border-score-hot/30";
  if (score >= 60) return "bg-score-high/10 border-score-high/30";
  if (score >= 40) return "bg-score-mid/10 border-score-mid/30";
  return "bg-score-low/10 border-score-low/30";
}

/** Language → color dot */
export const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  TypeScript: "#2b7489",
  JavaScript: "#f1e05a",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  Swift: "#ffac45",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
};

export function getLanguageColor(language: string | null): string {
  return (language && LANGUAGE_COLORS[language]) ?? "#6b7280";
}

/** Relative time */
export function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
