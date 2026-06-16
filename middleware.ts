import { NextResponse, type NextRequest } from "next/server";

const cookieName = "admission_os_session";

function getAccessCode() {
  return process.env.ADMISSION_OS_ACCESS_CODE || (process.env.NODE_ENV === "production" ? "" : "admission-os");
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isPublicPath(pathname: string) {
  return pathname === "/login"
    || pathname === "/privacy"
    || pathname.startsWith("/api/auth")
    || pathname.startsWith("/_next")
    || pathname.startsWith("/assets")
    || pathname === "/favicon.ico"
    || pathname === "/robots.txt"
    || pathname === "/sitemap.xml";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const accessCode = getAccessCode();
  if (!accessCode) {
    return pathname.startsWith("/api")
      ? NextResponse.json({ error: "Access code is not configured" }, { status: 503 })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  const expectedToken = await sha256(`${accessCode}:admission-os-session`);
  const sessionToken = request.cookies.get(cookieName)?.value;

  if (sessionToken === expectedToken) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
