import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import { readData, type AiIntegrationConfig, type EduosData, type PlanTask } from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

type DiagnosisSeverity = "info" | "warn" | "danger";

type DiagnosisItem = {
  id: string;
  severity: DiagnosisSeverity;
  title: string;
  evidence: string;
  suggestion: string;
};

type DiagnosisResult = {
  summary: string;
  items: DiagnosisItem[];
  generatedAt: string;
  provider: "local" | "openai" | "deepseek" | "custom";
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
  console.error("AI plan diagnosis API error:", error);
  return NextResponse.json({ error: "AI 计划诊断暂时不可用。" }, { status: 500 });
}

function getProgress(task: Pick<PlanTask, "current" | "target">) {
  if (!task.target) return 0;
  return Math.min(100, Math.round((Number(task.current || 0) / Number(task.target || 0)) * 100));
}

function recentDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function buildSignals(data: EduosData): DiagnosisItem[] {
  const tasks = data.goalTasks || [];
  const goals = data.goals || [];
  const logs = data.goalLogs || [];
  const items: DiagnosisItem[] = [];
  const highPriority = tasks.filter((task) => task.priority === "高");
  const highBehind = highPriority.filter((task) => getProgress(task) < 35);
  const noLogsSince = recentDate(7);
  const recentGoalIds = new Set(logs.filter((log) => log.date >= noLogsSince).map((log) => log.goalId));
  const goalsWithoutRecentLogs = goals.filter((goal) => !recentGoalIds.has(goal.id)).slice(0, 4);
  const largeTasks = tasks.filter((task) => Number(task.target || 0) >= 10 && getProgress(task) < 20).slice(0, 4);
  const overloadedCategories = Object.entries(tasks.reduce<Record<string, number>>((acc, task) => {
    if (task.priority === "高" || task.status === "behind") acc[task.category || "未分类"] = (acc[task.category || "未分类"] || 0) + 1;
    return acc;
  }, {})).filter(([, count]) => count >= 3);
  const completed = tasks.filter((task) => getProgress(task) >= 100).length;

  if (highBehind.length) {
    items.push({
      id: uid("diagnosis"),
      severity: "danger",
      title: "高优先级任务推进偏慢",
      evidence: highBehind.slice(0, 4).map((task) => `${task.title} ${getProgress(task)}%`).join("；"),
      suggestion: "先保留 1-2 个高优任务做小闭环，其余高优任务降为中优或推迟到下周。",
    });
  }

  if (highPriority.length >= 6) {
    items.push({
      id: uid("diagnosis"),
      severity: "warn",
      title: "高优先级任务数量偏多",
      evidence: `当前共有 ${highPriority.length} 个高优先级任务。`,
      suggestion: "把高优先级限制在本周最关键的 3 个以内，避免所有事情都变成紧急任务。",
    });
  }

  if (goalsWithoutRecentLogs.length) {
    items.push({
      id: uid("diagnosis"),
      severity: "warn",
      title: "部分目标缺少近期记录",
      evidence: goalsWithoutRecentLogs.map((goal) => goal.title).join("；"),
      suggestion: "为这些目标补一条小任务或复盘记录，否则系统很难判断真实推进。",
    });
  }

  if (largeTasks.length) {
    items.push({
      id: uid("diagnosis"),
      severity: "warn",
      title: "部分任务可能拆得过粗",
      evidence: largeTasks.map((task) => `${task.title} 目标 ${task.target}${task.unit}，当前 ${task.current}${task.unit}`).join("；"),
      suggestion: "把大任务拆成 2-4 个阶段性任务，每个任务都有明确完成标准。",
    });
  }

  overloadedCategories.forEach(([category, count]) => {
    items.push({
      id: uid("diagnosis"),
      severity: "info",
      title: `${category} 压力集中`,
      evidence: `${category} 下有 ${count} 个高优或落后任务。`,
      suggestion: "检查这一类任务是否都必须本周完成，必要时拆出复盘、练习、验收三类节奏。",
    });
  });

  if (!items.length) {
    items.push({
      id: uid("diagnosis"),
      severity: "info",
      title: "当前计划没有明显结构性风险",
      evidence: `任务总数 ${tasks.length}，已完成 ${completed} 个，高优低进度任务 ${highBehind.length} 个。`,
      suggestion: "维持当前节奏，周末做一次轻复盘即可。",
    });
  }

  return items.slice(0, 6);
}

function buildDiagnosisContext(data: EduosData, items: DiagnosisItem[]) {
  const goals = (data.goals || []).slice(0, 8).map((goal) => `${goal.title}｜${goal.status}｜${goal.progress}%`).join("\n");
  const tasks = (data.goalTasks || []).slice(0, 18).map((task) => `${task.title}｜${task.category}｜${task.current}/${task.target}${task.unit}｜${task.priority || "未标优先级"}｜${task.status}`).join("\n");
  const logs = (data.goalLogs || []).slice(0, 10).map((log) => `${log.date}｜${log.summary || log.category || "记录"}｜${log.amount || ""}`).join("\n");
  const signals = items.map((item) => `${item.severity}｜${item.title}｜${item.evidence}｜${item.suggestion}`).join("\n");

  return [
    `学生：${data.profile.name}，年级：${data.profile.grade}，目标学校：${data.profile.targetSchool}`,
    "目标：",
    goals || "暂无目标",
    "任务：",
    tasks || "暂无任务",
    "近期记录：",
    logs || "暂无记录",
    "规则信号：",
    signals,
  ].join("\n");
}

function extractJsonObject(content: string) {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]) as unknown;
}

function normalizeAiResult(value: unknown, fallback: DiagnosisResult): DiagnosisResult {
  const item = value as Partial<DiagnosisResult> | null;
  if (!item || !Array.isArray(item.items)) return fallback;
  return {
    ...fallback,
    summary: String(item.summary || fallback.summary).trim(),
    items: item.items
      .map((raw) => raw as Partial<DiagnosisItem>)
      .filter((raw) => raw.title && raw.evidence && raw.suggestion)
      .slice(0, 6)
      .map((raw) => ({
        id: raw.id || uid("diagnosis"),
        severity: raw.severity === "danger" || raw.severity === "warn" ? raw.severity : "info",
        title: String(raw.title),
        evidence: String(raw.evidence),
        suggestion: String(raw.suggestion),
      })),
  };
}

async function diagnoseWithAi(data: EduosData, fallback: DiagnosisResult) {
  const ai = data.integrations?.ai || {};
  if (!ai.apiKey) return fallback;

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
            "你是 Admission OS 的计划诊断助手。请根据目标、任务、近期记录和规则信号输出结构化诊断。",
            "只输出 JSON 对象，不要 markdown，不要解释。",
            "格式：{ summary: string, items: [{ severity, title, evidence, suggestion }] }。",
            "severity 只能是 info/warn/danger。建议要具体、克制、可执行。",
            buildDiagnosisContext(data, fallback.items),
          ].join("\n"),
        },
      ],
    }),
  });

  const result = await upstreamResponse.json().catch(() => null) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;

  if (!upstreamResponse.ok) return fallback;
  return normalizeAiResult(extractJsonObject(result?.choices?.[0]?.message?.content || ""), {
    ...fallback,
    provider: ai.provider || "openai",
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readData(auth.user.id);
    const items = buildSignals(data);
    const dangerCount = items.filter((item) => item.severity === "danger").length;
    const warnCount = items.filter((item) => item.severity === "warn").length;
    const fallback: DiagnosisResult = {
      summary: dangerCount
        ? "当前计划存在需要优先处理的推进风险。"
        : warnCount
          ? "当前计划整体可推进，但有几处节奏和拆解需要调整。"
          : "当前计划整体稳定，可以维持节奏并做轻量复盘。",
      items,
      generatedAt: new Date().toISOString(),
      provider: "local",
    };

    const diagnosis = await diagnoseWithAi(data, fallback);
    const response = NextResponse.json({ diagnosis });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}
