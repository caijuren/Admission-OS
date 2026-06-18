import { NextResponse } from "next/server";
import { getRequestAuth, setAuthCookies } from "@/lib/server/auth";
import { readData, writeData, type EduosData, type PlanTask } from "@/lib/server/data-store";
import type { NextRequest } from "next/server";

type ActionDraft =
  | {
      id?: string;
      type: "update_task";
      taskId: string;
      title: string;
      reason: string;
      patch: Partial<Pick<PlanTask, "priority" | "dailyTarget" | "status" | "description">>;
    }
  | {
      id?: string;
      type: "create_task";
      title: string;
      reason: string;
      task: Omit<PlanTask, "id" | "current" | "status">;
    };

type DiagnosisItem = {
  id?: string;
  severity?: "info" | "warn" | "danger";
  title?: string;
  evidence?: string;
  suggestion?: string;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function dataErrorResponse(error: unknown) {
  console.error("AI action drafts API error:", error);
  return NextResponse.json({ error: "AI 行动草稿暂时不可用。" }, { status: 500 });
}

function getProgress(task: Pick<PlanTask, "current" | "target">) {
  if (!task.target) return 0;
  return Math.min(100, Math.round((Number(task.current || 0) / Number(task.target || 0)) * 100));
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function findRelatedTasks(data: EduosData, diagnosis: DiagnosisItem) {
  const text = normalizeText([diagnosis.title, diagnosis.evidence, diagnosis.suggestion].filter(Boolean).join(" "));
  return (data.goalTasks || [])
    .map((task) => {
      const words = [task.title, task.category, task.description || ""]
        .join(" ")
        .split(/\s|\/|、|，|,|·|《|》|-|_/)
        .map((word) => normalizeText(word))
        .filter((word) => word.length >= 2);
      const score = words.reduce((sum, word) => sum + (text.includes(word) ? word.length : 0), 0);
      const riskBoost = task.priority === "高" && getProgress(task) < 35 ? 6 : 0;
      return { task, score: score + riskBoost };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.task);
}

function buildActionDrafts(data: EduosData, diagnosis: DiagnosisItem): ActionDraft[] {
  const relatedTasks = findRelatedTasks(data, diagnosis);
  const text = [diagnosis.title, diagnosis.evidence, diagnosis.suggestion].filter(Boolean).join(" ");
  const drafts: ActionDraft[] = [];
  const defaultGoalId = relatedTasks[0]?.goalId || data.goals?.[0]?.id || "goal-default";
  const defaultCategory = relatedTasks[0]?.category || "复盘";

  if (text.includes("高优先级") || text.includes("高优")) {
    relatedTasks
      .filter((task) => task.priority === "高" && getProgress(task) >= 35)
      .slice(0, 2)
      .forEach((task) => {
        drafts.push({
          id: uid("action"),
          type: "update_task",
          taskId: task.id,
          title: `将「${task.title}」降为中优先级`,
          reason: "保留真正卡住的高优任务，减少本周压力集中。",
          patch: { priority: "中" },
        });
      });
  }

  if (text.includes("拆") || text.includes("过粗") || text.includes("阶段")) {
    const task = relatedTasks.find((item) => Number(item.target || 0) >= 3) || relatedTasks[0];
    if (task) {
      drafts.push({
        id: uid("action"),
        type: "create_task",
        title: `拆分「${task.title}」的阶段检查`,
        reason: "把大任务拆出一个可验收的小闭环。",
        task: {
          goalId: task.goalId,
          goalIds: task.goalIds || [task.goalId],
          phaseId: task.phaseId,
          category: task.category,
          title: `${task.title}：阶段检查`,
          description: `检查「${task.title}」的当前产出、卡点和下一步。`,
          target: 1,
          unit: "次",
          dailyTarget: "本周完成",
          priority: task.priority || "中",
          executionMode: "家长验收",
        },
      });
    }
  }

  if (text.includes("记录") || text.includes("复盘") || text.includes("判断真实推进")) {
    drafts.push({
      id: uid("action"),
      type: "create_task",
      title: "新增本周复盘任务",
      reason: "用一条轻量复盘补足目标推进证据。",
      task: {
        goalId: defaultGoalId,
        goalIds: [defaultGoalId],
        category: defaultCategory,
        title: "本周目标复盘",
        description: "核对本周完成量、卡点和下周最重要的 1-2 个调整。",
        target: 1,
        unit: "次",
        dailyTarget: "周末复盘",
        priority: "中",
        executionMode: "家长陪练",
      },
    });
  }

  if (!drafts.length && relatedTasks[0]) {
    const task = relatedTasks[0];
    drafts.push({
      id: uid("action"),
      type: "update_task",
      taskId: task.id,
      title: `调整「${task.title}」的执行节奏`,
      reason: "根据诊断建议，把任务调整为更容易执行的小闭环。",
      patch: {
        dailyTarget: task.dailyTarget?.includes("周末") ? "每周 2 次" : "本周完成一个小闭环",
        description: task.description || "根据计划诊断调整执行节奏。",
      },
    });
  }

  return drafts.slice(0, 4);
}

function normalizeDrafts(value: unknown, data: EduosData): ActionDraft[] {
  const taskIds = new Set((data.goalTasks || []).map((task) => task.id));
  const drafts = Array.isArray(value) ? value : [];
  const normalized: ActionDraft[] = [];

  drafts.forEach((item) => {
    const draft = item as ActionDraft;
    if (draft.type === "update_task" && taskIds.has(draft.taskId)) {
      const priority = draft.patch.priority === "高" || draft.patch.priority === "中" || draft.patch.priority === "低"
        ? draft.patch.priority
        : undefined;
      normalized.push({
        ...draft,
        id: draft.id || uid("action"),
        title: String(draft.title || "更新任务"),
        reason: String(draft.reason || "根据诊断建议调整。"),
        patch: {
          ...draft.patch,
          priority,
        },
      });
      return;
    }
    if (draft.type === "create_task" && draft.task?.title) {
      normalized.push({
        ...draft,
        id: draft.id || uid("action"),
        title: String(draft.title || "新增任务"),
        reason: String(draft.reason || "根据诊断建议新增。"),
      });
    }
  });

  return normalized.slice(0, 8);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as {
      intent?: "generate" | "apply";
      diagnosis?: DiagnosisItem;
      drafts?: ActionDraft[];
    };
    const data = await readData(auth.user.id);

    if (body.intent === "apply") {
      const drafts = normalizeDrafts(body.drafts || [], data);
      if (!drafts.length) {
        return NextResponse.json({ error: "没有可应用的行动草稿。" }, { status: 400 });
      }

      const createdTasks: PlanTask[] = [];
      const updates = new Map<string, Partial<PlanTask>>();

      drafts.forEach((draft) => {
        if (draft.type === "update_task") {
          updates.set(draft.taskId, { ...updates.get(draft.taskId), ...draft.patch });
          return;
        }

        createdTasks.push({
          ...draft.task,
          id: uid("task"),
          current: 0,
          status: "normal",
        });
      });

      data.goalTasks = [
        ...createdTasks,
        ...(data.goalTasks || []).map((task) => {
          const patch = updates.get(task.id);
          return patch ? { ...task, ...patch } : task;
        }),
      ];
      data.aiActionLogs = [
        {
          id: uid("ai-action"),
          type: "diagnosis_action_apply",
          title: "应用诊断行动草稿",
          summary: `新增 ${createdTasks.length} 个任务，更新 ${updates.size} 个任务。`,
          details: {
            createdTaskIds: createdTasks.map((task) => task.id),
            updatedTaskIds: Array.from(updates.keys()),
          },
          createdAt: new Date().toISOString(),
        },
        ...(data.aiActionLogs || []),
      ];
      await writeData(auth.user.id, data);

      const response = NextResponse.json({
        createdTasks,
        updatedTaskIds: Array.from(updates.keys()),
        data,
      });
      if (auth.session) setAuthCookies(response, auth.session);
      return response;
    }

    const drafts = buildActionDrafts(data, body.diagnosis || {});
    const response = NextResponse.json({ drafts });
    if (auth.session) setAuthCookies(response, auth.session);
    return response;
  } catch (error) {
    return dataErrorResponse(error);
  }
}
