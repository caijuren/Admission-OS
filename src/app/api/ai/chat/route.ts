import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import { readData, writeData, type EduosData, type AiConversation, type AiIntegrationConfig } from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function defaultBaseUrl(provider?: AiIntegrationConfig["provider"]) {
  if (provider === "deepseek") return "https://api.deepseek.com";
  return "https://api.openai.com/v1";
}

function defaultModel(provider?: AiIntegrationConfig["provider"]) {
  if (provider === "deepseek") return "deepseek-chat";
  return "gpt-4o-mini";
}

function buildContext(data: EduosData) {
  const goals = (data.goals || []).slice(0, 8).map((goal) => `${goal.title}｜${goal.status}｜${goal.progress}%`).join("\n");
  const tasks = (data.goalTasks || []).slice(0, 18).map((task) => {
    const progress = task.target ? Math.round((task.current / task.target) * 100) : 0;
    return `${task.title}｜${task.category}｜${task.current}/${task.target}${task.unit}｜${progress}%｜${task.priority || "未标优先级"}`;
  }).join("\n");
  const logs = (data.goalLogs || []).slice(0, 10).map((log) => `${log.date}｜${log.summary || log.category || "记录"}｜${log.amount || ""}`).join("\n");

  return [
    `孩子：${data.profile.name}，年级：${data.profile.grade}，目标学校：${data.profile.targetSchool}`,
    `当前阶段：${data.profile.currentStage}，整体准备度：${data.profile.progress}%`,
    "目标：",
    goals || "暂无目标",
    "任务进度：",
    tasks || "暂无任务",
    "近期记录：",
    logs || "暂无记录",
  ].join("\n");
}

function buildConversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "新的 AI 对话";
  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized;
}

function fallbackAdvisor(data: EduosData, message: string) {
  const tasks = data.goalTasks || [];
  const behind = tasks
    .filter((task) => task.priority === "高" && task.target && task.current / task.target < 0.35)
    .slice(0, 3);
  const next = behind.length
    ? behind.map((task) => `- ${task.title}：当前 ${task.current}/${task.target}${task.unit}，建议本周先保留一个小闭环。`).join("\n")
    : "- 目前没有明显高优先级低进度任务，可以维持当前节奏，周末做一次轻复盘。";

  return [
    `我先按当前数据给一个保守判断：${data.profile.name} 的整体准备度是 ${data.profile.progress}%，目标是 ${data.profile.targetSchool}。`,
    "",
    "优先关注：",
    next,
    "",
    `针对你刚才问的「${message.slice(0, 60)}」，我建议先看三件事：目标是否过多、每天是否有稳定输入、周末是否能复盘调整。配置 AI Key 后，这里会切换成真实模型对话。`,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = auth.user.id;

    const body = await request.json().catch(() => ({})) as {
      message?: string;
      messages?: ChatMessage[];
      conversationId?: string;
    };
    const message = String(body.message || body.messages?.at(-1)?.content || "").trim();
    if (!message) {
      return NextResponse.json({ error: "消息不能为空。" }, { status: 400 });
    }

    const data = await readData(userId);
    const ai = data.integrations?.ai || {};
    const now = new Date().toISOString();
    const conversations = Array.isArray(data.aiConversations) ? data.aiConversations : [];
    const existingConversation = conversations.find((item) => item.id === body.conversationId);
    const baseConversation: AiConversation = existingConversation || {
      id: body.conversationId || uid("ai-conversation"),
      title: buildConversationTitle(message),
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    const userMessage = {
      id: uid("ai-message"),
      role: "user" as const,
      content: message,
      createdAt: now,
    };
    const requestMessages = [...baseConversation.messages, userMessage]
      .slice(-10)
      .map((item) => ({ role: item.role, content: item.content }));
    const saveReply = async (reply: string, provider: string, model?: string) => {
      const replyNow = new Date().toISOString();
      const conversation: AiConversation = {
        ...baseConversation,
        title: existingConversation?.title || buildConversationTitle(message),
        messages: [
          ...baseConversation.messages,
          userMessage,
          {
            id: uid("ai-message"),
            role: "assistant",
            content: reply,
            createdAt: replyNow,
          },
        ],
        updatedAt: replyNow,
      };
      data.aiConversations = [
        conversation,
        ...conversations.filter((item) => item.id !== conversation.id),
      ];
      await writeData(userId, data);
      const response = NextResponse.json({ reply, provider, model, conversation });
      if (auth.session) setAuthCookies(response, auth.session);
      return response;
    };

    if (!ai.apiKey) {
      return saveReply(fallbackAdvisor(data, message), "local");
    }

    const baseUrl = (ai.baseUrl || defaultBaseUrl(ai.provider)).replace(/\/$/, "");
    const model = ai.model || defaultModel(ai.provider);
    const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ai.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: [
              "你是 EduOS 的家庭成长顾问，回答要具体、克制、可执行。",
              "你只根据用户提供的孩子目标、计划、进度和记录做建议，不编造成绩或经历。",
              "输出中文，优先给 3 条以内的行动建议。",
              "当前 EduOS 数据：",
              buildContext(data),
            ].join("\n"),
          },
          ...requestMessages,
        ],
      }),
    });

    const result = await upstreamResponse.json().catch(() => null) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    } | null;

    if (!upstreamResponse.ok) {
      return NextResponse.json({ error: result?.error?.message || "AI 服务调用失败。" }, { status: upstreamResponse.status });
    }

    const reply = result?.choices?.[0]?.message?.content || "AI 没有返回内容，请稍后再试。";
    return saveReply(reply, ai.provider || "openai", model);
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "AI 顾问暂时不可用。" }, { status: 500 });
  }
}
