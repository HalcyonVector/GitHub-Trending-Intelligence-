"use client";

import { useQuery } from "@tanstack/react-query";
import { getSparklines } from "@/lib/api";

/** Fetch 7-day star-gain series for a set of repo ids (batched, cached). */
export function useSparklines(ids: number[]): Record<string, number[]> {
  const key = [...ids].sort((a, b) => a - b).join(",");
  const { data } = useQuery({
    queryKey: ["sparklines", key],
    queryFn: () => getSparklines(ids),
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  });
  return data?.sparklines ?? {};
}
