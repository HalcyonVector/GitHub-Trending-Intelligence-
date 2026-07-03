import { getDashboard } from "@/lib/api";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Revalidate every 5 minutes
export const revalidate = 300;

export default async function DashboardPage() {
  // Server-side fetch for initial paint
  let data;
  try {
    data = await getDashboard();
  } catch {
    data = null;
  }

  return <DashboardClient initialData={data} />;
}
