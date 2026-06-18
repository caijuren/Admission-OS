import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/server/auth";
import { readData } from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await getRequestAuth(request);
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await readData(auth.user.id);
  const webhookUrl = data.integrations?.dingtalkWebhookUrl;
  if (!webhookUrl) {
    return NextResponse.json({ error: "请先在设置中心配置钉钉机器人 Webhook" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({})) as {
    title?: string;
    text?: string;
  };
  const text = [body.title, body.text].filter(Boolean).join("\n\n");

  if (!text.trim()) {
    return NextResponse.json({ error: "推送内容不能为空" }, { status: 400 });
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msgtype: "text",
      text: { content: text },
    }),
  });

  const result = await response.json().catch(() => null) as { errcode?: number; errmsg?: string } | null;

  if (!response.ok || result?.errcode) {
    return NextResponse.json(
      { error: result?.errmsg || "钉钉推送失败" },
      { status: response.ok ? 502 : response.status }
    );
  }

  return NextResponse.json({ ok: true });
}
