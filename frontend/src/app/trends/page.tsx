import type { Metadata } from "next";
import { TrendsClient } from "@/components/trends/TrendsClient";

export const metadata: Metadata = { title: "Trends" };
export const revalidate = 300;

export default function TrendsPage() {
  return <TrendsClient />;
}
