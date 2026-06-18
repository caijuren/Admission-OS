"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Compass,
  Lightbulb,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import seedData from "../../../../data/eduos.json";

type GoalType = "north" | "phase" | "subject" | "project" | "habit";
type TaskStatus = "ahead" | "normal" | "behind";
type TaskPriority = "高" | "中" | "低";
type ExecutionMode = "孩子自主" | "家长陪练" | "亲子共学" | "家长验收";

type PlanGoal = {
  id: string;
  title: string;
  type: GoalType;
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

type ReportData = {
  goals?: PlanGoal[];
  goalTasks?: PlanTask[];
  goalLogs?: PlanLog[];
};

const initialGoals = seedData.goals as PlanGoal[];
const initialTasks = seedData.goalTasks as PlanTask[];
const initialLogs = (seedData.goalLogs || []) as PlanLog[];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getProgress(task: PlanTask) {
  if (!task.target) return 0;
  return clamp(Math.round((Number(task.current || 0) / Number(task.target || 0)) * 100), 0, 100);
}

function getRecentDates() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `${start.toISOString().slice(5, 10).replace("-", ".")} - ${end.toISOString().slice(5, 10).replace("-", ".")}`,
  };
}

function parseAmount(value?: string) {
  const match = value?.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export default function WeeklyReportPage() {
  const [goals, setGoals] = useState<PlanGoal[]>(initialGoals);
  const [tasks, setTasks] = useState<PlanTask[]>(initialTasks);
  const [logs, setLogs] = useState<PlanLog[]>(initialLogs);

  useEffect(() => {
    let cancelled = false;

    async function loadReportData() {
      const response = await fetch("/api/data", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const data = await response.json() as ReportData;
      if (cancelled) return;
      setGoals(Array.isArray(data.goals) ? data.goals : initialGoals);
      setTasks(Array.isArray(data.goalTasks) ? data.goalTasks : initialTasks);
      setLogs(Array.isArray(data.goalLogs) ? data.goalLogs : initialLogs);
    }

    loadReportData().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const period = useMemo(getRecentDates, []);
  const recentLogs = useMemo(
    () => logs.filter((log) => log.date >= period.start && log.date <= period.end),
    [logs, period.end, period.start]
  );
  const summerGoal = goals.find((goal) => goal.id === "summer-2025") || goals.find((goal) => goal.title.includes("暑假")) || goals[0];
  const recentTasks = useMemo(() => {
    if (!summerGoal) return tasks;
    return tasks.filter((task) => (task.goalIds || [task.goalId]).includes(summerGoal.id));
  }, [summerGoal, tasks]);
  const overallProgress = recentTasks.length
    ? Math.round(recentTasks.reduce((sum, task) => sum + getProgress(task), 0) / recentTasks.length)
    : 0;
  const categoryStats = useMemo(() => {
    const categories = Array.from(new Set(recentTasks.map((task) => task.category || "未分类")));
    return categories.map((category) => {
      const items = recentTasks.filter((task) => (task.category || "未分类") === category);
      const categoryLogs = recentLogs.filter((log) => log.category === category);
      const progress = items.length ? Math.round(items.reduce((sum, task) => sum + getProgress(task), 0) / items.length) : 0;
      return {
        category,
        count: items.length,
        logs: categoryLogs.length,
        amount: categoryLogs.reduce((sum, log) => sum + parseAmount(log.amount), 0),
        progress,
        behind: items.filter((task) => task.status === "behind" || (task.priority === "高" && getProgress(task) < 20)).length,
      };
    });
  }, [recentLogs, recentTasks]);
  const completedThisWeek = recentLogs.length;
  const activeDays = Array.from(new Set(recentLogs.map((log) => log.date))).length;
  const highPriorityBehind = recentTasks.filter((task) => task.priority === "高" && getProgress(task) < 20);
  const weakestCategory = [...categoryStats].sort((a, b) => (a.logs - b.logs) || (a.progress - b.progress))[0];
  const strongestCategory = [...categoryStats].sort((a, b) => (b.logs - a.logs) || (b.progress - a.progress))[0];
  const driftItems = [
    activeDays < 3 ? "本周有效记录天数偏少，容易看不清真实执行节奏。" : "",
    highPriorityBehind.length ? `${highPriorityBehind.length} 个高优先级任务仍处于低进度区。` : "",
    weakestCategory && strongestCategory && strongestCategory.logs - weakestCategory.logs >= 3 ? `${weakestCategory.category} 明显少于 ${strongestCategory.category}，注意学科投入失衡。` : "",
    overallProgress < 30 ? "总体任务仍在启动区，建议下周减少分散任务，抓 2-3 个关键项。" : "",
  ].filter(Boolean);
  const suggestions = [
    weakestCategory ? `下周优先补 ${weakestCategory.category}，至少安排 2 次可记录完成量。` : "先建立本周记录，再判断偏差。",
    highPriorityBehind[0] ? `高优先级任务先看“${highPriorityBehind[0].title}”，不要让它长期停留在低进度。` : "高优先级任务暂时没有明显落后，继续保持。",
    "周计划只需要记录完成量，不必每天完全按表执行；周末用报告看是否走偏即可。",
  ];
  const reportSummary = driftItems.length
    ? "下周把任务数量收窄一点，优先补齐低记录和高优先级项目。"
    : "当前节奏可以继续沿用，下周保持记录密度即可。";

  return (
    <div className="weekly-report-page">
      <section className="page-toolbar">
        <div>
          <h1>周报告</h1>
          <span>{period.label} · 对标近期任务和总体目标</span>
        </div>
        <Link className="secondary-action" href="/weekly">
          <ArrowLeft className="w-4 h-4" />
          返回周计划
        </Link>
      </section>

      <section className="weekly-report-hero">
        <div>
          <span>总体判断</span>
          <h2>{driftItems.length ? "下周需要校准" : "节奏基本稳定"}</h2>
          <p>{summerGoal?.title || "暑假目标"} 当前平均进度 {overallProgress}%，本周有 {completedThisWeek} 条执行记录，覆盖 {activeDays} 天。{reportSummary}</p>
        </div>
        <div className="weekly-report-score">
          <strong>{overallProgress}%</strong>
          <span>总体任务进度</span>
          <div className="line-meter"><i style={{ width: `${overallProgress}%` }} /></div>
        </div>
      </section>

      <section className="weekly-report-kpis">
        <article><ListChecks className="h-5 w-5" /><span>本周记录</span><strong>{completedThisWeek}</strong></article>
        <article><CheckCircle2 className="h-5 w-5" /><span>活跃天数</span><strong>{activeDays}</strong></article>
        <article><Target className="h-5 w-5" /><span>高优先级风险</span><strong>{highPriorityBehind.length}</strong></article>
        <article><Compass className="h-5 w-5" /><span>任务覆盖</span><strong>{categoryStats.length}</strong></article>
      </section>

      <section className="weekly-report-grid">
        <article className="weekly-report-panel">
          <div className="weekly-report-title"><TrendingUp className="h-5 w-5 text-[#23B87A]" /><h2>对标近期任务</h2></div>
          <div className="weekly-category-list">
            {categoryStats.map((item) => (
              <div key={item.category} className="weekly-category-row">
                <div>
                  <strong>{item.category}</strong>
                  <span>{item.count} 个任务 · 本周 {item.logs} 条记录 · 完成量 {item.amount || 0}</span>
                </div>
                <b>{item.progress}%</b>
                <div className="line-meter"><i style={{ width: `${item.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <article className="weekly-report-panel">
          <div className="weekly-report-title"><AlertTriangle className="h-5 w-5 text-[#E68A00]" /><h2>是否走偏</h2></div>
          <div className="weekly-drift-list">
            {driftItems.length ? driftItems.map((item) => (
              <div key={item} className="weekly-drift-item danger">{item}</div>
            )) : <div className="weekly-drift-item good">本周没有明显走偏，继续保持当前节奏。</div>}
          </div>
        </article>
      </section>

      <section className="weekly-report-panel">
        <div className="weekly-report-title"><Lightbulb className="h-5 w-5 text-[#23B87A]" /><h2>下周建议</h2></div>
        <div className="weekly-suggestion-list">
          {suggestions.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>
    </div>
  );
}
