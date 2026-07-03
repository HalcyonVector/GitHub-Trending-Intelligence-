// ─── Recently-viewed repositories, stored locally (powers the ⌘K palette) ─────

export interface RecentRepo {
  id: number;
  full_name: string;
}

const KEY = "gti:recent-repos:v1";
const MAX = 8;

export function getRecentRepos(): RecentRepo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentRepo[]) : [];
  } catch {
    return [];
  }
}

export function addRecentRepo(repo: RecentRepo): void {
  if (typeof window === "undefined") return;
  try {
    const list = getRecentRepos().filter((r) => r.id !== repo.id);
    list.unshift(repo);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}
