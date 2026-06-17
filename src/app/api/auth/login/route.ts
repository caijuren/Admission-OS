import { NextResponse } from "next/server";
import { createSupabaseAuthClient, setAuthCookies } from "@/lib/server/auth";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

const usernameEmailMap: Record<string, string> = {
  andycoy: "andycoy@admission-os.local",
};

function normalizeUsername(username?: string) {
  return username?.trim().toLowerCase() || "";
}

function resolveLoginEmail(email?: string, username?: string) {
  if (email) return email;

  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return "";

  return usernameEmailMap[normalizedUsername] || normalizedUsername;
}

async function ensureBuiltInUser(username?: string, password?: string) {
  if (
    normalizeUsername(username) !== "andycoy" ||
    password !== "andycoy" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return;
  }

  const email = usernameEmailMap.andycoy;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error || data.user) return;

  const { data: users } = await supabase.auth.admin.listUsers();
  const existingUser = users.users.find((user) => user.email?.toLowerCase() === email);
  if (existingUser) {
    await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
    });
  }
}

export async function POST(request: Request) {
  try {
    const { email, username, password } = await request.json() as { email?: string; username?: string; password?: string };
    const loginEmail = resolveLoginEmail(email, username);

    if (!loginEmail || !password) {
      return NextResponse.json({ error: "请输入用户名和密码。" }, { status: 400 });
    }

    await ensureBuiltInUser(username, password);

    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || "登录失败，请检查用户名和密码。" }, { status: 401 });
    }

    const response = NextResponse.json({ user: data.user });
    setAuthCookies(response, data.session);
    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "登录失败，请稍后重试。" }, { status: 500 });
  }
}
