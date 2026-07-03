"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { search as searchApi } from "@/lib/api";
import { formatDelta } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["cmdk-search", q],
    queryFn: () => searchApi(q, 8),
    enabled: open && q.trim().length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const repos = data?.repos ?? [];

  function goto(id: number) {
    onClose();
    router.push(`/repos/${id}`);
  }

  return (
    <div className="cmdk" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdbox" role="dialog" aria-modal="true">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search repositories…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onClose();
              router.push(`/search?q=${encodeURIComponent(q)}`);
            }
          }}
        />
        <div className="cres">
          {q.trim().length < 2 ? (
            <div className="cr">
              <span className="cn" style={{ color: "var(--dim)" }}>
                Type at least two characters…
              </span>
            </div>
          ) : repos.length ? (
            repos.map((r) => (
              <div key={r.id} className="cr" onClick={() => goto(r.id)}>
                <span className="cn">{r.full_name}</span>
                <span className="cg">{formatDelta(r.stars_gained_week)}</span>
              </div>
            ))
          ) : (
            <div className="cr">
              <span className="cn" style={{ color: "var(--dim)" }}>
                No matches
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
