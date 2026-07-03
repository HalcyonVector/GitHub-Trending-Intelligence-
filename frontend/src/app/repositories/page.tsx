import type { Metadata } from "next";
import { Suspense } from "react";
import { RepositoriesClient } from "@/components/repositories/RepositoriesClient";

export const metadata: Metadata = { title: "Repositories" };

export default function RepositoriesPage() {
  return (
    <Suspense fallback={<div className="note" style={{ marginTop: 40 }}>Loading repositories…</div>}>
      <RepositoriesClient />
    </Suspense>
  );
}
