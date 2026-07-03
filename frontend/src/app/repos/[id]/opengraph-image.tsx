import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "GitHub Trending Intelligence — repository";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1`;

interface RepoLite {
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  latest_stars: number;
  stars_gained_week: number;
  momentum_score: number;
}

function k(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let repo: RepoLite | null = null;
  try {
    const res = await fetch(`${API}/repositories/${id}`, { next: { revalidate: 300 } });
    if (res.ok) repo = (await res.json()) as RepoLite;
  } catch {
    repo = null;
  }

  const bg = "#1c1712";
  const ember = "#ef9367";
  const fg = "#efe7d8";
  const dim = "#b6a893";
  const dim2 = "#7e6f5c";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: bg,
          padding: "70px 76px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: dim, fontSize: 26, letterSpacing: 2 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: ember }} />
          GITHUB TRENDING INTELLIGENCE
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: dim2, fontSize: 30 }}>{repo ? repo.full_name.split("/")[0] + " /" : "repository"}</div>
          <div style={{ color: fg, fontSize: 82, fontWeight: 800, lineHeight: 1.02, marginTop: 4 }}>
            {repo ? repo.name : "Not found"}
          </div>
          <div style={{ color: dim, fontSize: 30, marginTop: 18, maxWidth: 980, lineHeight: 1.35 }}>
            {repo?.description?.slice(0, 120) ?? "Discover emerging repositories before they go mainstream."}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 64 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: ember, fontSize: 72, fontWeight: 800 }}>{repo ? Math.round(repo.momentum_score) : "—"}</div>
            <div style={{ color: dim2, fontSize: 24, letterSpacing: 2 }}>MOMENTUM</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#8fc46b", fontSize: 56, fontWeight: 800 }}>
              {repo ? `+${k(repo.stars_gained_week)}` : "—"}
            </div>
            <div style={{ color: dim2, fontSize: 24, letterSpacing: 2 }}>STARS / WEEK</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: fg, fontSize: 56, fontWeight: 800 }}>{repo ? k(repo.latest_stars) : "—"}</div>
            <div style={{ color: dim2, fontSize: 24, letterSpacing: 2 }}>TOTAL STARS</div>
          </div>
          {repo?.language ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: fg, fontSize: 56, fontWeight: 800 }}>{repo.language}</div>
              <div style={{ color: dim2, fontSize: 24, letterSpacing: 2 }}>LANGUAGE</div>
            </div>
          ) : null}
        </div>
      </div>
    ),
    size
  );
}
