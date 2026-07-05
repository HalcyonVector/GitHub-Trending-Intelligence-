"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getRepository, getRepositoryMetrics, getSimilarRepos } from "@/lib/api";
import { addRecentRepo } from "@/lib/recent";
import type { DailyMetric } from "@/lib/types";
import { formatStat, formatDelta, getLanguageColor, relativeTime } from "@/lib/utils";
import { parseCompetitors } from "@/lib/chart";
import { WatchButton } from "@/components/shared/WatchButton";

export function RepoDetailClient({ id }: { id: number }) {
  const { data: repo, isLoading, isError } = useQuery({
    queryKey: ["repo", id],
    queryFn: () => getRepository(id),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: metrics } = useQuery({
    queryKey: ["repo-metrics", id],
    queryFn: () => getRepositoryMetrics(id, "90d"),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: similar } = useQuery({
    queryKey: ["similar", id],
    queryFn: () => getSimilarRepos(id),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const router = useRouter();

  useEffect(() => {
    if (repo) addRecentRepo({ id: repo.id, full_name: repo.full_name });
  }, [repo]);

  if (isLoading) return <RepoSkeleton />;
  if (isError || !repo) {
    return (
      <div className="fade-up">
        <Link className="crumb" href="/" style={{ display: "inline-block", marginTop: 34 }}>
          ← Dashboard
        </Link>
        <div className="note">Repository not found, or the backend is unavailable.</div>
      </div>
    );
  }

  const daily: DailyMetric[] = metrics?.daily ?? [];
  const latestDaily = daily[daily.length - 1];
  const contributors = latestDaily?.contributors_count;
  const insight = repo.latest_insight;
  const competitors = parseCompetitors(insight?.competitors);

  const starsSeries = daily.map((d) => d.stars_total);
  const gainedSeries = daily.slice(-30).map((d) => d.stars_gained);

  // ── Hype vs. substance (#3): is momentum backed by real dev activity, or just stars? ──
  const weekly = metrics?.weekly ?? [];
  const lastWeek = weekly[weekly.length - 1];
  const commitAct = lastWeek?.commit_activity ?? latestDaily?.commit_count_week ?? 0;
  const newContrib = lastWeek?.new_contributors ?? 0;
  const forkRatio = repo.latest_stars ? repo.latest_forks / repo.latest_stars : 0;
  const hasActivity = commitAct > 0 || newContrib > 0 || forkRatio > 0.04;
  const signal = hasActivity
    ? { label: "Backed by activity", color: "var(--gain)" }
    : { label: "Star-driven", color: "var(--dim)" };
  const momentumSeries = weekly.map((w) => w.momentum_score);

  return (
    <div className="fade-up">
      <div className="rhero">
        <Link className="crumb" href="/">
          ← Dashboard / Repositories
        </Link>
        <h1>
          <span className="ow">{repo.owner} /</span> {repo.name}
        </h1>
        <p className="rdesc">{repo.description ?? "No description provided."}</p>
        <div className="rmeta">
          {repo.language && (
            <span>
              <span className="langdot" style={{ background: getLanguageColor(repo.language) }} />
              {repo.language}
            </span>
          )}
          {repo.license && <span>{repo.license}</span>}
          {repo.github_created_at && <span>◇ Created {new Date(repo.github_created_at).getFullYear()}</span>}
          {repo.last_synced_at && <span>↻ Synced {relativeTime(repo.last_synced_at)}</span>}
          {repo.categories[0] && <span className="aitag">{repo.categories[0].name}</span>}
          <span
            title="Whether momentum is backed by contributor/commit activity, or driven mainly by stars"
            style={{
              color: signal.color,
              border: `1px solid ${signal.color}`,
              borderRadius: 20,
              padding: "2px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            {signal.label}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
          <WatchButton
            repo={{
              id: repo.id,
              full_name: repo.full_name,
              name: repo.name,
              language: repo.language,
              momentum_score: repo.momentum_score,
              stars_gained_week: repo.stars_gained_week,
            }}
          />
          <Link className="watchbtn" href={`/compare?ids=${repo.id}`}>
            + Compare
          </Link>
        </div>
      </div>

      <div className="metrics">
        <Metric v={formatStat(repo.latest_stars)} d="Stars" chg={`${formatDelta(repo.stars_gained_week)} / wk`} ember />
        <Metric v={formatStat(repo.latest_forks)} d="Forks" chg={repo.latest_forks ? "" : "—"} />
        <Metric v={contributors ? formatStat(contributors) : "—"} d="Contributors" chg="" />
        <Metric v={String(Math.round(repo.momentum_score))} d="Momentum" chg={`${formatDelta(repo.stars_gained_today)} today`} ember />
      </div>

      <div className="detailgrid">
        <div>
          <div className="chartcard">
            <h4>
              Cumulative stars <span>{daily.length ? `${daily.length} days` : "no data yet"}</span>
            </h4>
            {starsSeries.length > 2 ? (
              <AreaChart values={starsSeries} />
            ) : (
              <div className="note" style={{ margin: 0 }}>Metrics will appear once daily snapshots accumulate.</div>
            )}
          </div>
          <div className="chartcard" style={{ marginTop: 22 }}>
            <h4>
              Daily stars gained <span>last {gainedSeries.length || 0} days</span>
            </h4>
            {gainedSeries.length > 1 ? (
              <BarChart values={gainedSeries} />
            ) : (
              <div className="note" style={{ margin: 0 }}>No daily velocity recorded yet.</div>
            )}
          </div>
          <div className="chartcard" style={{ marginTop: 22 }}>
            <h4>
              Momentum over time <span>last {momentumSeries.length || 0} weeks</span>
            </h4>
            {momentumSeries.length > 1 ? (
              <AreaChart values={momentumSeries} />
            ) : (
              <div className="note" style={{ margin: 0 }}>Momentum history builds each week.</div>
            )}
          </div>
        </div>

        <div className="insight">
          <div className="rulehead" style={{ marginTop: 0 }}>
            AI Analyst <span className="meta">claude · cached 24h</span>
          </div>
          {insight ? (
            <>
              {insight.why_growing && (
                <>
                  <h4>Why it&apos;s growing</h4>
                  <p>{insight.why_growing}</p>
                </>
              )}
              {insight.what_it_solves && (
                <>
                  <h4>What it solves</h4>
                  <p>{insight.what_it_solves}</p>
                </>
              )}
              {insight.who_uses_it && (
                <>
                  <h4>Who uses it</h4>
                  <p>{insight.who_uses_it}</p>
                </>
              )}
              {insight.tech_stack && (
                <>
                  <h4>Under the hood</h4>
                  <p>{insight.tech_stack}</p>
                </>
              )}
              {insight.verdict && <div className="verdict">&ldquo;{insight.verdict}&rdquo;</div>}
              {competitors.length > 0 && (
                <>
                  <h4>Competitors / alternatives</h4>
                  <div className="compet">
                    {competitors.map((c) => (
                      <a key={c}>{c}</a>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <p style={{ color: "var(--dim)" }}>
              No AI insight generated yet. Insights are produced daily for the highest-momentum
              repositories.
            </p>
          )}
          {repo.topics.length > 0 && (
            <>
              <h4>Topics</h4>
              <div className="compet">
                {repo.topics.slice(0, 8).map((t) => (
                  <a key={t}>{t}</a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {(similar?.similar?.length ?? 0) > 0 && (
        <>
          <div className="rulehead">
            Similar Repositories <span className="meta">shared categories</span>
          </div>
          {similar!.similar.map((r) => (
            <div key={r.id} className="lentry" onClick={() => router.push(`/repos/${r.id}`)}>
              <div className="rk" style={{ fontSize: 15 }}>
                →
              </div>
              <div>
                <div className="nm">
                  {r.full_name}
                  {r.language && <span className="lang">{r.language}</span>}
                </div>
                <div className="ds">{r.description ?? "No description provided."}</div>
              </div>
              <div className="rt">
                <div className="gv">{formatDelta(r.stars_gained_week)}</div>
                <div className="gl">stars/wk · {Math.round(r.momentum_score)}</div>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="foot">
        <div className="fb">{repo.full_name}</div>
        <div className="fm">Detail view · metrics + AI insight</div>
      </div>
    </div>
  );
}

function Metric({ v, d, chg, ember }: { v: string; d: string; chg: string; ember?: boolean }) {
  return (
    <div className="mc">
      <div className={`mv${ember ? " e" : ""}`}>{v}</div>
      <div className="md">{d}</div>
      {chg && <div className="mch up">{chg}</div>}
    </div>
  );
}

function AreaChart({ values }: { values: number[] }) {
  const w = 560;
  const h = 220;
  const pad = 8;
  const mx = Math.max(...values);
  const mn = Math.min(...values);
  const range = mx - mn || 1;
  const X = (i: number) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const Y = (v: number) => h - pad - ((v - mn) / range) * (h - pad * 2 - 14);
  const line = values.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${X(values.length - 1).toFixed(1)} ${h} L${X(0).toFixed(1)} ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ember)" stopOpacity="0.38" />
          <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      <path
        d={line}
        fill="none"
        stroke="var(--ember)"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ strokeDasharray: 3000, strokeDashoffset: 3000, animation: "draw 1.8s var(--ease) forwards" }}
      />
      <circle cx={X(values.length - 1).toFixed(1)} cy={Y(values[values.length - 1]).toFixed(1)} r="4" fill="var(--ember)" />
    </svg>
  );
}

function BarChart({ values }: { values: number[] }) {
  const w = 560;
  const h = 130;
  const pad = 8;
  const mx = Math.max(...values, 1);
  const gap = 2;
  const bw = (w - pad * 2) / values.length - gap;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      {values.map((v, i) => {
        const bh = (Math.max(v, 0) / mx) * (h - 16);
        return (
          <rect
            key={i}
            x={(pad + i * (bw + gap)).toFixed(1)}
            y={(h - bh).toFixed(1)}
            width={bw.toFixed(1)}
            height={bh.toFixed(1)}
            rx="1.5"
            fill="var(--ember)"
            opacity={(0.35 + (v / mx) * 0.6).toFixed(2)}
          >
            <animate attributeName="height" from="0" to={bh.toFixed(1)} dur="0.7s" begin={`${(i * 0.02).toFixed(2)}s`} fill="freeze" />
            <animate attributeName="y" from={h} to={(h - bh).toFixed(1)} dur="0.7s" begin={`${(i * 0.02).toFixed(2)}s`} fill="freeze" />
          </rect>
        );
      })}
    </svg>
  );
}

function RepoSkeleton() {
  return (
    <div style={{ marginTop: 40 }}>
      <div className="skel" style={{ height: 48, width: "60%", marginBottom: 14 }} />
      <div className="skel" style={{ height: 20, width: "80%", marginBottom: 26 }} />
      <div className="skel" style={{ height: 90, marginBottom: 24 }} />
      <div className="detailgrid">
        <div className="skel" style={{ height: 260 }} />
        <div className="skel" style={{ height: 260 }} />
      </div>
    </div>
  );
}
