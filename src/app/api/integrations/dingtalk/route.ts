import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import { readData, writeData } from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

function maskWebhookUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    const token = url.searchParams.get("access_token");
    if (token) {
      url.searchParams.set("access_token", `${token.slice(0, 6)}...${token.slice(-4)}`);
    }
    return url.toString();
  } catch {
    return value.slice(0, 18) + "...";
  }
}

function isValidDingTalkWebhook(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "oapi.dingtalk.com" &&
      url.pathname === "/robot/send" &&
      Boolean(url.searchParams.get("access_token"));
  } catch {
    return false;
  }
}

async function getAuthedData(request: NextRequest) {
  const auth = await getRequestAuth(request);
  if (!auth.user) {
    return { auth, data: undefined, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const data = await readData(auth.user.id);
  return { auth, data, response: undefined };
}

export async function GET(request: NextRequest) {
  const { auth, data, response } = await getAuthedData(request);
  if (response) return response;
  if (!auth.user || !data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const webhookUrl = data.integrations?.dingtalkWebhookUrl || "";
  const nextResponse = NextResponse.json({
    configured: Boolean(webhookUrl),
    webhookUrl: maskWebhookUrl(webhookUrl),
  });
  if (auth.session) setAuthCookies(nextResponse, auth.session);
  return nextResponse;
}

export async function PUT(request: NextRequest) {
  const { auth, data, response } = await getAuthedData(request);
  if (response) return response;
  if (!auth.user || !data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { webhookUrl?: string };
  const webhookUrl = String(body.webhookUrl || "").trim();

  if (webhookUrl && !isValidDingTalkWebhook(webhookUrl)) {
    return NextResponse.json(
      { error: "请输入有效的钉钉机器人 Webhook，域名应为 oapi.dingtalk.com 且包含 access_token。" },
      { status: 400 }
    );
  }

  data.integrations = {
    ...data.integrations,
    dingtalkWebhookUrl: webhookUrl,
  };
  await writeData(auth.user.id, data);

  const nextResponse = NextResponse.json({
    configured: Boolean(webhookUrl),
    webhookUrl: maskWebhookUrl(webhookUrl),
  });
  if (auth.session) setAuthCookies(nextResponse, auth.session);
  return nextResponse;
}

export async function POST(request: NextRequest) {
  const { data, response } = await getAuthedData(request);
  if (response) return response;
  if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const dingtalkResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      msgtype: "text",
      text: { content: text },
    }),
  }).finally(() => clearTimeout(timeout));

  const result = await dingtalkResponse.json().catch(() => null) as { errcode?: number; errmsg?: string } | null;

  if (!dingtalkResponse.ok || result?.errcode) {
    return NextResponse.json(
      { error: result?.errmsg || "钉钉推送失败" },
      { status: dingtalkResponse.ok ? 502 : dingtalkResponse.status }
    );
  }

  return NextResponse.json({ ok: true });
}
