import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authCookieNames } from "@/lib/server/auth-cookies";
import DashboardPageClient from "./dashboard-page-client";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(authCookieNames.accessToken)?.value);

  if (!hasSession) {
    redirect("/login?next=/");
  }

  return <DashboardPageClient />;
}
