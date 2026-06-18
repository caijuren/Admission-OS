import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import { readData } from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

function dataErrorResponse(error: unknown) {
  console.error("AI action logs API error:", error);
  return NextResponse.json({ error: "AI 操作日志暂时不可用。" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readData(auth.user.id);
    const logs = (data.aiActionLogs || [])
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);
    const response = NextResponse.json({ logs });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}
