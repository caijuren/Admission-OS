import { promises as fs } from "fs";
import path from "path";
import { createSupabaseAdminClient } from "./supabase-admin";
import type { GrowthEvent } from "@/types";

export type EduosProfile = {
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

export type PlanGoal = {
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

export type PlanTask = {
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
  status: "ahead" | "normal" | "behind";
  priority?: "高" | "中" | "低";
};

export type PlanLog = {
  id: string;
  goalId: string;
  date: string;
  category?: string;
  summary?: string;
  amount?: string;
  note?: string;
};

export type PlanPhase = {
  id: string;
  goalId: string;
  title: string;
  period: string;
  description: string;
  order: number;
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

export type EduosData = {
  profile: EduosProfile;
  journey: {
    milestones: JourneyMilestone[];
  };
  events: GrowthEvent[];
  pathwayStages?: PathwayStage[];
  goals?: PlanGoal[];
  goalTasks?: PlanTask[];
  goalLogs?: PlanLog[];
  goalPhases?: PlanPhase[];
};

const dataPath = path.join(process.cwd(), "data", "eduos.json");
const appStateKey = process.env.ADMISSION_OS_STATE_KEY || "default";

async function readSeedData(): Promise<EduosData> {
  const raw = await fs.readFile(dataPath, "utf8");
  return JSON.parse(raw) as EduosData;
}

function isDatabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isDatabaseRequired() {
  return process.env.NODE_ENV === "production" || process.env.ADMISSION_OS_DATA_DRIVER === "database";
}

export async function readData(): Promise<EduosData> {
  if (!isDatabaseConfigured()) {
    if (isDatabaseRequired()) {
      throw new Error("Production data store requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    return readSeedData();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("key", appStateKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.data) {
    return data.data as EduosData;
  }

  const seedData = await readSeedData();
  await writeData(seedData);
  return seedData;
}

export async function writeData(data: EduosData) {
  if (!isDatabaseConfigured()) {
    if (isDatabaseRequired()) {
      throw new Error("Production data store requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("app_state")
    .upsert({
      key: appStateKey,
      data,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
}
