import type { Metadata } from "next";
import { RepoDetailClient } from "@/components/repo/RepoDetailClient";

export const metadata: Metadata = { title: "Repository" };

export default async function RepoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RepoDetailClient id={Number(id)} />;
}
