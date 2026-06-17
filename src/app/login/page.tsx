"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(form.get("username") || ""),
        password: String(form.get("password") || ""),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.error || "操作失败，请稍后重试。");
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

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>用户名</span>
            <Input name="username" type="text" autoComplete="username" required placeholder="andycoy" />
          </label>
          <label>
            <span>密码</span>
            <Input name="password" type="password" autoComplete="current-password" required minLength={6} placeholder="请输入密码" />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            <LockKeyhole className="mr-2 h-4 w-4" />
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>
      </section>
    </main>
  );
}
