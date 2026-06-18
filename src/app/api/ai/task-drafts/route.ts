import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import {
  readData,
  writeData,
  type AiIntegrationConfig,
  type EduosData,
  type PlanTask,
} from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

type TaskDraft = {
  title: string;
  category: string;
  description: string;
  target: number;
  unit: string;
  dailyTarget: string;
  priority: "高" | "中" | "低";
  executionMode: "孩子自主" | "家长陪练" | "亲子共学" | "家长验收";
  goalId?: string;
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

function dataErrorResponse(error: unknown) {
  console.error("AI task drafts API error:", error);
  return NextResponse.json({ error: "AI 任务草稿暂时不可用。" }, { status: 500 });
}

function buildPlanningContext(data: EduosData) {
  const goals = (data.goals || [])
    .slice(0, 12)
    .map((goal) => `${goal.id}｜${goal.title}｜${goal.type}｜${goal.status}｜${goal.progress}%`)
    .join("\n");
  const tasks = (data.goalTasks || [])
    .slice(0, 20)
    .map((task) => `${task.title}｜${task.category}｜${task.current}/${task.target}${task.unit}｜${task.priority || "未标优先级"}`)
    .join("\n");
  const memories = (data.aiMemories || [])
    .filter((memory) => memory.enabled)
    .slice(0, 8)
    .map((memory) => `${memory.title}：${memory.content}`)
    .join("\n");

  return [
    `学生：${data.profile.name}，年级：${data.profile.grade}，目标学校：${data.profile.targetSchool}`,
    "现有目标：",
    goals || "暂无目标",
    "现有任务：",
    tasks || "暂无任务",
    "长期记忆：",
    memories || "暂无长期记忆",
  ].join("\n");
}

function normalizePriority(value: unknown): TaskDraft["priority"] {
  return value === "高" || value === "低" ? value : "中";
}

function normalizeExecutionMode(value: unknown): TaskDraft["executionMode"] {
  const modes: TaskDraft["executionMode"][] = ["孩子自主", "家长陪练", "亲子共学", "家长验收"];
  return modes.includes(value as TaskDraft["executionMode"]) ? value as TaskDraft["executionMode"] : "孩子自主";
}

function normalizeDrafts(value: unknown, data: EduosData): TaskDraft[] {
  const goalIds = new Set((data.goals || []).map((goal) => goal.id));
  const items = Array.isArray(value) ? value : [];
  return items
    .map((item) => item as Record<string, unknown>)
    .filter((item) => String(item.title || "").trim())
    .slice(0, 8)
    .map((item) => ({
      title: String(item.title || "新任务").trim(),
      category: String(item.category || "规划").trim(),
      description: String(item.description || "").trim(),
      target: Math.max(1, Number(item.target || 1)),
      unit: String(item.unit || "项").trim(),
      dailyTarget: String(item.dailyTarget || "每周 2 次").trim(),
      priority: normalizePriority(item.priority),
      executionMode: normalizeExecutionMode(item.executionMode),
      goalId: goalIds.has(String(item.goalId || "")) ? String(item.goalId) : data.goals?.[0]?.id,
    }));
}

function fallbackDrafts(data: EduosData, prompt: string): TaskDraft[] {
  const defaultGoalId = data.goals?.[0]?.id;
  const text = prompt.toLowerCase();
  const category = text.includes("文书") ? "文书" : text.includes("阅读") || text.includes("英语") ? "英语阅读" : text.includes("数学") ? "数学" : "规划";
  const baseTitle = prompt.length > 18 ? prompt.slice(0, 18) : prompt;

  return [
    {
      title: `${baseTitle}：明确目标与材料`,
      category,
      description: "先把目标、当前基础、可用时间和完成标准整理清楚。",
      target: 1,
      unit: "项",
      dailyTarget: "本周完成",
      priority: "高",
      executionMode: "家长陪练",
      goalId: defaultGoalId,
    },
    {
      title: `${baseTitle}：分阶段推进`,
      category,
      description: "按小闭环推进，避免一次性安排过满。",
      target: 3,
      unit: "次",
      dailyTarget: "每周 3 次",
      priority: "中",
      executionMode: "孩子自主",
      goalId: defaultGoalId,
    },
    {
      title: `${baseTitle}：复盘与调整`,
      category,
      description: "完成后检查质量、难点和下一步安排。",
      target: 1,
      unit: "次",
      dailyTarget: "周末复盘",
      priority: "中",
      executionMode: "家长验收",
      goalId: defaultGoalId,
    },
  ];
}

function extractJsonArray(content: string) {
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return [];
  return JSON.parse(match[0]) as unknown;
}

async function generateWithAi(data: EduosData, prompt: string) {
  const ai = data.integrations?.ai || {};
  if (!ai.apiKey) return fallbackDrafts(data, prompt);

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
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content: [
            "你是 Admission OS 的计划拆解助手。请把用户想法拆成可写入任务系统的任务草稿。",
            "只输出 JSON 数组，不要 markdown，不要解释。",
            "每个任务字段：title, category, description, target, unit, dailyTarget, priority, executionMode, goalId。",
            "priority 只能是 高/中/低。executionMode 只能是 孩子自主/家长陪练/亲子共学/家长验收。",
            "任务数量 3-6 个，避免过细或过满。",
            "尽量复用现有目标的 goalId。当前上下文：",
            buildPlanningContext(data),
          ].join("\n"),
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const result = await upstreamResponse.json().catch(() => null) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;

  if (!upstreamResponse.ok) {
    throw new Error(result?.error?.message || "AI 服务调用失败。");
  }

  return normalizeDrafts(extractJsonArray(result?.choices?.[0]?.message?.content || ""), data);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as {
      intent?: "generate" | "apply";
      prompt?: string;
      drafts?: TaskDraft[];
    };
    const intent = body.intent || "generate";
    const data = await readData(auth.user.id);

    if (intent === "apply") {
      const drafts = normalizeDrafts(body.drafts || [], data);
      if (!drafts.length) {
        return NextResponse.json({ error: "没有可写入的任务草稿。" }, { status: 400 });
      }

      const nowTasks = data.goalTasks || [];
      const nextTasks: PlanTask[] = drafts.map((draft) => ({
        id: uid("task"),
        goalId: draft.goalId || data.goals?.[0]?.id || "goal-default",
        goalIds: [draft.goalId || data.goals?.[0]?.id || "goal-default"],
        category: draft.category,
        title: draft.title,
        description: draft.description,
        target: draft.target,
        current: 0,
        unit: draft.unit,
        dailyTarget: draft.dailyTarget,
        status: draft.priority === "高" ? "behind" : "normal",
        priority: draft.priority,
        executionMode: draft.executionMode,
      }));

      data.goalTasks = [...nextTasks, ...nowTasks];
      data.aiActionLogs = [
        {
          id: uid("ai-action"),
          type: "task_draft_apply",
          title: "写入任务草稿",
          summary: `新增 ${nextTasks.length} 个任务。`,
          details: {
            taskIds: nextTasks.map((task) => task.id),
            taskTitles: nextTasks.map((task) => task.title),
          },
          createdAt: new Date().toISOString(),
        },
        ...(data.aiActionLogs || []),
      ];
      await writeData(auth.user.id, data);
      const response = NextResponse.json({ tasks: nextTasks, data });
      if (auth.session) setAuthCookies(response, auth.session);
      return response;
    }

    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "请输入要拆解的想法。" }, { status: 400 });
    }

    const drafts = await generateWithAi(data, prompt);
    const response = NextResponse.json({ drafts: drafts.length ? drafts : fallbackDrafts(data, prompt) });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}
