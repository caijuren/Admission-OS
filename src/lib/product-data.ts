import {
  BookOpen,
  Flag,
  GraduationCap,
  Lightbulb,
  Medal,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { EventCategory, EventType, GrowthEvent } from "@/types";

export const STUDENT_ID = "1";

export type StudentProfile = {
  id: string;
  name: string;
  school: string;
  grade: string;
  targetSchool: string;
  currentStage: string;
  progress: number;
  quote: string;
};

export type JourneyMilestone = {
  title: string;
  subtitle: string;
  status: "done" | "active" | "next" | "target";
};

export type ProductConfig = {
  profile: StudentProfile;
  journey: {
    milestones: JourneyMilestone[];
  };
  pathwayStages?: PathwayStage[];
  goals?: Array<{
    id: string;
    title: string;
    type: "north" | "phase" | "subject" | "project" | "habit";
    period: string;
    progress: number;
    status: "进行中" | "规划中" | "重点推进";
    description: string;
    parentId?: string;
    focus?: string[];
  }>;
  goalTasks?: Array<{
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
    executionMode?: "孩子自主" | "家长陪练" | "亲子共学" | "家长验收";
  }>;
  goalLogs?: Array<{
    id: string;
    goalId: string;
    date: string;
  }>;
};

export type PathwayTarget = {
  dimension: string;
  goal: string;
  status: "达标" | "进行中" | "待配置" | "落后";
  linkedGoalId?: string;
};

export type PathwayStage = {
  id: string;
  title: string;
  period: string;
  status: "done" | "current" | "next" | "future";
  summary: string;
  targets: PathwayTarget[];
};

export const DEFAULT_PROFILE: StudentProfile = {
  id: STUDENT_ID,
  name: "孩子姓名",
  school: "学校名称",
  grade: "当前年级",
  targetSchool: "上海交附嘉分",
  currentStage: "自招/名额到校准备期",
  progress: 0,
  quote: "围绕交附嘉分目标，把每一次学习、项目和证据沉淀成真实竞争力。",
};

export const DEFAULT_MILESTONES: JourneyMilestone[] = [
  { title: "定位", subtitle: "目标明确", status: "done" },
  { title: "暑假", subtitle: "阶段推进", status: "active" },
  { title: "六上", subtitle: "校内稳定", status: "next" },
  { title: "自招", subtitle: "证据准备", status: "next" },
  { title: "交附", subtitle: "目标达成", status: "target" },
];

export async function getProductConfig(): Promise<ProductConfig> {
  const response = await fetch("/api/data", { cache: "no-store" });
  if (!response.ok) {
    return { profile: DEFAULT_PROFILE, journey: { milestones: DEFAULT_MILESTONES }, pathwayStages: [], goals: [], goalTasks: [], goalLogs: [] };
  }

  const data = await response.json() as Partial<ProductConfig>;
  return {
    profile: {
      ...DEFAULT_PROFILE,
      ...data.profile,
    },
    journey: {
      milestones: data.journey?.milestones?.length ? data.journey.milestones : DEFAULT_MILESTONES,
    },
    pathwayStages: data.pathwayStages || [],
    goals: data.goals || [],
    goalTasks: data.goalTasks || [],
    goalLogs: data.goalLogs || [],
  };
}

export const categoryIconMap: Record<EventCategory, LucideIcon> = {
  学业: GraduationCap,
  阅读: BookOpen,
  荣誉: Trophy,
  项目: Lightbulb,
  目标: Flag,
  运动: Medal,
  表达: Medal,
  其他: Target,
};

export const categoryToneMap: Record<EventCategory, string> = {
  学业: "primary",
  阅读: "green",
  荣誉: "orange",
  项目: "purple",
  目标: "primary",
  运动: "green",
  表达: "purple",
  其他: "slate",
};

export const eventTypeLabels: Record<EventType, string> = {
  reading: "阅读",
  exam: "成绩",
  honor: "荣誉",
  project: "项目",
  goal: "目标",
  exercise: "运动",
  expression: "表达",
  other: "其他",
};

export function formatMonth(date: string) {
  return date.replace("-", ".");
}

export function getEventIcon(event: GrowthEvent) {
  return categoryIconMap[event.category] || Target;
}

export function getEventTone(event: GrowthEvent) {
  return categoryToneMap[event.category] || "slate";
}

export function getReadingStats(events: GrowthEvent[]) {
  const readings = events.filter((event) => event.type === "reading");
  const ratings = readings
    .map((event) => event.metadata.rating)
    .filter((rating): rating is number => typeof rating === "number" && rating > 0);
  const finished = readings.filter((event) => event.metadata.bookTitle);
  const monthly = readings.filter((event) => event.date.startsWith("2026-06") || event.date.startsWith("2026-07"));

  return {
    totalBooks: readings.length,
    completedBooks: finished.length,
    monthlyBooks: monthly.length,
    avgRating: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0,
  };
}

export function getGradeStats(events: GrowthEvent[]) {
  const exams = events.filter((event) => event.type === "exam");
  const scores = exams
    .map((event) => event.metadata.score)
    .filter((score): score is number => typeof score === "number");
  const rankings = exams
    .map((event) => event.metadata.ranking)
    .filter((ranking): ranking is number => typeof ranking === "number");

  return {
    examCount: exams.length,
    latestScore: scores[0] || 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
    averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    bestRanking: rankings.length ? Math.min(...rankings) : 0,
  };
}

export function getAssetStats(events: GrowthEvent[]) {
  return {
    honors: events.filter((event) => event.type === "honor").length,
    projects: events.filter((event) => event.type === "project").length,
    goals: events.filter((event) => event.type === "goal").length,
    highlights: events.filter((event) => event.is_highlight).length,
  };
}

export function getAbilityScores(events: GrowthEvent[]) {
  const readingStats = getReadingStats(events);
  const gradeStats = getGradeStats(events);
  const assetStats = getAssetStats(events);
  const milestoneCount = events.filter((event) => event.is_milestone).length;

  return [
    { name: "数学", value: gradeStats.bestScore ? Math.min(100, gradeStats.bestScore) : 0 },
    { name: "英语", value: events.some((event) => event.category.includes("英语")) ? Math.min(100, assetStats.highlights * 10) : 0 },
    { name: "阅读", value: readingStats.totalBooks ? Math.min(100, readingStats.totalBooks * 10) : 0 },
    { name: "学习力", value: milestoneCount ? Math.min(100, milestoneCount * 10) : 0 },
    { name: "表达", value: assetStats.highlights ? Math.min(100, assetStats.highlights * 10) : 0 },
  ];
}

export function getWeeklyWindow(events: GrowthEvent[]) {
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  const highlights = sorted.slice(0, 4);
  const nextWeek = [
    "补全阅读笔记，沉淀可进入材料包的表达素材",
    "更新目标进度，并标记本周关键证据",
    "复盘最近一次成绩变化，形成下周行动项",
  ];

  return {
    week: "第24周",
    date: "2026.06.09 - 2026.06.15",
    summary: highlights.length
      ? `本周沉淀了${highlights.length}条升学证据，重点围绕${Array.from(new Set(highlights.map((event) => event.category))).join("、")}展开。`
      : "当前阶段还没有新的升学证据，可以从阅读、成绩或目标开始补充。",
    highlights,
    nextWeek,
  };
}

export function buildGrowthNarrative(events: GrowthEvent[], profile: StudentProfile = DEFAULT_PROFILE) {
  const milestones = events.filter((event) => event.is_milestone);
  const readingStats = getReadingStats(events);
  const gradeStats = getGradeStats(events);

  return `${profile.name}围绕${profile.targetSchool}目标持续积累升学证据，目前已沉淀${events.length}条证据记录、${milestones.length}个关键里程碑。阅读、学业与项目经历共同构成了当前材料包基础，其中阅读记录${readingStats.totalBooks}条，最高成绩${gradeStats.bestScore || "待补充"}分。`;
}
