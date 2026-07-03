"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getRadar } from "@/lib/api";
import type { RadarCategory } from "@/lib/types";
import { formatDelta } from "@/lib/utils";
import { Sparkline } from "@/components/shared/Sparkline";

/** Build a short synthetic series for a decorative sparkline, seeded by score + delta. */
function series(score: number, delta: number): number[] {
  return Array.from({ length: 10 }, (_, i) => {
    const drift = (delta / 9) * i;
    const wobble = Math.sin(i * 0.9 + score) * 2.2;
    return score - delta / 2 + drift + wobble;
  });
}

function statusOf(delta: number, score: number): "rising" | "stable" | "declining" {
  if (score >= 65 && delta > 5) return "rising";
  if (score < 35 || delta < -5) return "declining";
  return "stable";
}

export function TrendsClient() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["radar"], queryFn: getRadar, staleTime: 5 * 60_000 });

  const all: RadarCategory[] = data
    ? [...data.rising, ...data.stable, ...data.declining].sort((a, b) => b.momentum_score - a.momentum_score)
    : [];

  return (
    <div className="fade-up">
      <div className="kicker">Trend Discovery · 7-day window</div>
      <h1 className="big">
        Where the <span className="ember">gravity</span> is moving.
      </h1>
      <p className="standfirst">
        Every technology category, ranked by composite momentum — star, fork, contributor and commit
        velocity, log-normalized into a single 0–100 signal.
      </p>

      <div className="rulehead">
        Category Rankings <span className="meta">momentum · Δ vs last week</span>
      </div>

      {isLoading && !data ? (
        <TrendsSkeleton />
      ) : all.length ? (
        <div>
          {all.map((c, i) => {
            const delta = c.change_vs_last_week;
            const st = statusOf(delta, c.momentum_score);
            return (
              <div
                key={c.category.id}
                className="trendrow"
                onClick={() => router.push(`/trends/${c.category.slug}`)}
              >
                <div className="idx">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div className="tn">{c.category.name}</div>
                  <div className="td">
                    {c.repo_count.toLocaleString()} repos · {formatDelta(c.stars_gained_week)} stars this week
                  </div>
                </div>
                <div className="tspark">
                  <Sparkline
                    values={series(c.momentum_score, delta)}
                    width={150}
                    height={44}
                    color={delta >= 0 ? "var(--gain)" : "var(--loss)"}
                  />
                </div>
                <div className="tsc">
                  <div className="v">{Math.round(c.momentum_score)}</div>
                  <div className={`d ${delta >= 0 ? "up" : "dn"}`}>
                    {delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "— "}
                    {Math.abs(delta).toFixed(1)} wow · {st}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="note">No trend data yet — categories appear once snapshots are computed.</div>
      )}

      <div className="foot">
        <div className="fb">{all.length} categories</div>
        <div className="fm">Momentum = star + fork + contributor + commit velocity, log-normalized</div>
      </div>
    </div>
  );
}

function TrendsSkeleton() {
  return (
    <div style={{ marginTop: 12 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skel" style={{ height: 66, marginBottom: 8 }} />
      ))}
    </div>
  );
}
