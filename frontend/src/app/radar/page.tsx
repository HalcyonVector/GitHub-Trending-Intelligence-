import type { Metadata } from "next";
import { RadarClient } from "@/components/radar/RadarClient";

export const metadata: Metadata = { title: "Radar" };
export const revalidate = 300;

export default function RadarPage() {
  return <RadarClient />;
}
