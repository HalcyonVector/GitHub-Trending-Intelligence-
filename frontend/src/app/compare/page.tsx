import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareClient } from "@/components/compare/CompareClient";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="note" style={{ marginTop: 40 }}>Loading compare…</div>}>
      <CompareClient />
    </Suspense>
  );
}
