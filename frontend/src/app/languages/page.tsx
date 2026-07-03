import type { Metadata } from "next";
import { LanguagesClient } from "@/components/languages/LanguagesClient";

export const metadata: Metadata = { title: "Languages" };
export const revalidate = 300;

export default function LanguagesPage() {
  return <LanguagesClient />;
}
