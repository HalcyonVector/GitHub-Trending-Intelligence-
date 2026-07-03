import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchClient } from "@/components/search/SearchClient";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="note" style={{ marginTop: 40 }}>Loading search…</div>}>
      <SearchClient />
    </Suspense>
  );
}
