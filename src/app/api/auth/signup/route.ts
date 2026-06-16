import { NextResponse } from "next/server";
import { createSupabaseAuthClient, setAuthCookies } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "请输入邮箱和密码。" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少需要 6 位。" }, { status: 400 });
    }

    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.session) {
      return NextResponse.json({
        message: "注册成功，请先完成邮箱验证后再登录。",
        user: data.user,
      });
    }

    const response = NextResponse.json({ user: data.user });
    setAuthCookies(response, data.session);
    return response;
  } catch (error) {
    console.error("Signup API error:", error);
    return NextResponse.json({ error: "注册失败，请稍后重试。" }, { status: 500 });
  }
}
