"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquareText,
  Save,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TaskStatus = "ahead" | "normal" | "behind";
type TaskPriority = "高" | "中" | "低";
type ExecutionMode = "孩子自主" | "家长陪练" | "亲子共学" | "家长验收";

type PlanGoal = {
  id: string;
  title: string;
  type: "north" | "phase" | "subject" | "project" | "habit";
  period: string;
  progress: number;
  status: "进行中" | "规划中" | "重点推进";
  description: string;
  parentId?: string;
  focus?: string[];
};

type PlanTask = {
  id: string;
  goalId: string;
  goalIds?: string[];
  phaseId?: string;
  category: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
  dailyTarget?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  executionMode?: ExecutionMode;
};

type PlanLog = {
  id: string;
  goalId: string;
  date: string;
  category?: string;
  summary?: string;
  amount?: string;
  note?: string;
};

type WeeklyData = {
  goals?: PlanGoal[];
  goalTasks?: PlanTask[];
  goalLogs?: PlanLog[];
};

type DailyPlanItem = {
  task: PlanTask;
  amount: number;
};

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

const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getProgress(task: PlanTask) {
  if (!task.target) return 0;
  return clamp(Math.round((task.current / task.target) * 100), 0, 100);
}

function getWeekRange() {
  const today = new Date();
  const day = today.getDay() || 7;
  const start = new Date(today);
  start.setDate(today.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start,
    end,
    label: `${start.toISOString().slice(5, 10).replace("-", ".")} - ${end.toISOString().slice(5, 10).replace("-", ".")}`,
  };
}

function getSuggestedWeeklyAmount(task: PlanTask) {
  const remaining = Math.max(0, Number(task.target || 0) - Number(task.current || 0));
  if (!remaining) return 0;

  const cadence = task.dailyTarget || "";
  const weeklyMatch = cadence.match(/每周\s*(\d+)(?:\s*[-~－—]\s*(\d+))?/);
  if (weeklyMatch) {
    return Math.min(remaining, Number(weeklyMatch[2] || weeklyMatch[1]));
  }

  if (cadence.includes("每天")) {
    return Math.min(remaining, task.unit === "分钟" ? 210 : 7);
  }

  if (task.unit === "本" || task.unit === "项" || task.unit === "级") return Math.min(remaining, 1);
  return Math.min(remaining, Math.max(1, Math.ceil(remaining / 8)));
}

function getTaskDays(task: PlanTask) {
  const cadence = task.dailyTarget || "";
  if (cadence.includes("每天")) return [0, 1, 2, 3, 4, 5, 6];
  if (cadence.includes("周末")) return [5, 6];
  if (cadence.includes("隔天")) return [0, 2, 4, 6];
  if (cadence.includes("每周")) return [1, 3, 5];
  if (task.priority === "高") return [0, 2, 4];
  return [1, 4];
}

function buildDailyPlan(tasks: PlanTask[]) {
  const plan: DailyPlanItem[][] = weekDays.map(() => []);
  tasks
    .filter((task) => getSuggestedWeeklyAmount(task) > 0)
    .sort((a, b) => (a.priority === "高" ? -1 : 0) - (b.priority === "高" ? -1 : 0))
    .forEach((task) => {
      const suggested = getSuggestedWeeklyAmount(task);
      const days = getTaskDays(task);
      const base = Math.floor(suggested / days.length);
      let remainder = suggested % days.length;

      days.forEach((day) => {
        const amount = base + (remainder > 0 ? 1 : 0);
        remainder -= 1;
        if (amount > 0) plan[day].push({ task, amount });
      });
    });

  return plan;
}

function buildDingTalkMessage(type: string, options: {
  goal?: PlanGoal;
  tasks: PlanTask[];
  dailyPlan: DailyPlanItem[][];
  logs: PlanLog[];
  weekLabel: string;
}) {
  const progress = options.tasks.length
    ? Math.round(options.tasks.reduce((sum, task) => sum + getProgress(task), 0) / options.tasks.length)
    : 0;
  const todayIndex = Math.max(0, (new Date().getDay() || 7) - 1);
  const todayItems = options.dailyPlan[todayIndex] || [];

  if (type === "today") {
    return [
      `今日安排｜${weekDays[todayIndex]}`,
      ...(todayItems.length ? todayItems.map(({ task, amount }) => `- ${task.title}：${amount}${task.unit}`) : ["- 今天没有自动拆解任务"]),
    ].join("\n");
  }

  if (type === "report") {
    return [
      `周报摘要｜${options.weekLabel}`,
      `目标：${options.goal?.title || "未设置目标"}`,
      `整体进度：${progress}%`,
      `本周记录：${options.logs.length} 条`,
      `高优先级低进度：${options.tasks.filter((task) => task.priority === "高" && getProgress(task) < 30).length} 项`,
    ].join("\n");
  }

  return [
    "整体进度",
    `目标：${options.goal?.title || "未设置目标"}`,
    `平均进度：${progress}%`,
    `任务数：${options.tasks.length}`,
    ...options.tasks.slice(0, 8).map((task) => `- ${task.title}：${task.current}/${task.target}${task.unit}`),
  ].join("\n");
}

export default function WeeklyPage() {
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [logs, setLogs] = useState<PlanLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [progressReport, setProgressReport] = useState("");
  const [progressDrafts, setProgressDrafts] = useState<ProgressDraft[]>([]);
  const [parsingProgress, setParsingProgress] = useState(false);
  const [applyingProgress, setApplyingProgress] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pushFeedback, setPushFeedback] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWeeklyData() {
      const response = await fetch("/api/data", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const data = await response.json() as WeeklyData;
      if (cancelled) return;
      setGoals(Array.isArray(data.goals) ? data.goals : []);
      setTasks(Array.isArray(data.goalTasks) ? data.goalTasks : []);
      setLogs(Array.isArray(data.goalLogs) ? data.goalLogs : []);
      setLoaded(true);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") loadWeeklyData().catch(() => undefined);
    }

    loadWeeklyData().catch(() => undefined);
    window.addEventListener("focus", loadWeeklyData);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadWeeklyData);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const week = useMemo(getWeekRange, []);
  const summerGoal = goals.find((goal) => goal.id === "summer-2025") || goals.find((goal) => goal.title.includes("暑假")) || goals[0];
  const weeklyTasks = useMemo(() => {
    const liveGoalIds = new Set(goals.map((goal) => goal.id));
    const liveTasks = tasks.filter((task) => {
      const ids = (task.goalIds?.length ? task.goalIds : [task.goalId]).filter(Boolean);
      return ids.some((goalId) => liveGoalIds.has(goalId));
    });
    if (!summerGoal) return liveTasks;
    return liveTasks.filter((task) => (task.goalIds?.length ? task.goalIds : [task.goalId]).includes(summerGoal.id));
  }, [goals, summerGoal, tasks]);
  const dailyPlan = useMemo(() => buildDailyPlan(weeklyTasks), [weeklyTasks]);
  const todayIndex = Math.max(0, (new Date().getDay() || 7) - 1);
  const todayItems = dailyPlan[todayIndex] || [];
  const todayTotal = todayItems.reduce((sum, item) => sum + item.amount, 0);
  const suggestedTotal = useMemo(() => weeklyTasks.reduce((sum, task) => sum + getSuggestedWeeklyAmount(task), 0), [weeklyTasks]);
  const completedTotal = weeklyTasks.reduce((sum, task) => sum + Math.min(Number(task.current || 0), Number(task.target || 0)), 0);
  const targetTotal = weeklyTasks.reduce((sum, task) => sum + Number(task.target || 0), 0);
  const overallProgress = targetTotal ? clamp(Math.round((completedTotal / targetTotal) * 100), 0, 100) : 0;
  const activeDays = dailyPlan.filter((items) => items.length).length;
  const highPriorityCount = weeklyTasks.filter((task) => task.priority === "高").length;
  const recentLogs = logs.slice(0, 4);

  function resetProgressDrafts() {
    setSaved(false);
    setSaveError("");
    setProgressDrafts([]);
  }

  async function parseProgressReport() {
    if (!progressReport.trim()) return;
    setParsingProgress(true);
    setSaveError("");
    setSaved(false);
    const response = await fetch("/api/ai/progress-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "generate", report: progressReport }),
    });
    const data = await response.json().catch(() => null) as { drafts?: ProgressDraft[]; error?: string } | null;
    setParsingProgress(false);
    if (!response.ok) {
      setSaveError(data?.error || "解析失败，请稍后再试");
      return;
    }
    setProgressDrafts(Array.isArray(data?.drafts) ? data.drafts : []);
    if (!data?.drafts?.length) {
      setSaveError("没有找到足够确定的任务匹配。可以写得更具体，或补充任务名称和数量。");
      return;
    }
  }

  async function applyProgressDrafts() {
    if (!progressDrafts.length) return;
    setApplyingProgress(true);
    setSaveError("");
    const response = await fetch("/api/ai/progress-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "apply",
        date: new Date().toISOString().slice(0, 10),
        drafts: progressDrafts,
      }),
    });
    const data = await response.json().catch(() => null) as { data?: WeeklyData; error?: string } | null;
    setApplyingProgress(false);
    if (!response.ok) {
      setSaveError(data?.error || "同步失败，请稍后再试");
      return;
    }
    if (Array.isArray(data?.data?.goalTasks)) setTasks(data.data.goalTasks);
    if (Array.isArray(data?.data?.goalLogs)) setLogs(data.data.goalLogs);
    setProgressReport("");
    setProgressDrafts([]);
    setLogDialogOpen(false);
    setSaved(true);
    setSaveError("");
  }

  async function pushToDingTalk(type: "today" | "overall" | "report") {
    setPushFeedback("正在推送...");
    const message = buildDingTalkMessage(type, {
      goal: summerGoal,
      tasks: weeklyTasks,
      dailyPlan,
      logs,
      weekLabel: week.label,
    });
    const response = await fetch("/api/integrations/dingtalk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: type === "today" ? "今日安排" : type === "report" ? "周报摘要" : "整体进度", text: message }),
    });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    setPushFeedback(response.ok ? "已推送到钉钉" : data?.error || "推送失败，请检查钉钉 webhook 配置");
  }

  return (
    <div className="weekly-plan-page">
      <section className="page-toolbar">
        <div>
          <h1>周计划</h1>
          <span>{week.label} · 只回答今天做什么，以及做完后怎么同步</span>
        </div>
        <div className="weekly-toolbar-actions compact">
          <Button type="button" onClick={() => setLogDialogOpen(true)} className="bg-[#23B87A] hover:bg-[#1FA36C] rounded-xl">
            <MessageSquareText className="w-4 h-4 mr-2" />
            记录完成
          </Button>
          <Button type="button" variant="secondary" onClick={() => pushToDingTalk("today")} className="rounded-xl">
            <Send className="w-4 h-4 mr-2" />
            推送今日
          </Button>
          <Link className="secondary-action" href="/weekly/report">周报告</Link>
        </div>
      </section>

      {(saved || saveError) && (
        <div className={cn("weekly-save-feedback", saveError && "error")}>
          {saveError || "完成记录已同步到目标地图"}
        </div>
      )}

      {pushFeedback && (
        <div className={cn("weekly-save-feedback", pushFeedback.includes("失败") || pushFeedback.includes("检查") ? "error" : "")}>
          {pushFeedback}
        </div>
      )}

      {!loaded && (
        <section className="weekly-empty-state">
          <strong>正在同步目标地图</strong>
          <span>周计划只读取目标地图里的当前任务，不维护另一套任务库。</span>
        </section>
      )}

      <section className="weekly-plan-hero">
        <div>
          <span>今日焦点</span>
          <h2>{todayItems.length ? `${weekDays[todayIndex]}要完成 ${todayItems.length} 件事` : "今天没有硬性任务"}</h2>
          <p>{todayItems.length ? "先按下面的顺序完成今日任务。完成后点“记录完成”，把 Word、聊天记录或一段话粘进来，系统解析后再写回目标地图。" : "可以用今天做补录、复盘或临时调整；目标地图有新任务后，这里会自动出现今日安排。"}</p>
        </div>
        <div className="weekly-plan-score">
          <strong>{overallProgress}%</strong>
          <span>目标任务总进度</span>
          <div className="line-meter"><i style={{ width: `${overallProgress}%` }} /></div>
        </div>
      </section>

      <section className="weekly-stat-grid">
        <article><ClipboardList className="h-5 w-5" /><span>执行任务</span><strong>{weeklyTasks.length}</strong></article>
        <article><Target className="h-5 w-5" /><span>本周建议量</span><strong>{suggestedTotal}</strong></article>
        <article><CalendarDays className="h-5 w-5" /><span>有安排天数</span><strong>{activeDays}</strong></article>
        <article><CheckCircle2 className="h-5 w-5" /><span>高优先级</span><strong>{highPriorityCount}</strong></article>
      </section>

      <section className="weekly-execution-grid">
        <section className="weekly-today-panel">
          <div className="weekly-section-title">
            <CalendarDays className="h-5 w-5 text-[#2F7DD3]" />
            <div>
              <h2>今天做什么</h2>
              <p>{weekDays[todayIndex]} · {todayItems.length ? `${todayItems.length} 项任务 · 建议总量 ${todayTotal}` : "没有自动拆解任务"}</p>
            </div>
          </div>
          <div className="weekly-today-list">
            {todayItems.length ? todayItems.map(({ task, amount }) => (
              <article key={`today-${task.id}`}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.category} · {task.executionMode || "孩子自主"} · {task.dailyTarget || "节奏未配置"}</span>
                </div>
                <em>{amount}{task.unit}</em>
              </article>
            )) : (
              <div className="weekly-today-empty">今天可以用于复盘、补录或机动调整。</div>
            )}
          </div>
        </section>

        <aside className="weekly-recent-panel">
          <div className="weekly-section-title">
            <Sparkles className="h-5 w-5 text-[#23B87A]" />
            <div>
              <h2>最近记录</h2>
              <p>只展示已同步的完成记录，避免重复填报。</p>
            </div>
          </div>
          <div className="weekly-recent-list">
            {recentLogs.length ? recentLogs.map((log) => (
              <article key={log.id}>
                <strong>{log.summary || log.category || "完成记录"}</strong>
                <span>{log.date} · {log.amount || "已记录"}</span>
              </article>
            )) : <div className="weekly-today-empty">还没有完成记录。</div>}
          </div>
        </aside>
      </section>

      <section className="weekly-daily-plan-panel">
        <div className="weekly-section-title">
          <CalendarDays className="h-5 w-5 text-[#2F7DD3]" />
          <div>
            <h2>本周排程</h2>
            <p>按任务节奏自动铺到 7 天，只作为执行视图；任务本身仍在目标地图维护。</p>
          </div>
        </div>
        <div className="weekly-daily-grid">
          {weekDays.map((day, index) => (
            <article key={day} className={cn("weekly-day-card", index === todayIndex && "today")}>
              <strong>{day}</strong>
              {dailyPlan[index].length ? dailyPlan[index].map(({ task, amount }) => (
                <span key={`${day}-${task.id}`}>
                  {task.title}
                  <em>{amount}{task.unit}</em>
                </span>
              )) : <span className="empty">留给复盘或机动</span>}
            </article>
          ))}
        </div>
      </section>

      {!weeklyTasks.length && loaded && (
        <section className="weekly-empty-state">
          <strong>还没有可生成周计划的任务</strong>
          <span>先到目标地图里给当前目标添加任务，周计划会自动同步过来。</span>
          <Link className="secondary-action" href="/goals">去目标地图</Link>
        </section>
      )}

      <Dialog open={logDialogOpen} onOpenChange={(open) => {
        setLogDialogOpen(open);
        if (!open) resetProgressDrafts();
      }}>
        <DialogContent className="weekly-log-dialog">
          <DialogHeader>
            <DialogTitle>记录完成情况</DialogTitle>
            <DialogDescription>
              粘贴 Word、聊天记录或一段自然语言。系统只生成有把握的匹配，确认后再同步到目标地图。
            </DialogDescription>
          </DialogHeader>

          <textarea
            className="weekly-natural-log-input"
            value={progressReport}
            onChange={(event) => {
              setProgressReport(event.target.value);
              resetProgressDrafts();
            }}
            placeholder={"例如：\n今天 RAZ 读了 1 本，Unlock 做了 1 个单元，口语练习 20 分钟。\n数学计算练习完成 2 页。"}
          />

          <div className="weekly-dialog-actions">
            <Button type="button" variant="secondary" onClick={parseProgressReport} disabled={!progressReport.trim() || parsingProgress} className="rounded-xl">
              {parsingProgress ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {parsingProgress ? "解析中" : "解析为草稿"}
            </Button>
          </div>

          <div className="weekly-draft-review">
            <div className="weekly-draft-review-head">
              <strong>待确认草稿</strong>
              <span>{progressDrafts.length ? `${progressDrafts.length} 条` : "尚未解析"}</span>
            </div>
            {progressDrafts.length ? progressDrafts.map((draft) => (
              <article key={`${draft.taskId}-${draft.summary}`}>
                <div>
                  <strong>{draft.taskTitle}</strong>
                  <span>{draft.summary}</span>
                  {draft.note && <em>{draft.note}</em>}
                </div>
                <b>+{draft.amount}{draft.unit}</b>
              </article>
            )) : (
              <div className="weekly-draft-empty">
                <AlertTriangle className="h-4 w-4" />
                <span>解析后会在这里显示可确认的任务和完成量。不确定的内容不会自动写入。</span>
              </div>
            )}
          </div>

          <div className="weekly-dialog-actions end">
            <Button type="button" variant="secondary" onClick={() => setLogDialogOpen(false)} className="rounded-xl">
              取消
            </Button>
            <Button type="button" onClick={applyProgressDrafts} disabled={!progressDrafts.length || applyingProgress} className="bg-[#23B87A] hover:bg-[#1FA36C] rounded-xl">
              {applyingProgress ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {applyingProgress ? "同步中" : "确认同步"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
