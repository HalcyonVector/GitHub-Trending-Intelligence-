"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { search as searchApi } from "@/lib/api";
import type { RepoCard } from "@/lib/types";
import { formatDelta, getLanguageColor } from "@/lib/utils";

const FILTERS = ["All", "Python", "TypeScript", "Go", "Rust", "JavaScript"];

export function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Keep the URL in sync so results are shareable
  useEffect(() => {
    const sp = new URLSearchParams();
    if (debounced.trim()) sp.set("q", debounced.trim());
    router.replace(`/search${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
  }, [debounced, router]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchApi(debounced, 20),
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
  });

  const results = useMemo(() => {
    let repos: RepoCard[] = data?.repos ?? [];
    if (filter !== "All") repos = repos.filter((r) => r.language === filter);
    return repos;
  }, [data, filter]);

  return (
    <div className="fade-up">
      <div className="kicker">Full-text · PostgreSQL FTS</div>
      <h1 className="big">
        Find it before it <span className="ember">trends.</span>
      </h1>

      <div className="searchbox">
        <span className="ico">⌕</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="vector database · ai agent · mcp server …"
        />
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <span key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {debounced.trim().length < 2 ? (
          <div className="note">Type at least two characters to search across every tracked repository.</div>
        ) : results.length ? (
          results.map((r) => (
            <div key={r.id} className="sresult" onClick={() => router.push(`/repos/${r.id}`)}>
              <span className="langdot" style={{ background: getLanguageColor(r.language) }} />
              <div>
                <div className="sn">{r.full_name}</div>
                <div className="sd">{r.description ?? "No description provided."}</div>
                <div className="st">
                  {r.language && <span className="tag">{r.language}</span>}
                  {r.topics.slice(0, 3).map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ss">
                <div className="a">{formatDelta(r.stars_gained_week)}</div>
                <div className="b">momentum {Math.round(r.momentum_score)}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="note">No matches for “{debounced}”.</div>
        )}
      </div>

      {data && debounced.trim().length >= 2 && (
        <div className="tookms">
          {data.total_repos.toLocaleString()} results · took {data.took_ms}ms
          {isFetching ? " · updating…" : ""}
        </div>
      )}

      <div className="foot">
        <div className="fb">Sub-50ms full-text</div>
        <div className="fm">GIN index · to_tsvector(name + description)</div>
      </div>
    </div>
  );
}
