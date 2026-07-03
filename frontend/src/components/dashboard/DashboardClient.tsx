"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api";
import type { CategoryMomentum, DashboardData, RepoCard } from "@/lib/types";
import { formatStat, formatDelta } from "@/lib/utils";

interface Props {
  initialData: DashboardData | null;
}

export function DashboardClient({ initialData }: Props) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    initialData: initialData ?? undefined,
    staleTime: 5 * 60_000,
  });

  const lead = data?.top_gaining_week?.[0];
  const second = data?.top_gaining_week?.[1];
  const trendingNow = (data?.top_gaining_today ?? []).slice(0, 6);
  const hotToday = (data?.top_gaining_today ?? []).slice(0, 6);
  const riseWeek = (data?.top_gaining_week ?? []).slice(0, 6);
  const cats = data?.trending_categories ?? [];
  const newEntrants = data?.new_entrants ?? [];
  const aiEco = data?.ai_ecosystem ?? [];

  const totalToday = (data?.top_gaining_today ?? []).reduce((s, r) => s + r.stars_gained_today, 0);
  const totalWeek = (data?.top_gaining_week ?? []).reduce((s, r) => s + r.stars_gained_week, 0);
  const topScore = cats[0] ? Math.round(cats[0].momentum_score) : 0;

  // On a fresh DB there's no velocity yet (needs a 2nd snapshot), so gains/momentum
  // are all 0. Detect that and fall back to ranking by total stars (footprint).
  const hasVelocity = totalWeek > 0;
  const featured = Array.from(
    new Map(
      [...(data?.top_gaining_week ?? []), ...(data?.top_gaining_today ?? [])].map((r) => [r.id, r])
    ).values()
  );
  const byStars = [...featured].sort((a, b) => b.latest_stars - a.latest_stars);
  const leader = hasVelocity ? lead : byStars[0];
  const runnerUp = hasVelocity ? second : byStars[1];
  const totalStars = featured.reduce((s, r) => s + r.latest_stars, 0);

  if (isLoading && !data) return <DashboardSkeleton />;

  return (
    <div className="fade-up">
      <div className="kicker">The Big Story · This week</div>
      {leader ? (
        <>
          <h1 className="big">
            {leader.name}{" "}
            <span className="ember">
              {hasVelocity ? "is pulling the ecosystem forward." : "leads the board."}
            </span>
          </h1>
          <p className="standfirst">
            {leader.description ??
              "One of the most-watched repositories on the open-source frontier."}
          </p>

          <div className="lead">
            <div>
              {hasVelocity ? (
                <p className="drop">
                  Momentum sharpened this week as{" "}
                  <Link className="inl" href={`/repos/${leader.id}`}>
                    {leader.full_name}
                  </Link>{" "}
                  added {formatStat(leader.stars_gained_week)} stars in seven days, the steepest
                  climb among everything tracked. Its {leader.language ?? "polyglot"} core and{" "}
                  {Math.round(leader.momentum_score)} momentum score put it clear at the top.
                </p>
              ) : (
                <p className="drop">
                  The tracker is indexing {featured.length}+ repositories across {cats.length}{" "}
                  categories, led by{" "}
                  <Link className="inl" href={`/repos/${leader.id}`}>
                    {leader.full_name}
                  </Link>{" "}
                  at {formatStat(leader.latest_stars)} stars. Velocity and momentum begin populating
                  after the next ingest cycle; until then, the board ranks by footprint.
                </p>
              )}
              {runnerUp && (
                <p>
                  {hasVelocity ? "Close behind, " : "Also prominent: "}
                  <Link className="inl" href={`/repos/${runnerUp.id}`}>
                    {runnerUp.full_name}
                  </Link>{" "}
                  {hasVelocity
                    ? `gained ${formatStat(
                        runnerUp.stars_gained_week
                      )}, part of a broader shift where production tooling keeps displacing last year's experiments.`
                    : `at ${formatStat(
                        runnerUp.latest_stars
                      )} stars, among the most starred projects currently indexed.`}
                </p>
              )}
              <p>
                {hasVelocity
                  ? `Zoom out and the churn is the story. ${formatStat(
                      totalToday
                    )} stars changed hands today alone, ${newEntrants.length} projects are brand new this week, and all ${
                      cats.length
                    } tracked categories are moving at once, a live read on where developer attention is compounding fastest.`
                  : `Once a second daily snapshot lands, this same board re-ranks by velocity, surfacing which of these ${featured.length} projects are genuinely accelerating rather than simply large and lifting the fastest climbers to the top automatically.`}
              </p>
              <p>
                {hasVelocity
                  ? `Each repository opens to the full picture: a 90-day star curve, daily velocity, and an AI-written read on why it's growing, what it solves, and who is using it. The leaderboard is the starting point; the detail pages are where the signal sharpens.`
                  : `Each repository still opens to its full profile, covering description, language, topics, and total footprint, alongside the metrics that begin driving momentum the moment a second daily snapshot lands.`}
              </p>
              <p>
                Data refreshes every six hours. Categories are inferred from topics and language, and
                momentum blends star, fork, contributor, and commit velocity into a single score from
                0 to 100.
              </p>
            </div>
            <aside className="side">
              <h3>{hasVelocity ? "Trending Now" : "Most Starred"}</h3>
              {(hasVelocity ? trendingNow : byStars.slice(0, 6)).map((r, i) => (
                <div key={r.id} className="row" onClick={() => router.push(`/repos/${r.id}`)}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <div className="body">
                    <div className="t">{r.name}</div>
                    <div className="m">
                      {r.language ?? "—"} ·{" "}
                      {hasVelocity ? (
                        <>
                          <b>{Math.round(r.momentum_score)}</b> momentum ·{" "}
                          {formatDelta(r.stars_gained_today)}
                        </>
                      ) : (
                        <>{formatStat(r.latest_stars)} stars</>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </aside>
          </div>

          <div className="bigstats">
            {hasVelocity ? (
              <>
                <Stat n={`+${formatStat(totalToday)}`} l="Stars today" />
                <Stat n={`+${formatStat(totalWeek)}`} l="Stars this week" ember />
                <Stat n={String(cats.length)} l="Categories" />
                <Stat n={String(newEntrants.length)} l="New entrants" />
                <Stat n={String(topScore)} l="Top momentum" ember />
                <Stat n="6h" l="Refresh" />
              </>
            ) : (
              <>
                <Stat n={formatStat(totalStars)} l="Stars tracked" ember />
                <Stat n={String(featured.length)} l="Repos indexed" />
                <Stat n={String(cats.length)} l="Categories" />
                <Stat n={String(newEntrants.length)} l="New entrants" />
                <Stat n="6h" l="Refresh" />
              </>
            )}
          </div>
        </>
      ) : (
        <EmptyState />
      )}

      <div className="rulehead">
        The Leaderboards <span className="meta">by star velocity</span>
      </div>
      <div className="cols">
        <div>
          <div className="kicker" style={{ marginTop: 20 }}>
            Hottest Today
          </div>
          {hotToday.map((r, i) => (
            <LeaderEntry key={r.id} rank={i + 1} repo={r} metric={r.stars_gained_today} label="today" />
          ))}
        </div>
        <div>
          <div className="kicker" style={{ marginTop: 20 }}>
            Rising This Week
          </div>
          {riseWeek.map((r, i) => (
            <LeaderEntry key={r.id} rank={i + 1} repo={r} metric={r.stars_gained_week} label="week" />
          ))}
        </div>
      </div>

      <div className="rulehead">
        Category Momentum <span className="meta">composite velocity · 0–100</span>
      </div>
      <div className="catgrid">
        {cats.map((c) => (
          <CategoryCard key={c.category.id} c={c} />
        ))}
      </div>

      <div className="panelrow" style={{ marginTop: 12 }}>
        <div>
          <div className="rulehead">
            New Entrants <span className="meta">first seen &lt; 14d</span>
          </div>
          {newEntrants.map((r) => (
            <div key={r.id} className="mini" onClick={() => router.push(`/repos/${r.id}`)}>
              <span className="mn">{r.full_name}</span>
              <span className="badge-new">new</span>
              <span className="mg">{formatDelta(r.stars_gained_week)}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="rulehead">
            AI Ecosystem <span className="meta">agents · llm · inference</span>
          </div>
          {aiEco.map((r) => (
            <div key={r.id} className="mini" onClick={() => router.push(`/repos/${r.id}`)}>
              <span className="mn">{r.full_name}</span>
              <span className="mg">{formatDelta(r.stars_gained_week)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="foot">
        <div className="fb">
          GitHub Trending <span style={{ color: "var(--ember)" }}>Intelligence</span>
        </div>
        <div className="fm" suppressHydrationWarning>
          {data?.generated_at
            ? `Updated ${new Date(data.generated_at).toLocaleTimeString()}`
            : "Bloomberg terminal for open source"}
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l, ember }: { n: string; l: string; ember?: boolean }) {
  return (
    <div>
      <div className={`n${ember ? " e" : ""}`}>{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}


function LeaderEntry({
  rank,
  repo,
  metric,
  label,
}: {
  rank: number;
  repo: RepoCard;
  metric: number;
  label: string;
}) {
  const router = useRouter();
  return (
    <div className="lentry" onClick={() => router.push(`/repos/${repo.id}`)}>
      <div className="rk">{rank}</div>
      <div>
        <div className="nm">
          {repo.name}
          {repo.language && <span className="lang">{repo.language}</span>}
        </div>
        <div className="ds">{repo.description ?? "No description provided."}</div>
      </div>
      <div className="rt">
        <div className="gv">{formatDelta(metric)}</div>
        <div className="gl">stars/{label}</div>
      </div>
    </div>
  );
}

function CategoryCard({ c }: { c: CategoryMomentum }) {
  const router = useRouter();
  const status = (c.radar_status ?? "stable") as "rising" | "stable" | "declining";
  return (
    <div className="cat" onClick={() => router.push(`/trends`)}>
      <div className="cn">{c.category.name}</div>
      <div className="cs">
        <span className={`pill ${status}`}>{status}</span>
        <span>{c.repo_count.toLocaleString()} repos</span>
      </div>
      <div className="score">{Math.round(c.momentum_score)}</div>
      <div className="sub">{formatDelta(c.stars_gained_week)} stars / wk</div>
      <div className="bar">
        <i style={{ width: `${Math.min(100, Math.round(c.momentum_score))}%` }} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="note" style={{ marginTop: 30 }}>
      No dashboard data yet. Once the backend has ingested trending repositories, the Big Story and
      leaderboards will populate here automatically.
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ marginTop: 40 }}>
      <div className="skel" style={{ height: 60, width: "70%", marginBottom: 16 }} />
      <div className="skel" style={{ height: 20, width: "50%", marginBottom: 40 }} />
      <div className="cols">
        {[0, 1].map((col) => (
          <div key={col}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 54, marginBottom: 12 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
