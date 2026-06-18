"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MessageSquareText,
  Repeat,
  Save,
  Send,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import seedData from "../../../data/eduos.json";

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

type ParsedLogItem = {
  task: PlanTask;
  amount: number;
  line: string;
};

const initialGoals = seedData.goals as PlanGoal[];
const initialTasks = seedData.goalTasks as PlanTask[];
const initialLogs = (seedData.goalLogs || []) as PlanLog[];
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

function getTaskStatus(task: PlanTask): TaskStatus {
  if (task.target && task.current >= task.target) return "ahead";
  if (getProgress(task) < 20 && task.priority === "高") return "behind";
  return "normal";
}

function getRhythmGroups(tasks: PlanTask[]) {
  const daily = tasks.filter((task) => task.dailyTarget?.includes("每天"));
  const severalTimes = tasks.filter((task) => task.dailyTarget?.includes("每周"));
  const weekly = tasks.filter((task) => !daily.includes(task) && !severalTimes.includes(task));
  const review = [
    "周末核对本周完成量，少补录、多判断",
    "看周报告：低记录学科下周优先补",
    "只调整下周 2-3 个关键任务，不把计划排满",
  ];

  return [
    { title: "每天保持", note: "适合阅读、听力、晨读、口语这类稳定输入", tasks: daily },
    { title: "隔天推进", note: "适合 Unlock、写作、现代文阅读等需要间隔消化的任务", tasks: severalTimes },
    { title: "本周推进", note: "适合练习册、项目、书单、阶段性任务", tasks: weekly },
    { title: "周末复盘", note: "不追求每天完美，重点看一周有没有走偏", tasks: review },
  ];
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

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function parseNaturalLog(text: string, tasks: PlanTask[]) {
  const lines = text
    .split(/\n|；|;/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.flatMap((line) => {
    const normalizedLine = normalizeText(line);
    const amount = Number(line.match(/\d+(?:\.\d+)?/)?.[0] || 1);
    const matchedTask = tasks
      .filter((task) => Number(task.target || 0) > Number(task.current || 0))
      .map((task) => {
        const words = [task.title, task.category, task.description || ""]
          .join(" ")
          .split(/\s|\/|、|，|,|·|《|》|-|_/)
          .map((word) => normalizeText(word))
          .filter((word) => word.length >= 2);
        const score = words.reduce((sum, word) => sum + (normalizedLine.includes(word) ? word.length : 0), 0);
        return { task, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.task;

    return matchedTask ? [{ task: matchedTask, amount, line }] : [];
  });
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
  const [goals, setGoals] = useState<PlanGoal[]>(initialGoals);
  const [tasks, setTasks] = useState<PlanTask[]>(initialTasks);
  const [logs, setLogs] = useState<PlanLog[]>(initialLogs);
  const [weeklyDone, setWeeklyDone] = useState<Record<string, number>>({});
  const [naturalLog, setNaturalLog] = useState("");
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
      setGoals(Array.isArray(data.goals) ? data.goals : initialGoals);
      setTasks(Array.isArray(data.goalTasks) ? data.goalTasks : initialTasks);
      setLogs(Array.isArray(data.goalLogs) ? data.goalLogs : initialLogs);
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
    if (!summerGoal) return tasks;
    return tasks.filter((task) => (task.goalIds || [task.goalId]).includes(summerGoal.id));
  }, [summerGoal, tasks]);
  const categories = useMemo(() => Array.from(new Set(weeklyTasks.map((task) => task.category || "未分类"))), [weeklyTasks]);
  const rhythmGroups = useMemo(() => getRhythmGroups(weeklyTasks), [weeklyTasks]);
  const dailyPlan = useMemo(() => buildDailyPlan(weeklyTasks), [weeklyTasks]);
  const parsedLogs = useMemo(() => parseNaturalLog(naturalLog, weeklyTasks), [naturalLog, weeklyTasks]);
  const suggestedTotal = useMemo(() => weeklyTasks.reduce((sum, task) => sum + getSuggestedWeeklyAmount(task), 0), [weeklyTasks]);
  const doneTotal = Object.values(weeklyDone).reduce((sum, value) => sum + Number(value || 0), 0);
  const weekProgress = suggestedTotal ? clamp(Math.round((doneTotal / suggestedTotal) * 100), 0, 100) : 0;

  function updateDone(taskId: string, event: ChangeEvent<HTMLInputElement>) {
    setSaved(false);
    setSaveError("");
    setWeeklyDone((current) => ({
      ...current,
      [taskId]: Math.max(0, Number(event.target.value || 0)),
    }));
  }

  async function saveWeeklyProgress() {
    const changedEntries = Object.entries(weeklyDone).filter(([, value]) => Number(value || 0) > 0);
    if (!changedEntries.length) return;

    const nextTasks = tasks.map((task) => {
      const delta = Number(weeklyDone[task.id] || 0);
      if (!delta) return task;
      const nextCurrent = clamp(Number(task.current || 0) + delta, 0, Number(task.target || 0));
      const nextTask = { ...task, current: nextCurrent };
      return { ...nextTask, status: getTaskStatus(nextTask) };
    });
    const logDate = new Date().toISOString().slice(0, 10);
    const nextLogs = [
      ...changedEntries.map(([taskId, value]) => {
        const task = tasks.find((item) => item.id === taskId);
        return {
          id: `weekly-${Date.now()}-${taskId}`,
          goalId: task?.goalId || summerGoal?.id || "",
          date: logDate,
          category: task?.category || "周计划",
          summary: task?.title || "周计划任务",
          amount: `${value}${task?.unit || ""}`,
          note: `来自 ${week.label} 周计划`,
        };
      }),
      ...logs,
    ];

    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalTasks: nextTasks, goalLogs: nextLogs }),
    });

    if (!response.ok) {
      setSaveError("同步失败，请稍后再试");
      return;
    }
    setTasks(nextTasks);
    setLogs(nextLogs);
    setWeeklyDone({});
    setSaved(true);
    setSaveError("");
  }

  async function saveNaturalLog() {
    if (!parsedLogs.length) {
      setSaveError("没有解析到可同步的任务，请尽量写出任务名称和完成量。");
      return;
    }

    const deltaByTask = parsedLogs.reduce<Record<string, number>>((acc, item) => {
      acc[item.task.id] = Number(acc[item.task.id] || 0) + item.amount;
      return acc;
    }, {});
    const nextTasks = tasks.map((task) => {
      const delta = Number(deltaByTask[task.id] || 0);
      if (!delta) return task;
      const nextCurrent = clamp(Number(task.current || 0) + delta, 0, Number(task.target || 0));
      const nextTask = { ...task, current: nextCurrent };
      return { ...nextTask, status: getTaskStatus(nextTask) };
    });
    const logDate = new Date().toISOString().slice(0, 10);
    const nextLogs = [
      ...parsedLogs.map((item) => ({
        id: `natural-${Date.now()}-${item.task.id}-${Math.random().toString(16).slice(2, 6)}`,
        goalId: item.task.goalId || summerGoal?.id || "",
        date: logDate,
        category: item.task.category || "周计划",
        summary: item.task.title,
        amount: `${item.amount}${item.task.unit || ""}`,
        note: item.line,
      })),
      ...logs,
    ];

    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalTasks: nextTasks, goalLogs: nextLogs }),
    });

    if (!response.ok) {
      setSaveError("记录失败，请稍后再试");
      return;
    }

    setTasks(nextTasks);
    setLogs(nextLogs);
    setNaturalLog("");
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
          <h1>本周建议</h1>
          <span>{week.label} · 从目标地图自动拆解，不维护另一套任务</span>
        </div>
      </section>

      {(saved || saveError) && (
        <div className={cn("weekly-save-feedback", saveError && "error")}>
          {saveError || "本周完成量已同步到目标地图"}
        </div>
      )}

      {pushFeedback && (
        <div className={cn("weekly-save-feedback", pushFeedback.includes("失败") || pushFeedback.includes("检查") ? "error" : "")}>
          {pushFeedback}
        </div>
      )}

      <section className="weekly-plan-hero">
        <div>
          <span>当前目标</span>
          <h2>{summerGoal?.title || "暑假基础建立期"}</h2>
          <p>{summerGoal?.description || "根据目标周期、剩余量、优先级和执行节奏，生成本周建议，再拆到每天执行。"}</p>
          <div className="weekly-toolbar-actions">
            <Link className="secondary-action" href="/weekly/report">查看周报告</Link>
            <Button type="button" variant="secondary" onClick={() => pushToDingTalk("today")} className="rounded-xl">
              <Send className="w-4 h-4 mr-2" />
              推送今日
            </Button>
            <Button type="button" variant="secondary" onClick={() => pushToDingTalk("overall")} className="rounded-xl">
              推送整体
            </Button>
            <Button type="button" variant="secondary" onClick={() => pushToDingTalk("report")} className="rounded-xl">
              推送周报
            </Button>
            <Button type="button" onClick={saveWeeklyProgress} disabled={!doneTotal} className="bg-[#23B87A] hover:bg-[#1FA36C] rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              {saved ? "已记录" : "记录本周完成"}
            </Button>
          </div>
        </div>
        <div className="weekly-plan-score">
          <strong>{weekProgress}%</strong>
          <span>本周完成度</span>
          <div className="line-meter"><i style={{ width: `${weekProgress}%` }} /></div>
        </div>
      </section>

      <section className="weekly-stat-grid">
        <article><ClipboardList className="h-5 w-5" /><span>目标任务</span><strong>{weeklyTasks.length}</strong></article>
        <article><Target className="h-5 w-5" /><span>建议总量</span><strong>{suggestedTotal}</strong></article>
        <article><CalendarDays className="h-5 w-5" /><span>每日安排</span><strong>{dailyPlan.filter((items) => items.length).length}</strong></article>
        <article><CheckCircle2 className="h-5 w-5" /><span>本周已填</span><strong>{doneTotal}</strong></article>
      </section>

      <section className="weekly-recommendation-panel">
        <div className="weekly-section-title">
          <Target className="h-5 w-5 text-[#23B87A]" />
          <div>
            <h2>本周对标建议</h2>
            <p>先看本周应该推进多少，再决定每天怎么排，不把周计划变成另一套任务库。</p>
          </div>
        </div>
        <div className="weekly-recommendation-grid">
          {weeklyTasks
            .filter((task) => getSuggestedWeeklyAmount(task) > 0)
            .slice(0, 6)
            .map((task) => {
              const suggested = getSuggestedWeeklyAmount(task);
              return (
                <article key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{task.category} · 总进度 {task.current}/{task.target}{task.unit}</span>
                  <b>本周建议 {suggested}{task.unit}</b>
                </article>
              );
            })}
        </div>
      </section>

      {weeklyTasks.length ? (
        <section className="weekly-workload-grid">
          {categories.map((category) => {
            const categoryTasks = weeklyTasks.filter((task) => (task.category || "未分类") === category);
            return (
              <article key={category} className="weekly-workload-column">
                <div className="weekly-column-head">
                  <BookOpen className="h-4 w-4" />
                  <h2>{category}</h2>
                  <span>{categoryTasks.length} 项</span>
                </div>
                <div className="weekly-task-stack">
                  {categoryTasks.map((task) => {
                    const suggested = getSuggestedWeeklyAmount(task);
                    return (
                      <div key={task.id} className="weekly-task-row">
                        <div>
                          <strong>{task.title}</strong>
                          <span>{task.description || "未配置具体说明"}</span>
                          <em>总进度 {task.current}/{task.target}{task.unit} · {task.dailyTarget || "节奏未配置"} · {task.executionMode || "孩子自主"}</em>
                          <b>建议本周 {suggested}{task.unit}</b>
                        </div>
                        <label>
                          <span>本周完成</span>
                          <Input
                            type="number"
                            min="0"
                            max={Math.max(0, task.target - task.current)}
                            value={weeklyDone[task.id] ?? ""}
                            placeholder={`${suggested}${task.unit}`}
                            onChange={(event) => updateDone(task.id, event)}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="weekly-empty-state">
          <strong>还没有可生成周计划的任务</strong>
          <span>先到目标地图里给暑假目标添加任务，周计划会自动同步过来。</span>
          <Link className="secondary-action" href="/goals">去目标地图</Link>
        </section>
      )}

      <section className="weekly-daily-plan-panel">
        <div className="weekly-section-title">
          <CalendarDays className="h-5 w-5 text-[#2F7DD3]" />
          <div>
            <h2>拆到每天</h2>
            <p>根据执行节奏自动分配，可以作为每日任务分布的初稿。</p>
          </div>
        </div>
        <div className="weekly-daily-grid">
          {weekDays.map((day, index) => (
            <article key={day} className="weekly-day-card">
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

      <section className="weekly-natural-log-panel">
        <div className="weekly-section-title">
          <MessageSquareText className="h-5 w-5 text-[#23B87A]" />
          <div>
            <h2>一段话记录今天</h2>
            <p>可以连续写很多条，系统会按任务名称和完成量解析，并同步到整体进度。</p>
          </div>
        </div>
        <textarea
          className="weekly-natural-log-input"
          value={naturalLog}
          onChange={(event) => {
            setNaturalLog(event.target.value);
            setSaved(false);
            setSaveError("");
          }}
          placeholder={"例如：\nRAZ 读了 1 本；计算练习做了 2 页；口语练习 20 分钟"}
        />
        <div className="weekly-natural-log-preview">
          <strong>解析预览</strong>
          {parsedLogs.length ? parsedLogs.map((item) => (
            <span key={`${item.task.id}-${item.line}`}>
              {item.task.title}
              <em>+{item.amount}{item.task.unit}</em>
            </span>
          )) : <span className="empty">输入后会显示可同步的任务和完成量</span>}
        </div>
        <div className="weekly-toolbar-actions">
          <Button type="button" onClick={saveNaturalLog} disabled={!naturalLog.trim()} className="bg-[#23B87A] hover:bg-[#1FA36C] rounded-xl">
            <Save className="w-4 h-4 mr-2" />
            解析并同步
          </Button>
        </div>
      </section>

      <section className="weekly-rhythm-reference">
        <div className="weekly-section-title">
          <Repeat className="h-5 w-5 text-[#2F7DD3]" />
          <div>
            <h2>节奏判断</h2>
            <p>用来检查每天分配是否过密，必要时只保留最高优先级。</p>
          </div>
        </div>
        <div className="weekly-rhythm-grid compact">
          {rhythmGroups.map((group) => (
            <article key={group.title} className="weekly-rhythm-card">
              <strong>{group.title}</strong>
              <em>{group.note}</em>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
