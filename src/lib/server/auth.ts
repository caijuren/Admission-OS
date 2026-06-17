import { createClient, type Session, type User } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
export { authCookieNames } from "./auth-cookies";
import { authCookieNames } from "./auth-cookies";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.ADMISSION_OS_COOKIE_SECURE
    ? process.env.ADMISSION_OS_COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production",
  path: "/",
};

const localUser = {
  id: "local-andycoy",
  app_metadata: {},
  aud: "authenticated",
  created_at: "1970-01-01T00:00:00.000Z",
  email: "andycoy@admission-os.local",
  user_metadata: {
    username: "andycoy",
  },
} as User;

function getLocalAuthSecret() {
  return process.env.ADMISSION_OS_AUTH_SECRET || process.env.ADMISSION_OS_PASSWORD || "andycoy";
}

function hashLocalSession(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getLocalSessionToken() {
  return `local.${hashLocalSession(getLocalAuthSecret())}`;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isLocalCredentials(username?: string, password?: string) {
  const expectedUsername = process.env.ADMISSION_OS_USERNAME || "andycoy";
  const expectedPassword = process.env.ADMISSION_OS_PASSWORD || "andycoy";
  return username?.trim().toLowerCase() === expectedUsername.toLowerCase() && password === expectedPassword;
}

export function setLocalAuthCookies(response: NextResponse) {
  response.cookies.set(authCookieNames.accessToken, getLocalSessionToken(), {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set(authCookieNames.refreshToken, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}

export function setAuthCookies(response: NextResponse, session: Session) {
  response.cookies.set(authCookieNames.accessToken, session.access_token, {
    ...cookieOptions,
    maxAge: session.expires_in,
  });
  response.cookies.set(authCookieNames.refreshToken, session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(authCookieNames.accessToken, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  response.cookies.set(authCookieNames.refreshToken, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}

export type RequestAuth = {
  user: User | null;
  session: Session | null;
};

export async function getRequestAuth(request: NextRequest): Promise<RequestAuth> {
  const accessToken = request.cookies.get(authCookieNames.accessToken)?.value;
  const refreshToken = request.cookies.get(authCookieNames.refreshToken)?.value;

  if (accessToken?.startsWith("local.")) {
    return safeEqual(accessToken, getLocalSessionToken())
      ? { user: localUser, session: null }
      : { user: null, session: null };
  }

  if (!accessToken && !refreshToken) {
    return { user: null, session: null };
  }

  if (!isSupabaseConfigured()) {
    return { user: null, session: null };
  }

  const supabase = createSupabaseAuthClient();

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data.user) {
      return { user: data.user, session: null };
    }
  }

  if (!accessToken || !refreshToken) {
    return { user: null, session: null };
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.user || !data.session) {
    return { user: null, session: null };
  }

  return { user: data.user, session: data.session };
}
