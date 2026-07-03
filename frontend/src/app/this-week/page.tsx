import type { Metadata } from "next";
import { ThisWeekClient } from "@/components/digest/ThisWeekClient";

export const metadata: Metadata = { title: "This Week" };
export const revalidate = 300;

export default function ThisWeekPage() {
  return <ThisWeekClient />;
}
