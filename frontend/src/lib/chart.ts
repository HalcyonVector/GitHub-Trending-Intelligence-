// ─── Lightweight inline SVG chart helpers (no external chart lib needed) ──────

/** Build an SVG path `d` string for a sparkline given raw values. */
export function sparkPath(values: number[], w: number, h: number): string {
  if (!values.length) return "";
  const mx = Math.max(...values);
  const mn = Math.min(...values);
  const r = mx - mn || 1;
  return values
    .map(
      (n, i) =>
        `${i ? "L" : "M"}${((i / (values.length - 1)) * w).toFixed(1)} ${(
          h -
          ((n - mn) / r) * h
        ).toFixed(1)}`
    )
    .join(" ");
}

/** Last-point Y coordinate for placing the terminal dot. */
export function sparkLastY(values: number[], h: number): number {
  const mx = Math.max(...values);
  const mn = Math.min(...values);
  const r = mx - mn || 1;
  return h - ((values[values.length - 1] - mn) / r) * h;
}

export type RadarStatus = "rising" | "stable" | "declining";

/** Map a radar status to a CSS-variable color token. */
export function statusColor(status: string): string {
  if (status === "rising") return "var(--gain)";
  if (status === "declining") return "var(--loss)";
  return "var(--dim)";
}

/** Parse the competitors field, which the API returns as a JSON string. */
export function parseCompetitors(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
