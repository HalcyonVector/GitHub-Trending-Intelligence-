import { getDashboard } from "@/lib/api";
import type { RepoCard } from "@/lib/types";

export const revalidate = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:2326";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function item(r: RepoCard, kind: string): string {
  const link = `${SITE}/repos/${r.id}`;
  const title = `${r.full_name} · +${r.stars_gained_week.toLocaleString()} stars/wk`;
  const desc = `${r.description ?? "No description."} — momentum ${Math.round(
    r.momentum_score
  )}, ${kind}. Language: ${r.language ?? "n/a"}.`;
  return `    <item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <description>${esc(desc)}</description>
    </item>`;
}

export async function GET() {
  let items = "";
  let generated = new Date().toUTCString();
  try {
    const data = await getDashboard();
    generated = new Date(data.generated_at).toUTCString();
    const seen = new Set<number>();
    const picks: string[] = [];
    for (const r of [...data.top_gaining_today]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      picks.push(item(r, "hot today"));
    }
    for (const r of data.top_gaining_week) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      picks.push(item(r, "rising this week"));
    }
    items = picks.join("\n");
  } catch {
    items = "";
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>GitHub Trending Intelligence</title>
    <link>${SITE}</link>
    <description>Fastest-rising open-source repositories, refreshed every 6 hours.</description>
    <language>en</language>
    <lastBuildDate>${generated}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
    },
  });
}
