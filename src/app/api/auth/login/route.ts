import { createHash } from "crypto";
import { NextResponse } from "next/server";

const cookieName = "admission_os_session";

function getAccessCode() {
  return process.env.ADMISSION_OS_ACCESS_CODE || (process.env.NODE_ENV === "production" ? "" : "admission-os");
}

function getSessionToken() {
  return createHash("sha256")
    .update(`${getAccessCode()}:admission-os-session`)
    .digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { accessCode?: string };
  const accessCode = String(body.accessCode || "");
  const expectedCode = getAccessCode();

  if (!expectedCode || accessCode !== expectedCode) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, getSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}
