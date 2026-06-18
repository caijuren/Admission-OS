import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authCookieNames } from "@/lib/server/auth-cookies";
import DashboardPageClient from "./dashboard-page-client";

type DashboardPageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(authCookieNames.accessToken)?.value);
  const params = await searchParams;
  const initialView = params?.view === "admissionTree" ? "admissionTree" : undefined;

  if (!hasSession) {
    redirect("/login?next=/");
  }

  return <DashboardPageClient initialView={initialView} />;
}
