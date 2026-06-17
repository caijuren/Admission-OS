import { NextRequest, NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);

    if (!auth.user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true, user: auth.user });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
