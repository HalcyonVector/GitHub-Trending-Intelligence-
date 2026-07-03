"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api";
import { cn, formatStat } from "@/lib/utils";
import { CommandPalette } from "@/components/shared/CommandPalette";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/this-week", label: "This Week" },
  { href: "/trends", label: "Trends" },
  { href: "/radar", label: "Radar" },
  { href: "/languages", label: "Languages" },
  { href: "/repositories", label: "Repos" },
  { href: "/compare", label: "Compare" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/search", label: "Search" },
];

type Theme = "dusk" | "paper";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dusk");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Restore saved theme on mount (pre-paint script also sets the attribute to avoid flash)
  useEffect(() => {
    const saved = window.localStorage.getItem("gti:theme") as Theme | null;
    if (saved === "dusk" || saved === "paper") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  function applyTheme(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("gti:theme", next);
    } catch {
      /* ignore */
    }
  }
  function toggleTheme() {
    const cur: Theme =
      document.documentElement.getAttribute("data-theme") === "paper" ? "paper" : "dusk";
    applyTheme(cur === "dusk" ? "paper" : "dusk");
  }

  // The ⌘K palette requests a theme toggle via a window event
  useEffect(() => {
    const handler = () => {
      const cur: Theme =
        document.documentElement.getAttribute("data-theme") === "paper" ? "paper" : "dusk";
      const next: Theme = cur === "dusk" ? "paper" : "dusk";
      setTheme(next);
      document.documentElement.setAttribute("data-theme", next);
      try {
        window.localStorage.setItem("gti:theme", next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("gti-toggle-theme", handler);
    return () => window.removeEventListener("gti-toggle-theme", handler);
  }, []);

  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, staleTime: 5 * 60_000 });
  const today = data?.top_gaining_today?.reduce((s, r) => s + r.stars_gained_today, 0);
  const week = data?.top_gaining_week?.reduce((s, r) => s + r.stars_gained_week, 0);
  const hottest = data?.trending_categories?.[0];

  const now = new Date();
  const dateLine = now
    .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="mast">
        <div className="wrap">
          <div className="masthead">
            <Link href="/" className="brand">
              <span className="dot" />
              GitHub Trending <em>Intelligence</em>
            </Link>
            <div className="issue" suppressHydrationWarning>
              Vol. I · Signal from the open-source frontier
              <br />
              {dateLine}
            </div>
          </div>
          <nav className="tabs">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn(isActive(n.href) && "on")}>
                {n.label}
              </Link>
            ))}
            <div className="spring">
              <button className="themebtn" onClick={toggleTheme}>
                {theme === "dusk" ? "◐ Dusk" : "◑ Paper"}
              </button>
              <button className="kbd" onClick={() => setCmdOpen(true)}>
                Search <span>⌘K</span>
              </button>
            </div>
          </nav>
        </div>
        <div className="indexbar">
          <div className="wrap">
            <div className="irow">
              {today !== undefined && (
                <div className="ix">
                  Today <span className="up">+{formatStat(today)} ★</span>
                </div>
              )}
              {week !== undefined && (
                <div className="ix">
                  This week <span className="up">+{formatStat(week)} ★</span>
                </div>
              )}
              {hottest && (
                <div className="ix">
                  Hottest{" "}
                  <b>
                    {hottest.category.name} · {Math.round(hottest.momentum_score)}
                  </b>
                </div>
              )}
              <div className="ix">
                Refresh <b>every 6h</b>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="wrap" style={{ paddingBottom: 90, position: "relative", zIndex: 2 }}>
        {children}
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
