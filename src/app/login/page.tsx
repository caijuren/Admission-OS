"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, LogIn, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.error || "操作失败，请稍后重试。");
      return;
    }

    if (payload.message) {
      setMessage(payload.message);
      return;
    }

    window.location.href = searchParams.get("next") || "/";
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <span><Sparkles className="h-5 w-5" /></span>
          <div>
            <strong>Admission OS</strong>
            <p>登录后进入你的升学规划系统</p>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="登录方式">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            <LogIn className="h-4 w-4" />
            登录
          </button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            <UserPlus className="h-4 w-4" />
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>邮箱</span>
            <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </label>
          <label>
            <span>密码</span>
            <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} placeholder="至少 6 位" />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            <LockKeyhole className="mr-2 h-4 w-4" />
            {loading ? "处理中..." : mode === "login" ? "登录" : "创建账号"}
          </Button>
        </form>
      </section>
    </main>
  );
}
