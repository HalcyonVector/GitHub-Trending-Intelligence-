import type { Metadata } from "next";
import { CategoryDetailClient } from "@/components/trends/CategoryDetailClient";

export const metadata: Metadata = { title: "Category" };
export const revalidate = 300;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CategoryDetailClient slug={slug} />;
}
