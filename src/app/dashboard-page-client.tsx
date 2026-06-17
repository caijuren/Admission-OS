"use client";

import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  GraduationCap,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { growthService } from "@/services";
import type { GrowthEvent } from "@/types";
import {
  DEFAULT_PROFILE,
  type PathwayStage,
  type PathwayTarget,
  type StudentProfile,
  getAssetStats,
  getGradeStats,
  getProductConfig,
  getReadingStats,
} from "@/lib/product-data";
import seedData from "../../data/eduos.json";

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
  target: number;
  current: number;
  unit: string;
  status: "ahead" | "normal" | "behind";
};

type PlanLog = {
  id: string;
  goalId: string;
  date: string;
};

const pathwayDimensions = ["数学", "英语", "语文", "项目竞赛", "校内成绩"];
const pathwayMapSize = { width: 1536, height: 548 };

const pathwayStageLabels: Record<PathwayStage["status"], string> = {
  done: "已完成",
  current: "当前阶段",
  next: "下一阶段",
  future: "远期规划",
};

const pathwayRoutePath = [
  "M 302 542",
  "C 342 503 360 486 402 462",
  "C 446 436 484 415 530 413",
  "C 574 411 610 421 644 413",
  "C 696 399 724 381 788 372",
  "C 858 361 905 350 939 327",
  "C 966 309 988 301 1007 289",
  "C 1029 274 1038 247 1053 229",
  "C 1077 202 1121 200 1137 173",
  "C 1155 143 1174 118 1143 102",
].join(" ");

const pathwayNodePositions = [
  { left: 26.2, top: 84.6, cardX: -224, cardY: -142 },
  { left: 38.6, top: 76, cardX: -218, cardY: -138 },
  { left: 51.2, top: 68.1, cardX: 74, cardY: -128 },
  { left: 63.6, top: 47.6, cardX: 82, cardY: -82 },
  { left: 73.9, top: 19.8, cardX: 80, cardY: 30 },
];

const initialPathwayStages = (seedData.pathwayStages || []) as PathwayStage[];

function defaultTargetStatus(stageStatus: PathwayStage["status"]): PathwayTarget["status"] {
  if (stageStatus === "done") return "达标";
  if (stageStatus === "current") return "进行中";
  return "待配置";
}

export default function DashboardPage() {
  const initialGoals = seedData.goals as PlanGoal[];
  const initialTasks = seedData.goalTasks as PlanTask[];
  const initialLogs = seedData.goalLogs as PlanLog[];
  const [events, setEvents] = useState<GrowthEvent[]>(seedData.events as GrowthEvent[]);
  const [profile, setProfile] = useState<StudentProfile>({ ...DEFAULT_PROFILE, ...seedData.profile });
  const [goals, setGoals] = useState<PlanGoal[]>(initialGoals);
  const [tasks, setTasks] = useState<PlanTask[]>(initialTasks);
  const [logs, setLogs] = useState<PlanLog[]>(initialLogs);
  const [pathwayStages, setPathwayStages] = useState<PathwayStage[]>(initialPathwayStages);
  const [pathwayOpen, setPathwayOpen] = useState(false);
  const [pathwayDetailOpen, setPathwayDetailOpen] = useState(false);
  const pathwayMapRef = useRef<HTMLDivElement>(null);
  const [pathwayCanvasRect, setPathwayCanvasRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [activePathwayId, setActivePathwayId] = useState(
    initialPathwayStages.find((stage) => stage.status === "current")?.id || initialPathwayStages[0]?.id || ""
  );
  const [activePlanId, setActivePlanId] = useState(initialGoals.find((goal) => goal.type !== "north")?.id || initialGoals[0]?.id || "");
  const [dashboardView, setDashboardView] = useState<"panorama" | "admission" | "tasks">("panorama");

  useLayoutEffect(() => {
    const updateCanvas = () => {
      const rect = pathwayMapRef.current?.getBoundingClientRect();
      if (!rect?.width || !rect?.height) return;

      const scale = Math.max(rect.width / pathwayMapSize.width, rect.height / pathwayMapSize.height);
      const width = Math.round(pathwayMapSize.width * scale * 100) / 100;
      const height = Math.round(pathwayMapSize.height * scale * 100) / 100;
      const next = {
        left: Math.round(((rect.width - width) / 2) * 100) / 100,
        top: Math.round(((rect.height - height) / 2) * 100) / 100,
        width,
        height,
      };

      setPathwayCanvasRect((current) => (
        current.left === next.left &&
        current.top === next.top &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next
      ));
    };

    updateCanvas();
    const observer = new ResizeObserver(updateCanvas);
    if (pathwayMapRef.current) observer.observe(pathwayMapRef.current);
    window.addEventListener("resize", updateCanvas);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCanvas);
    };
  }, []);

  useEffect(() => {
    growthService.getEvents().then(setEvents);
    getProductConfig().then((config) => {
      setProfile(config.profile);
      setGoals(config.goals || []);
      setTasks(config.goalTasks || []);
      setLogs(config.goalLogs || []);
      const nextPathwayStages = config.pathwayStages?.length ? config.pathwayStages : initialPathwayStages;
      setPathwayStages(nextPathwayStages);
      setActivePathwayId((current) => nextPathwayStages.some((stage) => stage.id === current)
        ? current
        : nextPathwayStages.find((stage) => stage.status === "current")?.id || nextPathwayStages[0]?.id || ""
      );
      setActivePlanId(config.goals?.find((goal) => goal.type !== "north")?.id || config.goals?.[0]?.id || "");
    });
  }, []);

  const readingStats = useMemo(() => getReadingStats(events), [events]);
  const gradeStats = useMemo(() => getGradeStats(events), [events]);
  const assetStats = useMemo(() => getAssetStats(events), [events]);
  const planCards = useMemo(() => {
    return goals
      .filter((goal) => goal.type !== "north")
      .map((goal) => {
        const relatedTasks = tasks.filter((task) => (task.goalIds || [task.goalId]).includes(goal.id));
        const totalTarget = relatedTasks.reduce((sum, task) => sum + Number(task.target || 0), 0);
        const totalCurrent = relatedTasks.reduce((sum, task) => sum + Math.min(Number(task.current || 0), Number(task.target || 0)), 0);
        const progress = totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : goal.progress;
        const planLogs = logs.filter((log) => log.goalId === goal.id);
        return {
          goal,
          tasks: relatedTasks,
          progress,
          behind: relatedTasks.filter((task) => task.status === "behind").length,
          logDays: Array.from(new Set(planLogs.map((log) => log.date))).length,
        };
      });
  }, [goals, logs, tasks]);
  const activePlan = planCards.find((plan) => plan.goal.id === activePlanId) || planCards[0];
  const activePlanCategories = useMemo(() => {
    if (!activePlan) return [];
    const groups = Array.from(new Set(activePlan.tasks.map((task) => task.category || "未分类")));
    return groups.map((category) => {
      const items = activePlan.tasks.filter((task) => task.category === category);
      const progress = items.length
        ? Math.round(items.reduce((sum, task) => {
            if (!task.target) return sum;
            return sum + Math.min(100, Math.round((task.current / task.target) * 100));
          }, 0) / items.length)
        : 0;
      return { category, progress, count: items.length, behind: items.filter((task) => task.status === "behind").length };
    });
  }, [activePlan]);
  const subjectPlanIds = useMemo(
    () => new Set(goals.filter((goal) => goal.type === "subject").map((goal) => goal.id)),
    [goals]
  );
  const subjectTasks = useMemo(
    () => tasks.filter((task) => (task.goalIds || [task.goalId]).some((goalId) => subjectPlanIds.has(goalId))),
    [subjectPlanIds, tasks]
  );
  const subjectProgress = subjectTasks.length
    ? Math.round(
        subjectTasks.reduce((sum, task) => {
          if (!task.target) return sum;
          return sum + Math.min(100, Math.round((task.current / task.target) * 100));
        }, 0) / subjectTasks.length
      )
    : 0;
  const admissionRiskItems = useMemo(
    () => [
      gradeStats.examCount ? "" : "缺少校内考试样本",
      gradeStats.bestRanking ? "" : "缺少校内排名数据",
      assetStats.honors ? "" : "竞赛证书为空",
      assetStats.projects ? "" : "项目成果为空",
      readingStats.totalBooks ? "" : "阅读表达素材为空",
      planCards.some((plan) => plan.behind > 0) ? "存在落后任务" : "",
    ].filter(Boolean),
    [assetStats.honors, assetStats.projects, gradeStats.bestRanking, gradeStats.examCount, planCards, readingStats.totalBooks]
  );
  const admissionModules = useMemo(() => {
    const gradeScore = Math.min(100, gradeStats.bestScore || 0);
    const competitionScore = Math.min(100, assetStats.honors * 25);
    const projectScore = Math.min(100, assetStats.projects * 25);
    const readingScore = Math.min(100, readingStats.totalBooks * 12);
    const riskScore = Math.max(0, 100 - admissionRiskItems.length * 18);

    return [
      {
        id: "grades",
        title: "校内成绩",
        icon: GraduationCap,
        tone: "blue",
        score: gradeScore,
        status: gradeStats.examCount ? `${gradeStats.examCount} 次记录` : "待录入成绩",
        href: "/grades",
        action: gradeStats.examCount ? "查看成绩" : "记录一次考试",
        details: [
          gradeStats.bestScore ? `最高分：${gradeStats.bestScore}` : "缺少分数样本",
          gradeStats.averageScore ? `平均分：${gradeStats.averageScore}` : "暂无法计算均分",
          gradeStats.bestRanking ? `最佳排名：${gradeStats.bestRanking}` : "缺少排名数据",
        ],
      },
      {
        id: "subjects",
        title: "学科进度",
        icon: TrendingUp,
        tone: "green",
        score: subjectProgress,
        status: `${subjectTasks.length} 个任务`,
        href: "/goals",
        action: "查看学科任务",
        details: [
          `学科任务：${subjectTasks.length}`,
          `落后任务：${subjectTasks.filter((task) => task.status === "behind").length}`,
          `平均进度：${subjectProgress}%`,
        ],
      },
      {
        id: "competition",
        title: "竞赛证书",
        icon: Trophy,
        tone: "orange",
        score: competitionScore,
        status: assetStats.honors ? `${assetStats.honors} 项证据` : "待配置竞赛",
        href: "/records",
        action: assetStats.honors ? "查看证书" : "补竞赛方向",
        details: [
          `荣誉证书：${assetStats.honors}`,
          "后续关联数学、英语、科创竞赛",
          "用于判断自招硬证据厚度",
        ],
      },
      {
        id: "projects",
        title: "项目成果",
        icon: Target,
        tone: "violet",
        score: projectScore,
        status: assetStats.projects ? `${assetStats.projects} 个项目` : "待建立项目",
        href: "/records",
        action: assetStats.projects ? "查看项目" : "新增项目方向",
        details: [
          `项目成果：${assetStats.projects}`,
          "可沉淀软件、艺术、科创类作品",
          "重点看过程、产出和可展示性",
        ],
      },
      {
        id: "reading",
        title: "阅读表达",
        icon: BookOpen,
        tone: "indigo",
        score: readingScore,
        status: readingStats.totalBooks ? `${readingStats.totalBooks} 条素材` : "待沉淀素材",
        href: "/reading",
        action: readingStats.totalBooks ? "查看阅读" : "添加阅读素材",
        details: [
          `阅读记录：${readingStats.totalBooks}`,
          "支撑面谈、作文和材料表达",
          "暑假优先形成稳定输入",
        ],
      },
      {
        id: "risks",
        title: "风险判断",
        icon: AlertTriangle,
        tone: "red",
        score: riskScore,
        status: admissionRiskItems.length ? `${admissionRiskItems.length} 个风险` : "暂无明显风险",
        href: "/goals",
        action: admissionRiskItems.length ? "处理风险" : "查看计划",
        details: admissionRiskItems.length ? admissionRiskItems.slice(0, 3).map((item, index) => `P${index} ${item}`) : ["当前数据未发现明显风险", "继续补齐成绩、证据和任务记录", "每周复盘一次偏差"],
      },
    ];
  }, [admissionRiskItems, assetStats.honors, assetStats.projects, gradeStats.averageScore, gradeStats.bestRanking, gradeStats.bestScore, gradeStats.examCount, readingStats.totalBooks, subjectProgress, subjectTasks]);
  const admissionReadiness = Math.round(
    admissionModules
      .filter((module) => module.id !== "risks")
      .reduce((sum, module) => sum + module.score, 0) / 5
  );
  const admissionStatus = admissionReadiness >= 70 ? "进入强化区" : admissionReadiness >= 35 ? "证据建设期" : "基础补齐期";
  const riskCount = admissionRiskItems.length;
  const currentPathwayStage = pathwayStages.find((stage) => stage.status === "current") || pathwayStages[0];
  const selectedPathwayStage = pathwayStages.find((stage) => stage.id === activePathwayId) || currentPathwayStage;

  async function handlePathwaySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextStages = pathwayStages.map((stage) => {
      const status = String(form.get(`${stage.id}-status`) || stage.status) as PathwayStage["status"];
      const targets = pathwayDimensions.flatMap((dimension) => {
        const oldTargets = stage.targets.filter((target) => target.dimension === dimension);
        const lines = String(form.get(`${stage.id}-${dimension}`) || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        return lines.map((goal, index) => ({
          dimension,
          goal,
          status: oldTargets[index]?.status || defaultTargetStatus(status),
          linkedGoalId: oldTargets[index]?.linkedGoalId,
        }));
      });

      return {
        ...stage,
        title: String(form.get(`${stage.id}-title`) || stage.title),
        period: String(form.get(`${stage.id}-period`) || stage.period),
        status,
        summary: String(form.get(`${stage.id}-summary`) || stage.summary),
        targets,
      };
    });

    setPathwayStages(nextStages);
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathwayStages: nextStages }),
    });
    setPathwayOpen(false);
  }

  return (
    <div className="design-page dashboard-home">
      <section className="page-toolbar">
        <div className="dashboard-toolbar-title">
          <h1>驾驶舱</h1>
          <span>{profile.currentStage} · 自招准备度 {admissionReadiness}% · 风险 {riskCount}</span>
        </div>
        <div className="dashboard-toolbar-switch" aria-label="驾驶舱视图">
          {[
            { id: "panorama", title: "路径全景" },
            { id: "admission", title: "自招看板" },
            { id: "tasks", title: "任务进度" },
          ].map((item) => (
            <button
              key={item.id}
              className={cn(dashboardView === item.id && "active")}
              onClick={() => setDashboardView(item.id as "panorama" | "admission" | "tasks")}
            >
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      </section>

      {dashboardView === "panorama" && (
        <section className="pathway-expedition">
          <div className="pathway-map-shell" ref={pathwayMapRef}>
            <div className="pathway-map-canvas" style={pathwayCanvasRect.width ? pathwayCanvasRect : undefined}>
              <Image
                className="pathway-map-image"
                src="/assets/design/admission-mountain-bg.png"
                alt=""
                width={pathwayMapSize.width}
                height={pathwayMapSize.height}
                priority
                sizes="(max-width: 1024px) 100vw, 80vw"
              />
              <div className="pathway-map-vignette" />
              <svg className="pathway-route-svg" viewBox={`0 0 ${pathwayMapSize.width} ${pathwayMapSize.height}`} aria-hidden="true">
                <defs>
                  <filter id="pathway-route-glow" x="-12%" y="-18%" width="124%" height="136%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="1 0 0 0 1 0 0.72 0 0 0.5 0 0 0.18 0 0.04 0 0 0 0.82 0"
                      result="goldGlow"
                    />
                    <feMerge>
                      <feMergeNode in="goldGlow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="pathway-route-gold" x1="302" y1="542" x2="1143" y2="102" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#f7b733" />
                    <stop offset="0.45" stopColor="#ffd86b" />
                    <stop offset="1" stopColor="#fff4b5" />
                  </linearGradient>
                </defs>
                <path className="pathway-route-shadow" d={pathwayRoutePath} />
                <path className="pathway-route-base" d={pathwayRoutePath} pathLength="1000" />
                <path className="pathway-route-progress" d={pathwayRoutePath} pathLength="1000" />
                <path className="pathway-route-spark" d={pathwayRoutePath} pathLength="1000" />
                <g className="pathway-summit-flag">
                  <line x1="1143" y1="102" x2="1143" y2="52" />
                  <path d="M 1143 54 C 1166 48 1177 58 1197 52 L 1197 78 C 1175 84 1165 72 1143 78 Z" />
                </g>
              </svg>
              <div className="pathway-node-layer">
                {pathwayStages.map((stage, index) => {
                  const position = pathwayNodePositions[index] || pathwayNodePositions[pathwayNodePositions.length - 1];
                  return (
                    <div
                      key={stage.id}
                      className={cn("pathway-stage-anchor", selectedPathwayStage?.id === stage.id && "active")}
                      style={{ left: `${position.left}%`, top: `${position.top}%` }}
                    >
                      <button
                        className={cn("pathway-stage-dot", stage.status, selectedPathwayStage?.id === stage.id && "active")}
                        onClick={() => {
                          setActivePathwayId(stage.id);
                          setPathwayDetailOpen(true);
                        }}
                        aria-label={stage.title}
                      />
                      <button
                        className={cn("pathway-stage-node", stage.status, selectedPathwayStage?.id === stage.id && "active")}
                        style={{ transform: `translate(${position.cardX}px, ${position.cardY}px)` }}
                        onClick={() => {
                          setActivePathwayId(stage.id);
                          setPathwayDetailOpen(true);
                        }}
                      >
                        <span>{pathwayStageLabels[stage.status]}</span>
                        <strong>{stage.title}</strong>
                        <em>{stage.period}</em>
                        <p>{stage.summary}</p>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pathway-map-header">
              <div>
                <h2>交附嘉分登山路线</h2>
              </div>
              <button className="pathway-edit-button" onClick={() => setPathwayOpen(true)}>编辑路径</button>
            </div>

            {pathwayStages.length === 0 && (
              <div className="pathway-map-empty">
                <strong>还没有路径全景</strong>
                <span>点击编辑路径，先配置从当前暑假到九年级冲刺的阶段目标。</span>
                <button className="empty-action-button" onClick={() => setPathwayOpen(true)}>配置路径</button>
              </div>
            )}
          </div>
        </section>
      )}

      {dashboardView === "admission" && (
        <section className="admission-board">
          <article className="admission-summary-card">
            <div>
              <span className="admission-kicker">自招准备度</span>
              <h2>{admissionStatus}</h2>
              <p>这里先只回答一个问题：为了自招，当前证据够不够、进度到哪了、短板在哪里。</p>
              <div className="admission-summary-meta">
                <em>成绩 {gradeStats.examCount} 次</em>
                <em>竞赛 {assetStats.honors} 项</em>
                <em>项目 {assetStats.projects} 个</em>
                <em>阅读 {readingStats.totalBooks} 条</em>
              </div>
            </div>
            <div className="admission-summary-score">
              <strong>{admissionReadiness}%</strong>
              <div className="line-meter"><i style={{ width: `${admissionReadiness}%` }} /></div>
              <span>{riskCount ? `${riskCount} 个风险` : "暂无明显风险"}</span>
            </div>
          </article>

          <section className="admission-module-grid">
            {admissionModules.map((module) => {
              const Icon = module.icon;
              return (
                <article key={module.id} className={cn("admission-module-card", `tone-${module.tone}`)}>
                  <div className="admission-module-head">
                    <div className="admission-module-icon"><Icon className="h-4 w-4" /></div>
                    <div>
                      <span>{module.title}</span>
                      <strong>{module.status}</strong>
                    </div>
                    <b>{module.score}%</b>
                  </div>
                  <div className="line-meter"><i style={{ width: `${module.score}%` }} /></div>
                  <div className="admission-module-list">
                    {module.details.map((detail) => <em key={detail}>{detail}</em>)}
                  </div>
                  <Link className="admission-module-action" href={module.href}>
                    {module.action}
                  </Link>
                </article>
              );
            })}
          </section>
        </section>
      )}

      {dashboardView === "tasks" && (
        <>
          <section className="dashboard-section">
            <div className="dashboard-section-head">
              <div>
                <h2>任务进度</h2>
                <p>这里看执行：每个计划的任务数、完成度、落后项和记录天数。</p>
              </div>
              <Link href="/goals">进入目标计划</Link>
            </div>
            <section className="dashboard-plan-grid">
              {planCards.map((plan) => (
                <button
                  key={plan.goal.id}
                  className={cn("dashboard-plan-card", activePlan?.goal.id === plan.goal.id && "active")}
                  onClick={() => setActivePlanId(plan.goal.id)}
                >
                  <span>{plan.goal.status} · {plan.goal.period}</span>
                  <strong>{plan.goal.title}</strong>
                  <div className="line-meter"><i style={{ width: `${plan.progress}%` }} /></div>
                  <em>{plan.progress}% · {plan.tasks.length} 个任务 · {plan.behind} 个落后</em>
                </button>
              ))}
              {planCards.length === 0 && <div className="goal-empty-state">还没有可展示的计划，先到目标计划中新增目标。</div>}
            </section>
          </section>

          {activePlan && (
            <section className="data-panel dashboard-plan-detail-panel">
              <div className="data-panel-inner">
                <div className="panel-title-row">
                  <div>
                    <h2>{activePlan.goal.title}</h2>
                    <p>{activePlan.goal.description || "还没有配置计划说明。"}</p>
                  </div>
                  <Link className="text-link" href="/goals">进入计划</Link>
                </div>
                <div className="dashboard-plan-detail-grid">
                  <div className="dashboard-plan-score">
                    <span>计划进度</span>
                    <strong>{activePlan.progress}%</strong>
                    <em>{activePlan.tasks.length} 个任务 · 记录 {activePlan.logDays} 天</em>
                  </div>
                  <div className="dashboard-plan-dimensions">
                    {activePlanCategories.length ? activePlanCategories.map((item) => (
                      <div key={item.category} className="dashboard-plan-dimension">
                        <div>
                          <strong>{item.category}</strong>
                          <span>{item.count} 个任务 · {item.behind} 个落后</span>
                        </div>
                        <b>{item.progress}%</b>
                        <div className="line-meter"><i style={{ width: `${item.progress}%` }} /></div>
                      </div>
                    )) : <div className="goal-muted-line">这个计划还没有配置任务。</div>}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <PathwayDialog
        open={pathwayOpen}
        stages={pathwayStages}
        onOpenChange={setPathwayOpen}
        onSubmit={handlePathwaySubmit}
      />
      <PathwayDetailDialog
        open={pathwayDetailOpen}
        stage={selectedPathwayStage}
        onOpenChange={setPathwayDetailOpen}
      />
    </div>
  );
}

function PathwayDetailDialog({
  open,
  stage,
  onOpenChange,
}: {
  open: boolean;
  stage?: PathwayStage;
  onOpenChange: (open: boolean) => void;
}) {
  if (!stage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog pathway-detail-dialog">
        <DialogHeader>
          <DialogTitle>{stage.title}</DialogTitle>
          <DialogDescription>{stage.period} · {pathwayStageLabels[stage.status]}</DialogDescription>
        </DialogHeader>
        <div className="pathway-detail-body">
          <p>{stage.summary}</p>
          <div className="pathway-detail-grid">
            {pathwayDimensions.map((dimension) => {
              const targets = stage.targets.filter((target) => target.dimension === dimension);
              return (
                <section key={dimension}>
                  <strong>{dimension}</strong>
                  {targets.length ? targets.map((target) => (
                    <span key={`${dimension}-${target.goal}`}>
                      {target.goal}
                      <em>{target.status}</em>
                    </span>
                  )) : <span>待配置<em>空</em></span>}
                </section>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PathwayDialog({
  open,
  stages,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  stages: PathwayStage[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog pathway-dialog">
        <DialogHeader>
          <DialogTitle>编辑路径全景</DialogTitle>
          <DialogDescription>按阶段配置目标坐标。每个维度一行一个目标，保存后会写入本地数据。</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="app-form pathway-form">
          <div className="pathway-edit-list">
            {stages.map((stage) => (
              <section key={stage.id} className="pathway-edit-stage">
                <div className="form-grid three">
                  <label className="form-field"><span>阶段名称</span><input name={`${stage.id}-title`} defaultValue={stage.title} /></label>
                  <label className="form-field"><span>时间范围</span><input name={`${stage.id}-period`} defaultValue={stage.period} /></label>
                  <label className="form-field">
                    <span>状态</span>
                    <select name={`${stage.id}-status`} defaultValue={stage.status}>
                      <option value="done">已完成</option>
                      <option value="current">当前阶段</option>
                      <option value="next">下一阶段</option>
                      <option value="future">远期规划</option>
                    </select>
                  </label>
                </div>
                <label className="form-field"><span>阶段说明</span><textarea name={`${stage.id}-summary`} defaultValue={stage.summary} /></label>
                <div className="pathway-edit-targets">
                  {pathwayDimensions.map((dimension) => (
                    <label key={dimension} className="form-field">
                      <span>{dimension}</span>
                      <textarea
                        name={`${stage.id}-${dimension}`}
                        defaultValue={stage.targets.filter((target) => target.dimension === dimension).map((target) => target.goal).join("\n")}
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-action" onClick={() => onOpenChange(false)}>取消</button>
            <button type="submit" className="primary-action">保存路径</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
