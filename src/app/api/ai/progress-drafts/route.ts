import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import {
  readData,
  writeData,
  type AiIntegrationConfig,
  type EduosData,
  type PlanLog,
  type PlanTask,
} from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

type ProgressDraft = {
  taskId: string;
  taskTitle: string;
  goalId: string;
  category: string;
  amount: number;
  unit: string;
  summary: string;
  note: string;
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
  console.error("AI progress drafts API error:", error);
  return NextResponse.json({ error: "AI 进度汇报暂时不可用。" }, { status: 500 });
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTaskStatus(task: Pick<PlanTask, "current" | "target" | "priority">) {
  if (task.target && task.current >= task.target) return "ahead";
  if (task.target && task.priority === "高" && task.current / task.target < 0.35) return "behind";
  return "normal";
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function buildProgressContext(data: EduosData) {
  const tasks = (data.goalTasks || [])
    .filter((task) => Number(task.target || 0) > Number(task.current || 0))
    .slice(0, 30)
    .map((task) => `${task.id}｜${task.title}｜${task.category}｜${task.current}/${task.target}${task.unit}｜${task.priority || "未标优先级"}`)
    .join("\n");
  const goals = (data.goals || [])
    .slice(0, 10)
    .map((goal) => `${goal.id}｜${goal.title}`)
    .join("\n");

  return [
    "可匹配目标：",
    goals || "暂无目标",
    "可匹配任务：",
    tasks || "暂无未完成任务",
  ].join("\n");
}

function normalizeDrafts(value: unknown, data: EduosData): ProgressDraft[] {
  const tasks = data.goalTasks || [];
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const items = Array.isArray(value) ? value : [];

  return items
    .map((item) => item as Record<string, unknown>)
    .filter((item) => taskMap.has(String(item.taskId || "")))
    .slice(0, 12)
    .map((item) => {
      const task = taskMap.get(String(item.taskId))!;
      return {
        taskId: task.id,
        taskTitle: task.title,
        goalId: task.goalId,
        category: String(item.category || task.category || "进度").trim(),
        amount: Math.max(0, Number(item.amount || 0)),
        unit: String(item.unit || task.unit || "项").trim(),
        summary: String(item.summary || task.title).trim(),
        note: String(item.note || "").trim(),
      };
    })
    .filter((item) => item.amount > 0);
}

function fallbackDrafts(data: EduosData, report: string): ProgressDraft[] {
  const lines = report
    .split(/\n|；|;/)
    .map((line) => line.trim())
    .filter(Boolean);
  const tasks = (data.goalTasks || []).filter((task) => Number(task.target || 0) > Number(task.current || 0));

  return lines.flatMap((line) => {
    const normalizedLine = normalizeText(line);
    const amount = Number(line.match(/\d+(?:\.\d+)?/)?.[0] || 1);
    const matched = tasks
      .map((task) => {
        const words = [task.title, task.category, task.description || ""]
          .join(" ")
          .split(/\s|\/|、|，|,|·|《|》|-|_/)
          .map((word) => normalizeText(word))
          .filter((word) => word.length >= 2);
        const score = words.reduce((sum, word) => sum + (normalizedLine.includes(word) ? word.length : 0), 0);
        return { task, score };
      })
      .sort((a, b) => b.score - a.score)[0];

    if (!matched || matched.score <= 0) return [];
    return [{
      taskId: matched.task.id,
      taskTitle: matched.task.title,
      goalId: matched.task.goalId,
      category: matched.task.category,
      amount,
      unit: matched.task.unit,
      summary: line,
      note: "由自然语言汇报匹配生成，请确认后同步。",
    }];
  });
}

function extractJsonArray(content: string) {
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return [];
  return JSON.parse(match[0]) as unknown;
}

async function generateWithAi(data: EduosData, report: string) {
  const ai = data.integrations?.ai || {};
  if (!ai.apiKey) return fallbackDrafts(data, report);

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
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "你是 Admission OS 的进度汇报解析助手。请把用户自然语言汇报匹配到已有任务。",
            "只输出 JSON 数组，不要 markdown，不要解释。",
            "每个字段：taskId, amount, unit, category, summary, note。",
            "只匹配有把握的任务；不确定的内容不要输出。",
            "amount 必须是数字，unit 尽量使用任务原单位。",
            buildProgressContext(data),
          ].join("\n"),
        },
        { role: "user", content: report },
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
      report?: string;
      date?: string;
      drafts?: ProgressDraft[];
    };
    const intent = body.intent || "generate";
    const data = await readData(auth.user.id);

    if (intent === "apply") {
      const drafts = normalizeDrafts(body.drafts || [], data);
      if (!drafts.length) {
        return NextResponse.json({ error: "没有可同步的进度草稿。" }, { status: 400 });
      }

      const date = String(body.date || todayDate()).slice(0, 10);
      const taskMap = new Map((data.goalTasks || []).map((task) => [task.id, task]));
      const logs: PlanLog[] = drafts.map((draft) => ({
        id: uid("log"),
        goalId: draft.goalId,
        taskId: draft.taskId,
        date,
        category: draft.category,
        summary: draft.summary,
        amount: `${draft.amount}${draft.unit}`,
        note: draft.note,
      }));

      data.goalTasks = (data.goalTasks || []).map((task) => {
        const taskDrafts = drafts.filter((draft) => draft.taskId === task.id);
        if (!taskDrafts.length) return task;
        const increment = taskDrafts.reduce((sum, draft) => sum + Number(draft.amount || 0), 0);
        const current = clamp(Number(task.current || 0) + increment, 0, Number(task.target || 0) || Number(task.current || 0) + increment);
        const nextTask = { ...task, current };
        return { ...nextTask, status: getTaskStatus(nextTask) };
      });
      data.goalLogs = [...logs, ...(data.goalLogs || [])];
      data.aiActionLogs = [
        {
          id: uid("ai-action"),
          type: "progress_apply",
          title: "同步进度汇报",
          summary: `新增 ${logs.length} 条进度记录，并更新对应任务完成量。`,
          details: {
            logIds: logs.map((log) => log.id),
            taskIds: drafts.map((draft) => draft.taskId),
          },
          createdAt: new Date().toISOString(),
        },
        ...(data.aiActionLogs || []),
      ];

      const updatedTasks = drafts
        .map((draft) => taskMap.get(draft.taskId))
        .filter(Boolean)
        .map((task) => data.goalTasks?.find((item) => item.id === task!.id))
        .filter(Boolean);

      await writeData(auth.user.id, data);
      const response = NextResponse.json({ logs, tasks: updatedTasks, data });
      if (auth.session) setAuthCookies(response, auth.session);
      return response;
    }

    const report = String(body.report || "").trim();
    if (!report) {
      return NextResponse.json({ error: "请输入今天完成的情况。" }, { status: 400 });
    }

    const drafts = await generateWithAi(data, report);
    const response = NextResponse.json({ drafts: drafts.length ? drafts : fallbackDrafts(data, report) });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}
