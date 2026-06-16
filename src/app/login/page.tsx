"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
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
      body: JSON.stringify({ accessCode: String(form.get("accessCode") || "") }),
    });

    setLoading(false);

    if (!response.ok) {
      setError("访问码不正确，请检查后重试。");
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <span><Sparkles className="h-5 w-5" /></span>
          <div>
            <strong>Admission OS</strong>
            <em>家庭升学规划工作台</em>
          </div>
        </div>

        <div className="login-copy">
          <h1>访问受保护档案</h1>
          <p>这里包含孩子的学校、成绩、目标和成长记录，请输入家庭访问码继续。</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="form-field">
            <span>访问码</span>
            <Input name="accessCode" type="password" autoFocus required placeholder="输入访问码" />
          </label>
          {error && <div className="login-error">{error}</div>}
          <Button type="submit" disabled={loading}>
            <LockKeyhole className="mr-2 h-4 w-4" />
            {loading ? "验证中..." : "进入系统"}
          </Button>
          <Link className="login-privacy-link" href="/privacy">查看隐私与数据说明</Link>
        </form>
      </section>
    </main>
  );
}
