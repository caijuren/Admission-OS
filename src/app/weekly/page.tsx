"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Flame,
  Save,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import seedData from "../../../data/eduos.json";

type TaskStatus = "ahead" | "normal" | "behind";
type TaskPriority = "高" | "中" | "低";

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

const initialGoals = seedData.goals as PlanGoal[];
const initialTasks = seedData.goalTasks as PlanTask[];
const initialLogs = (seedData.goalLogs || []) as PlanLog[];

const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

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

function allocateDaily(tasks: PlanTask[]) {
  const sorted = [...tasks].sort((a, b) => {
    const priorityScore = { "高": 0, "中": 1, "低": 2 };
    return (priorityScore[a.priority || "中"] - priorityScore[b.priority || "中"]) || a.category.localeCompare(b.category);
  });

  return dayNames.map((day, dayIndex) => ({
    day,
    tasks: sorted.filter((task, index) => index % 7 === dayIndex || task.dailyTarget?.includes("每天")).slice(0, 5),
  }));
}

export default function WeeklyPage() {
  const [goals, setGoals] = useState<PlanGoal[]>(initialGoals);
  const [tasks, setTasks] = useState<PlanTask[]>(initialTasks);
  const [logs, setLogs] = useState<PlanLog[]>(initialLogs);
  const [weeklyDone, setWeeklyDone] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

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

    loadWeeklyData().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const week = useMemo(getWeekRange, []);
  const summerGoal = goals.find((goal) => goal.id === "summer-2025") || goals.find((goal) => goal.title.includes("暑假")) || goals[0];
  const weeklyTasks = useMemo(() => {
    if (!summerGoal) return tasks;
    return tasks.filter((task) => (task.goalIds || [task.goalId]).includes(summerGoal.id));
  }, [summerGoal, tasks]);
  const categories = useMemo(() => Array.from(new Set(weeklyTasks.map((task) => task.category || "未分类"))), [weeklyTasks]);
  const dailyPlan = useMemo(() => allocateDaily(weeklyTasks), [weeklyTasks]);
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

  return (
    <div className="weekly-plan-page">
      <section className="page-toolbar">
        <div>
          <h1>暑假周计划</h1>
          <span>{week.label} · 参考拆到天，核心看本周是否完成</span>
        </div>
        <div className="weekly-toolbar-actions">
          <Link className="secondary-action" href="/weekly/report">查看周报告</Link>
          <Button type="button" onClick={saveWeeklyProgress} disabled={!doneTotal} className="bg-[#5B6BF5] hover:bg-[#4F5DE0] rounded-xl">
            <Save className="w-4 h-4 mr-2" />
            {saved ? "已同步" : "同步到目标计划"}
          </Button>
        </div>
      </section>

      {(saved || saveError) && (
        <div className={cn("weekly-save-feedback", saveError && "error")}>
          {saveError || "本周完成量已同步到目标计划"}
        </div>
      )}

      <section className="weekly-plan-hero">
        <div>
          <span>当前目标</span>
          <h2>{summerGoal?.title || "暑假基础建立期"}</h2>
          <p>{summerGoal?.description || "本周计划直接来自目标任务，保存后会同步目标页进度。"}</p>
        </div>
        <div className="weekly-plan-score">
          <strong>{weekProgress}%</strong>
          <span>本周完成度</span>
          <div className="line-meter"><i style={{ width: `${weekProgress}%` }} /></div>
        </div>
      </section>

      <section className="weekly-stat-grid">
        <article><ClipboardList className="h-5 w-5" /><span>本周任务</span><strong>{weeklyTasks.length}</strong></article>
        <article><Target className="h-5 w-5" /><span>建议总量</span><strong>{suggestedTotal}</strong></article>
        <article><CheckCircle2 className="h-5 w-5" /><span>本周已填</span><strong>{doneTotal}</strong></article>
        <article><Flame className="h-5 w-5" /><span>同步记录</span><strong>{logs.length}</strong></article>
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
                          <em>总进度 {task.current}/{task.target}{task.unit} · {task.dailyTarget || "节奏未配置"}</em>
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
          <span>先到目标计划里给暑假目标添加任务，周计划会自动同步过来。</span>
          <Link className="secondary-action" href="/goals">去目标计划</Link>
        </section>
      )}

      <section className="weekly-daily-reference">
        <div className="weekly-section-title">
          <CalendarDays className="h-5 w-5 text-[#5B6BF5]" />
          <div>
            <h2>拆到天的参考安排</h2>
            <p>暑假不用严格卡每天，主要用来避免一周任务堆到最后。</p>
          </div>
        </div>
        <div className="weekly-day-grid">
          {dailyPlan.map((day) => (
            <article key={day.day} className="weekly-day-card">
              <strong>{day.day}</strong>
              {day.tasks.length ? day.tasks.map((task) => (
                <span key={`${day.day}-${task.id}`} className={cn(task.priority === "高" && "priority")}>{task.title}</span>
              )) : <span>机动 / 休息</span>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
