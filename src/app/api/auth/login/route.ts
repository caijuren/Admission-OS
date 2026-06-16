import { NextResponse } from "next/server";
import { createSupabaseAuthClient, setAuthCookies } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "请输入邮箱和密码。" }, { status: 400 });
    }

    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || "登录失败，请检查邮箱和密码。" }, { status: 401 });
    }

    const response = NextResponse.json({ user: data.user });
    setAuthCookies(response, data.session);
    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "登录失败，请稍后重试。" }, { status: 500 });
  }
}
