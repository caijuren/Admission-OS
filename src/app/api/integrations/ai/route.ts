import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import { readData, writeData, type AiIntegrationConfig } from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

function maskApiKey(value?: string) {
  if (!value) return "";
  if (value.length <= 10) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function normalizeProvider(value: unknown): AiIntegrationConfig["provider"] {
  if (value === "deepseek" || value === "custom") return value;
  return "openai";
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

  const ai = data.integrations?.ai || {};
  const nextResponse = NextResponse.json({
    configured: Boolean(ai.apiKey),
    provider: ai.provider || "openai",
    baseUrl: ai.baseUrl || "",
    model: ai.model || "",
    maskedApiKey: maskApiKey(ai.apiKey),
  });
  if (auth.session) setAuthCookies(nextResponse, auth.session);
  return nextResponse;
}

export async function PUT(request: NextRequest) {
  const { auth, data, response } = await getAuthedData(request);
  if (response) return response;
  if (!auth.user || !data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    provider?: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    clearApiKey?: boolean;
  };
  const current = data.integrations?.ai || {};
  const provider = normalizeProvider(body.provider);
  const nextApiKey = body.clearApiKey ? "" : String(body.apiKey || "").trim() || current.apiKey || "";
  const nextConfig: AiIntegrationConfig = {
    provider,
    apiKey: nextApiKey,
    baseUrl: String(body.baseUrl || "").trim(),
    model: String(body.model || "").trim(),
  };

  if (provider === "custom" && !nextConfig.baseUrl) {
    return NextResponse.json({ error: "自定义 AI 服务需要填写 Base URL。" }, { status: 400 });
  }

  data.integrations = {
    ...data.integrations,
    ai: nextConfig,
  };
  await writeData(auth.user.id, data);

  const nextResponse = NextResponse.json({
    configured: Boolean(nextConfig.apiKey),
    provider: nextConfig.provider,
    baseUrl: nextConfig.baseUrl,
    model: nextConfig.model,
    maskedApiKey: maskApiKey(nextConfig.apiKey),
  });
  if (auth.session) setAuthCookies(nextResponse, auth.session);
  return nextResponse;
}
