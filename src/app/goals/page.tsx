"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  BookOpen,
  CalendarCheck2,
  Compass,
  FileText,
  Flame,
  ListChecks,
  PenLine,
  Plus,
  Route,
  Shuffle,
  Sigma,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import seedData from "../../../data/eduos.json";

type TaskStatus = "ahead" | "normal" | "behind";
type GoalType = "north" | "phase" | "subject" | "project" | "habit";
type GoalStatus = "进行中" | "规划中" | "重点推进";
type TaskPriority = "高" | "中" | "低";
type ViewMode = "overview" | "board" | "logs";

type PlanGoal = {
  id: string;
  title: string;
  type: GoalType;
  period: string;
  progress: number;
  status: GoalStatus;
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
  description: string;
  target: number;
  current: number;
  unit: string;
  dailyTarget: string;
  status: TaskStatus;
  priority: TaskPriority;
};

type PlanLog = {
  id: string;
  goalId: string;
  date: string;
  category: string;
  summary: string;
  amount: string;
  note: string;
};

type PlanPhase = {
  id: string;
  goalId: string;
  title: string;
  period: string;
  description: string;
  order: number;
};

type PlanData = {
  goals?: PlanGoal[];
  goalTasks?: PlanTask[];
  goalLogs?: PlanLog[];
  goalPhases?: PlanPhase[];
};

const initialGoals = seedData.goals as PlanGoal[];
const initialTasks = seedData.goalTasks as PlanTask[];
const initialLogs = seedData.goalLogs as PlanLog[];
const initialPhases = (seedData.goalPhases || []) as PlanPhase[];

const goalTypeLabel: Record<GoalType, string> = {
  north: "长期",
  phase: "阶段",
  subject: "专项",
  project: "项目",
  habit: "习惯",
};

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  ahead: { label: "超前", className: "bg-[#EAFBF4] text-[#23B87A]" },
  normal: { label: "正常", className: "bg-[#EEF2FF] text-[#5B6BF5]" },
  behind: { label: "落后", className: "bg-[#FFF4E5] text-[#E68A00]" },
};

const categoryStyles = [
  { icon: BookOpen, tone: "text-[#5B6BF5]", soft: "bg-[#EEF2FF]", bar: "from-[#5B6BF5] to-[#8B5CF6]" },
  { icon: FileText, tone: "text-[#EF5DA8]", soft: "bg-[#FFF0F6]", bar: "from-[#EF5DA8] to-[#FFB347]" },
  { icon: Sigma, tone: "text-[#23B87A]", soft: "bg-[#EAFBF4]", bar: "from-[#23B87A] to-[#5B6BF5]" },
  { icon: Target, tone: "text-[#E68A00]", soft: "bg-[#FFF4E5]", bar: "from-[#E68A00] to-[#EF5DA8]" },
];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getProgress(task: Pick<PlanTask, "current" | "target">) {
  if (!task.target) return 0;
  return Math.min(100, Math.round((task.current / task.target) * 100));
}

function splitFocus(value: string) {
  return value
    .split(/\n|,|，|、/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCategoryStyle(category: string, categories: string[]) {
  const index = Math.max(0, categories.indexOf(category));
  return categoryStyles[index % categoryStyles.length];
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<PlanGoal[]>(initialGoals);
  const [tasks, setTasks] = useState<PlanTask[]>(initialTasks);
  const [logs, setLogs] = useState<PlanLog[]>(initialLogs);
  const [phases, setPhases] = useState<PlanPhase[]>(initialPhases);
  const [activeGoalId, setActiveGoalId] = useState(initialGoals[1]?.id || initialGoals[0]?.id || "");
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [goalOpen, setGoalOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PlanGoal | null>(null);
  const [editingTask, setEditingTask] = useState<PlanTask | null>(null);
  const [editingPhase, setEditingPhase] = useState<PlanPhase | null>(null);
  const [draggingGoalId, setDraggingGoalId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPlan() {
      const response = await fetch("/api/data", { cache: "no-store" });
      if (!response.ok || cancelled) return;

      const data = (await response.json()) as PlanData;
      if (cancelled) return;

      const nextGoals = Array.isArray(data.goals) ? data.goals : initialGoals;
      const nextTasks = Array.isArray(data.goalTasks) ? data.goalTasks : initialTasks;
      const nextLogs = Array.isArray(data.goalLogs) ? data.goalLogs : initialLogs;
      const nextPhases = Array.isArray(data.goalPhases) ? data.goalPhases : initialPhases;

      setGoals(nextGoals);
      setTasks(nextTasks);
      setLogs(nextLogs);
      setPhases(nextPhases);
      setActiveGoalId((current) => nextGoals.some((goal) => goal.id === current) ? current : nextGoals[1]?.id || nextGoals[0]?.id || "");
    }

    loadPlan().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const activeGoal = goals.find((goal) => goal.id === activeGoalId) || goals[0];
  const activeTasks = useMemo(
    () => tasks.filter((task) => activeGoal && ((task.goalIds || [task.goalId]).includes(activeGoal.id))),
    [activeGoal, tasks]
  );
  const activeLogs = useMemo(() => logs.filter((log) => log.goalId === activeGoal?.id), [activeGoal?.id, logs]);
  const activePhases = useMemo(
    () => phases.filter((phase) => phase.goalId === activeGoal?.id).sort((a, b) => a.order - b.order),
    [activeGoal?.id, phases]
  );
  const categories = useMemo(() => Array.from(new Set(activeTasks.map((task) => task.category || "未分类"))), [activeTasks]);
  const childGoals = useMemo(() => goals.filter((goal) => goal.parentId === activeGoal?.id), [activeGoal?.id, goals]);
  const linkedGoals = useMemo(() => {
    const ids = new Set(activeTasks.flatMap((task) => task.goalIds || [task.goalId]).filter((id) => id !== activeGoal?.id));
    return goals.filter((goal) => ids.has(goal.id));
  }, [activeGoal?.id, activeTasks, goals]);

  const summary = useMemo(() => {
    const totalTarget = activeTasks.reduce((sum, task) => sum + Number(task.target || 0), 0);
    const totalCurrent = activeTasks.reduce((sum, task) => sum + Math.min(Number(task.current || 0), Number(task.target || 0)), 0);
    const behind = activeTasks.filter((task) => task.status === "behind");
    const completed = activeTasks.filter((task) => getProgress(task) >= 100);

    return {
      progress: totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0,
      completed: completed.length,
      total: activeTasks.length,
      behind,
      logDays: Array.from(new Set(activeLogs.map((log) => log.date))).length,
    };
  }, [activeLogs, activeTasks]);

  const conflicts = useMemo(() => {
    if (!activeGoal) return [];
    const items: Array<{ title: string; detail: string; tone: "warn" | "danger" }> = [];
    summary.behind.forEach((task) => {
      items.push({ title: `${task.category} · ${task.title} 已落后`, detail: "任务状态被标记为落后，建议优先调整当前阶段安排。", tone: "danger" });
    });
    childGoals.forEach((goal) => {
      if (activeGoal.progress - goal.progress >= 25) {
        items.push({ title: `${goal.title} 明显慢于父目标`, detail: `父目标 ${activeGoal.progress}%，子目标 ${goal.progress}%，进度差超过 25%。`, tone: "warn" });
      }
    });
    if ((activeGoal.type === "subject" || activeGoal.type === "project") && activeTasks.length === 0) {
      items.push({ title: "专项目标缺少执行任务", detail: "这个目标没有关联任何当前任务，驾驶舱无法判断真实推进。", tone: "warn" });
    }
    if (activeGoal.parentId) {
      const parent = goals.find((goal) => goal.id === activeGoal.parentId);
      if (parent && activeGoal.progress - parent.progress >= 30) {
        items.push({ title: "子目标快于父目标过多", detail: `${activeGoal.title} 为 ${activeGoal.progress}%，父目标 ${parent.title} 为 ${parent.progress}%，建议检查统计口径。`, tone: "warn" });
      }
    }
    return items;
  }, [activeGoal, activeTasks.length, childGoals, goals, summary.behind]);

  async function persist(next: Partial<PlanData>) {
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  async function saveGoals(nextGoals: PlanGoal[]) {
    setGoals(nextGoals);
    await persist({ goals: nextGoals });
  }

  async function saveTasks(nextTasks: PlanTask[]) {
    setTasks(nextTasks);
    await persist({ goalTasks: nextTasks });
  }

  async function saveLogs(nextLogs: PlanLog[]) {
    setLogs(nextLogs);
    await persist({ goalLogs: nextLogs });
  }

  async function savePhases(nextPhases: PlanPhase[]) {
    setPhases(nextPhases);
    await persist({ goalPhases: nextPhases });
  }

  async function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const goal: PlanGoal = {
      id: editingGoal?.id || uid("goal"),
      title: String(form.get("title") || "新目标"),
      type: String(form.get("type") || "phase") as GoalType,
      period: String(form.get("period") || "待定"),
      progress: Math.max(0, Math.min(100, Number(form.get("progress") || 0))),
      status: String(form.get("status") || "规划中") as GoalStatus,
      description: String(form.get("description") || ""),
      parentId: String(form.get("parentId") || "") || undefined,
      focus: splitFocus(String(form.get("focus") || "")),
    };
    const nextGoals = editingGoal ? goals.map((item) => (item.id === editingGoal.id ? goal : item)) : [...goals, goal];
    await saveGoals(nextGoals);
    setActiveGoalId(goal.id);
    setEditingGoal(null);
    setGoalOpen(false);
  }

  async function deleteGoal(goalId: string) {
    const goal = goals.find((item) => item.id === goalId);
    const childCount = goals.filter((item) => item.parentId === goalId).length;
    const confirmed = window.confirm(
      `确认删除“${goal?.title || "当前目标"}”吗？${childCount ? `这会同时删除 ${childCount} 个子目标。` : ""}相关任务和记录也会被移除。`
    );
    if (!confirmed) return;
    const nextGoals = goals.filter((goal) => goal.id !== goalId && goal.parentId !== goalId);
    const removedIds = new Set(goals.filter((goal) => goal.id === goalId || goal.parentId === goalId).map((goal) => goal.id));
    const nextTasks = tasks.filter((task) => !removedIds.has(task.goalId));
    const nextLogs = logs.filter((log) => !removedIds.has(log.goalId));
    setGoals(nextGoals);
    setTasks(nextTasks);
    setLogs(nextLogs);
    setActiveGoalId(nextGoals[0]?.id || "");
    await persist({ goals: nextGoals, goalTasks: nextTasks, goalLogs: nextLogs });
  }

  async function moveGoal(goalId: string, parentId: string) {
    if (goalId === parentId) return;
    const descendants = new Set<string>();
    function collect(id: string) {
      goals.filter((goal) => goal.parentId === id).forEach((goal) => {
        descendants.add(goal.id);
        collect(goal.id);
      });
    }
    collect(goalId);
    if (descendants.has(parentId)) return;
    const nextGoals = goals.map((goal) => goal.id === goalId ? { ...goal, parentId } : goal);
    await saveGoals(nextGoals);
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeGoal) return;
    const form = new FormData(event.currentTarget);
    const task: PlanTask = {
      id: editingTask?.id || uid("task"),
      goalId: activeGoal.id,
      goalIds: Array.from(new Set([activeGoal.id, ...String(form.get("goalIds") || "").split(",").map((item) => item.trim()).filter(Boolean)])),
      phaseId: String(form.get("phaseId") || ""),
      category: String(form.get("category") || "未分类"),
      title: String(form.get("title") || "新任务"),
      description: String(form.get("description") || ""),
      target: Math.max(0, Number(form.get("target") || 0)),
      current: Math.max(0, Number(form.get("current") || 0)),
      unit: String(form.get("unit") || "次"),
      dailyTarget: String(form.get("dailyTarget") || ""),
      status: String(form.get("status") || "normal") as TaskStatus,
      priority: String(form.get("priority") || "中") as TaskPriority,
    };
    const nextTasks = editingTask ? tasks.map((item) => (item.id === editingTask.id ? task : item)) : [...tasks, task];
    await saveTasks(nextTasks);
    setEditingTask(null);
    setTaskOpen(false);
  }

  async function deleteTask(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!window.confirm(`确认删除任务“${task?.title || "当前任务"}”吗？`)) return;
    await saveTasks(tasks.filter((task) => task.id !== taskId));
  }

  async function handlePhaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeGoal) return;
    const form = new FormData(event.currentTarget);
    const phase: PlanPhase = {
      id: editingPhase?.id || uid("phase"),
      goalId: activeGoal.id,
      title: String(form.get("title") || "新阶段"),
      period: String(form.get("period") || ""),
      description: String(form.get("description") || ""),
      order: Number(form.get("order") || activePhases.length + 1),
    };
    const nextPhases = editingPhase ? phases.map((item) => item.id === editingPhase.id ? phase : item) : [...phases, phase];
    await savePhases(nextPhases);
    setEditingPhase(null);
    setPhaseOpen(false);
  }

  async function deletePhase(phaseId: string) {
    const phase = phases.find((item) => item.id === phaseId);
    if (!window.confirm(`确认删除阶段“${phase?.title || "当前阶段"}”吗？关联任务会保留，但会取消阶段归属。`)) return;
    const nextTasks = tasks.map((task) => task.phaseId === phaseId ? { ...task, phaseId: "" } : task);
    setTasks(nextTasks);
    setPhases(phases.filter((phase) => phase.id !== phaseId));
    await persist({ goalTasks: nextTasks, goalPhases: phases.filter((phase) => phase.id !== phaseId) });
  }

  async function handleLogSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeGoal) return;
    const form = new FormData(event.currentTarget);
    const log: PlanLog = {
      id: uid("log"),
      goalId: activeGoal.id,
      date: String(form.get("date") || new Date().toISOString().slice(0, 10)),
      category: String(form.get("category") || categories[0] || "未分类"),
      summary: String(form.get("summary") || "今日学习记录"),
      amount: String(form.get("amount") || ""),
      note: String(form.get("note") || ""),
    };
    await saveLogs([log, ...logs]);
    setLogOpen(false);
  }

  if (!activeGoal) {
    return (
      <div className="summer-goals-page">
        <section className="page-toolbar compact">
          <div>
            <h1>目标计划</h1>
            <span>当前目标数为 0</span>
          </div>
          <button className="summer-primary-button" onClick={() => { setEditingGoal(null); setGoalOpen(true); }}>
            <Plus className="h-4 w-4" />
            新增目标
          </button>
        </section>
        <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} goals={goals} goal={editingGoal} onSubmit={handleGoalSubmit} />
      </div>
    );
  }

  return (
    <div className="summer-goals-page">
      <section className="page-toolbar compact">
        <div>
          <h1>目标计划</h1>
          <span>{goals.length} 个目标 · {tasks.length} 个任务 · {conflicts.length ? `${conflicts.length} 条提醒` : "运行正常"}</span>
        </div>
        <div className="goal-toolbar">
          <button className="summer-primary-button" onClick={() => { setEditingGoal(null); setGoalOpen(true); }}>
            <Plus className="h-4 w-4" />
            新增目标
          </button>
        </div>
      </section>

      <section className="goal-os-grid">
        <article className="goal-map-panel">
          <div className="goal-panel-title with-action">
            <Route className="h-5 w-5 text-[#5B6BF5]" />
            <div>
              <h2>目标地图</h2>
              <span>长期目标、阶段目标和专项目标统一管理</span>
            </div>
            <button className="goal-icon-button" onClick={() => { setEditingGoal(null); setGoalOpen(true); }} aria-label="新增目标">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="goal-tree-list">
            {goals.map((goal) => (
              <button
                key={goal.id}
                className={cn("goal-node-row", goal.id === activeGoal.id && "active", goal.parentId && "child")}
                draggable
                onDragStart={() => setDraggingGoalId(goal.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  moveGoal(draggingGoalId, goal.id);
                  setDraggingGoalId("");
                }}
                onClick={() => setActiveGoalId(goal.id)}
              >
                <div className="goal-node-dot" />
                <div>
                  <strong>{goal.title}</strong>
                  <span>{goalTypeLabel[goal.type]} · {goal.period}</span>
                </div>
                <em>{goal.progress}%</em>
              </button>
            ))}
          </div>
        </article>

        <article className="goal-active-panel">
          <div className="goal-active-head">
            <div>
              <span>{goalTypeLabel[activeGoal.type]}目标 · 当前选中</span>
              <h2>{activeGoal.title}</h2>
              <p>{activeGoal.description || "还没有配置目标说明。"}</p>
            </div>
            <strong>{activeGoal.progress}%</strong>
          </div>
          <div className="summer-progress-track">
            <i style={{ width: `${activeGoal.progress}%` }} />
          </div>
          <div className="goal-active-meta">
            <span><CalendarCheck2 className="h-4 w-4" /> {activeGoal.period}</span>
            <span><Compass className="h-4 w-4" /> {childGoals.length} 个子目标</span>
            <span><Sparkles className="h-4 w-4" /> {activeGoal.status}</span>
          </div>
          <div className="goal-action-row">
            <button onClick={() => { setEditingGoal(activeGoal); setGoalOpen(true); }}>编辑目标</button>
            <button className="danger" onClick={() => deleteGoal(activeGoal.id)}>删除目标</button>
          </div>
          <div className="goal-scope-row">
            <button className={cn(viewMode === "overview" && "active")} onClick={() => setViewMode("overview")}>目标说明</button>
            <button className={cn(viewMode === "board" && "active")} onClick={() => setViewMode("board")}>执行看板</button>
            <button className={cn(viewMode === "logs" && "active")} onClick={() => setViewMode("logs")}>每日记录</button>
          </div>
        </article>
      </section>

      {viewMode === "overview" && (
        <section className="goal-mode-panel">
          <div>
            <span>{goalTypeLabel[activeGoal.type]}目标</span>
            <h2>{activeGoal.title}</h2>
            <p>{activeGoal.description || "还没有配置目标说明，可以点击编辑目标补充。"}</p>
            <div className="goal-focus-list">
              {(activeGoal.focus?.length ? activeGoal.focus : ["还没有配置关键达成标准"]).map((item) => (
                <em key={item}>{item}</em>
              ))}
            </div>
            <div className="goal-relation-grid">
              <RelationBlock title="子目标" items={childGoals.map((goal) => `${goal.title} · ${goal.progress}%`)} empty="没有子目标" />
              <RelationBlock title="关联目标" items={linkedGoals.map((goal) => `${goal.title} · ${goalTypeLabel[goal.type]}`)} empty="没有任务关联到其他目标" />
              <RelationBlock title="冲突提醒" items={conflicts.map((item) => item.title)} empty="当前没有明显冲突" />
            </div>
          </div>
          <div className="goal-mode-metrics">
            <strong>{activeGoal.progress}%</strong>
            <span>{activeGoal.period}</span>
            <em>{activeGoal.status}</em>
          </div>
        </section>
      )}

      {viewMode === "board" && (
        <section className="goal-phase-section">
          <div className="summer-board-head flush">
            <div>
              <h2>阶段配置</h2>
              <p>把当前目标拆成可执行的时间段，用来承接具体任务。</p>
            </div>
            <button className="secondary-action" onClick={() => { setEditingPhase(null); setPhaseOpen(true); }}>
              <Plus className="h-4 w-4" />
              新增阶段
            </button>
          </div>
          {activePhases.length ? (
            <div className="summer-phase-grid">
              {activePhases.map((phase) => (
                <article key={phase.id} className="summer-phase-card">
                  <span>{phase.title}</span>
                  <strong>{phase.period || "未设置周期"}</strong>
                  <p>{phase.description || "未配置阶段说明"}</p>
                  <div className="goal-action-row compact">
                    <button onClick={() => { setEditingPhase(phase); setPhaseOpen(true); }}>编辑</button>
                    <button className="danger" onClick={() => deletePhase(phase.id)}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="goal-muted-line">当前目标没有配置阶段。</div>}
        </section>
      )}

      {viewMode !== "overview" && (
        <>
          <section className="summer-stats-row">
            {[
              [Target, "分项任务", `${summary.total} 个`, "text-[#5B6BF5]"],
              [TrendingUp, "总体完成", `${summary.progress}%`, "text-[#23B87A]"],
              [AlertTriangle, "落后任务", `${summary.behind.length} 个`, "text-[#E68A00]"],
              [Flame, "记录天数", `${summary.logDays} 天`, "text-[#8B5CF6]"],
            ].map(([Icon, label, value, color]) => {
              const TypedIcon = Icon as typeof Target;
              return (
                <article key={label as string} className="summer-stat-card">
                  <TypedIcon className={cn("h-5 w-5", color as string)} />
                  <span>{label as string}</span>
                  <strong>{value as string}</strong>
                </article>
              );
            })}
          </section>

          <section className="summer-board-head" id="daily-logs">
            <div>
              <h2>{viewMode === "logs" ? "每日执行记录" : "当前目标的任务看板"}</h2>
              <p>{viewMode === "logs" ? "只显示当前目标的执行记录。" : "任务按大类汇总，便于查看当前目标的执行结构。"}</p>
            </div>
            <div className="goal-toolbar">
              {viewMode === "board" && (
                <button className="summer-primary-button" onClick={() => { setEditingTask(null); setTaskOpen(true); }}>
                  <Plus className="h-4 w-4" />
                  新增任务
                </button>
              )}
              <button className="summer-primary-button" onClick={() => setLogOpen(true)}>
                <Plus className="h-4 w-4" />
                每日记录
              </button>
            </div>
          </section>
        </>
      )}

      {viewMode === "board" && (
        categories.length ? (
          <section className="summer-subject-grid">
            {categories.map((category) => {
              const categoryTasks = activeTasks.filter((task) => (task.category || "未分类") === category);
              const progress = categoryTasks.length ? Math.round(categoryTasks.reduce((sum, task) => sum + getProgress(task), 0) / categoryTasks.length) : 0;
              const behind = categoryTasks.filter((task) => task.status === "behind").length;
              const config = getCategoryStyle(category, categories);
              const Icon = config.icon;
              return (
                <article key={category} className="summer-subject-column">
                  <div className="summer-subject-head">
                    <div className={cn("summer-subject-icon", config.soft, config.tone)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3>{category}</h3>
                      <span>{categoryTasks.length} 个分项 · {behind ? `${behind} 个落后` : "节奏正常"}</span>
                    </div>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="summer-progress-track compact">
                    <i className={cn("bg-gradient-to-r", config.bar)} style={{ width: `${progress}%` }} />
                  </div>

                  <div className="summer-task-list">
                    {categoryTasks.map((task) => {
                      const taskProgress = getProgress(task);
                      const status = statusConfig[task.status];
                      return (
                        <div key={task.id} className="summer-task-card">
                          <div className="summer-task-top">
                            <div>
                              <h4>{task.title}</h4>
                              <span>{task.dailyTarget || "未配置执行节奏"}</span>
                            </div>
                            <em className={status.className}>{status.label}</em>
                          </div>
                          <p>{task.description || "还没有配置任务说明。"}</p>
                          <div className="summer-task-progress">
                            <span>{task.current}/{task.target}{task.unit}</span>
                            <b>{taskProgress}%</b>
                          </div>
                          <div className="summer-progress-track compact">
                            <i className={cn("bg-gradient-to-r", config.bar)} style={{ width: `${taskProgress}%` }} />
                          </div>
                          <div className="goal-action-row compact">
                            <button onClick={() => { setEditingTask(task); setTaskOpen(true); }}>编辑</button>
                            <button className="danger" onClick={() => deleteTask(task.id)}>删除</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="goal-empty-state">
            当前目标还没有配置执行任务。点击“新增任务”后，可以输入数学、英语、项目、考证等任意大类。
          </section>
        )
      )}

      <section className={cn("summer-bottom-grid", viewMode === "logs" && "logs-only")}>
        {viewMode === "board" && (
          <article className="summer-insight-card">
            <div className="summer-section-title">
              <AlertTriangle className="h-5 w-5 text-[#E68A00]" />
              <h2>冲突与差距</h2>
            </div>
            <div className="summer-gap-list">
              {conflicts.length ? conflicts.map((item) => (
                <div key={`${item.title}-${item.detail}`} className={cn("summer-gap-item", item.tone === "danger" && "danger")}>
                  <span>{item.tone === "danger" ? "冲突" : "提醒"}</span>
                  <strong>{item.title}</strong>
                  <em>{item.detail}</em>
                </div>
              )) : <div className="goal-muted-line">当前没有落后任务。</div>}
            </div>
          </article>
        )}

        {(viewMode === "board" || viewMode === "logs") && (
          <article className="summer-insight-card">
            <div className="summer-section-title">
              <ListChecks className="h-5 w-5 text-[#5B6BF5]" />
              <h2>最近记录</h2>
            </div>
            <div className="summer-log-list">
              {activeLogs.length ? activeLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="summer-log-item">
                  <div className="summer-log-icon">
                    <PenLine className="h-4 w-4" />
                  </div>
                  <div>
                    <strong>{log.category} · {log.summary}</strong>
                    <span>{log.date} · {log.amount || "未填写完成量"}</span>
                    {log.note && <p>{log.note}</p>}
                  </div>
                </div>
              )) : <div className="goal-muted-line">当前目标还没有每日记录，记录天数为 0。</div>}
            </div>
          </article>
        )}
      </section>

      <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} goals={goals} goal={editingGoal} onSubmit={handleGoalSubmit} />
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} task={editingTask} categories={categories} goals={goals} phases={activePhases} activeGoalId={activeGoal.id} onSubmit={handleTaskSubmit} />
      <LogDialog open={logOpen} onOpenChange={setLogOpen} categories={categories} onSubmit={handleLogSubmit} />
      <PhaseDialog open={phaseOpen} onOpenChange={setPhaseOpen} phase={editingPhase} order={activePhases.length + 1} onSubmit={handlePhaseSubmit} />
    </div>
  );
}

function RelationBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="goal-relation-card">
      <strong>{title}</strong>
      {(items.length ? items : [empty]).map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  goals,
  goal,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: PlanGoal[];
  goal: PlanGoal | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog">
        <DialogHeader>
          <DialogTitle>{goal ? "编辑目标" : "新增目标"}</DialogTitle>
          <DialogDescription>目标说明和关键达成标准都可以自己配置，保存后会进入目标地图。</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="app-form">
          <label className="form-field"><span>目标名称</span><Input name="title" defaultValue={goal?.title} required /></label>
          <div className="form-grid two">
            <label className="form-field"><span>目标类型</span><select name="type" defaultValue={goal?.type || "phase"}><option value="north">长期</option><option value="phase">阶段</option><option value="subject">专项</option><option value="project">项目</option><option value="habit">习惯</option></select></label>
            <label className="form-field"><span>父级目标</span><select name="parentId" defaultValue={goal?.parentId || ""}><option value="">无</option>{goals.filter((item) => item.id !== goal?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          </div>
          <div className="form-grid two">
            <label className="form-field"><span>周期</span><Input name="period" defaultValue={goal?.period} placeholder="例如：2025.06-2025.08" /></label>
            <label className="form-field"><span>进度</span><Input name="progress" type="number" min="0" max="100" defaultValue={goal?.progress || 0} /></label>
          </div>
          <label className="form-field"><span>状态</span><select name="status" defaultValue={goal?.status || "规划中"}><option>规划中</option><option>进行中</option><option>重点推进</option></select></label>
          <label className="form-field"><span>目标说明</span><textarea name="description" defaultValue={goal?.description} placeholder="这个目标为什么重要，要达成什么结果" /></label>
          <label className="form-field"><span>关键达成标准</span><textarea name="focus" defaultValue={(goal?.focus || []).join("\n")} placeholder="一行一个，例如：校内前10%" /></label>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">保存目标</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({
  open,
  onOpenChange,
  task,
  categories,
  goals,
  phases,
  activeGoalId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: PlanTask | null;
  categories: string[];
  goals: PlanGoal[];
  phases: PlanPhase[];
  activeGoalId: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const linkedIds = task?.goalIds || [task?.goalId || activeGoalId];
  const extraGoalIds = linkedIds.filter((id) => id !== activeGoalId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog">
        <DialogHeader>
          <DialogTitle>{task ? "编辑任务" : "新增任务"}</DialogTitle>
          <DialogDescription>大类是自由输入的；输入一个新的大类名称，就会自动生成新的看板列。</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="app-form">
          <div className="form-grid two">
            <label className="form-field"><span>任务大类</span><Input name="category" defaultValue={task?.category || categories[0] || ""} placeholder="例如：数学 / 英语 / 考证" list="task-categories" required /><datalist id="task-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></label>
            <label className="form-field"><span>优先级</span><select name="priority" defaultValue={task?.priority || "中"}><option>高</option><option>中</option><option>低</option></select></label>
          </div>
          <div className="form-grid two">
            <label className="form-field">
              <span>所属阶段</span>
              <select name="phaseId" defaultValue={task?.phaseId || ""}>
                <option value="">不关联阶段</option>
                {phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title} · {phase.period}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>关联其他目标</span>
              <Input name="goalIds" defaultValue={extraGoalIds.join(",")} placeholder="可填目标 ID，英文逗号分隔" list="goal-id-options" />
              <datalist id="goal-id-options">{goals.filter((goal) => goal.id !== activeGoalId).map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</datalist>
            </label>
          </div>
          <label className="form-field"><span>任务名称</span><Input name="title" defaultValue={task?.title} required /></label>
          <label className="form-field"><span>任务说明</span><textarea name="description" defaultValue={task?.description} placeholder="这项任务具体要完成什么" /></label>
          <div className="form-grid two">
            <label className="form-field"><span>目标量</span><Input name="target" type="number" min="0" defaultValue={task?.target || 0} /></label>
            <label className="form-field"><span>已完成</span><Input name="current" type="number" min="0" defaultValue={task?.current || 0} /></label>
          </div>
          <div className="form-grid two">
            <label className="form-field"><span>单位</span><Input name="unit" defaultValue={task?.unit || "次"} /></label>
            <label className="form-field"><span>执行节奏</span><Input name="dailyTarget" defaultValue={task?.dailyTarget} placeholder="例如：每天 30 分钟" /></label>
          </div>
          <label className="form-field"><span>状态</span><select name="status" defaultValue={task?.status || "normal"}><option value="ahead">超前</option><option value="normal">正常</option><option value="behind">落后</option></select></label>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">保存任务</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PhaseDialog({
  open,
  onOpenChange,
  phase,
  order,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: PlanPhase | null;
  order: number;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog">
        <DialogHeader>
          <DialogTitle>{phase ? "编辑阶段" : "新增阶段"}</DialogTitle>
          <DialogDescription>阶段是当前目标自己的配置，保存后会参与任务归属和进度判断。</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="app-form">
          <div className="form-grid two">
            <label className="form-field"><span>阶段名称</span><Input name="title" defaultValue={phase?.title || ""} placeholder="例如：阶段一" required /></label>
            <label className="form-field"><span>排序</span><Input name="order" type="number" min="1" defaultValue={phase?.order || order} /></label>
          </div>
          <label className="form-field"><span>周期</span><Input name="period" defaultValue={phase?.period || ""} placeholder="例如：6.20-7.6" /></label>
          <label className="form-field"><span>阶段说明</span><textarea name="description" defaultValue={phase?.description || ""} placeholder="这个阶段的重点是什么" /></label>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">保存阶段</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogDialog({
  open,
  onOpenChange,
  categories,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog">
        <DialogHeader>
          <DialogTitle>新增每日记录</DialogTitle>
          <DialogDescription>记录当天执行情况，用来判断当前目标是否按节奏推进。</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="app-form">
          <div className="form-grid two">
            <label className="form-field"><span>日期</span><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <label className="form-field"><span>大类</span><Input name="category" placeholder="英语/语文/数学" defaultValue={categories[0] || ""} list="log-categories" /><datalist id="log-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></label>
          </div>
          <label className="form-field"><span>完成内容</span><Input name="summary" placeholder="例如：RAZ 30 分钟，计算训练" required /></label>
          <label className="form-field"><span>完成量</span><Input name="amount" placeholder="例如：55 分钟 / 1 套" /></label>
          <label className="form-field"><span>备注</span><Input name="note" placeholder="困难、错因、明日调整" /></label>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">保存记录</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
