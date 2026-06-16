import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
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
  description: string;
  target: number;
  current: number;
  unit: string;
  dailyTarget: string;
  status: "ahead" | "normal" | "behind";
  priority: "高" | "中" | "低";
};

export type PlanLog = {
  id: string;
  goalId: string;
  date: string;
  category: string;
  summary: string;
  amount: string;
  note: string;
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

function dataErrorResponse(error: unknown) {
  console.error("Data API error:", error);
  return NextResponse.json({ error: "Failed to read or write Admission OS data." }, { status: 500 });
}

async function readSeedData(): Promise<EduosData> {
  const raw = await fs.readFile(dataPath, "utf8");
  return JSON.parse(raw) as EduosData;
}

async function readFileData(): Promise<EduosData> {
  return readSeedData();
}

async function writeFileData(data: EduosData) {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readData(): Promise<EduosData> {
  return readFileData();
}

async function writeData(data: EduosData) {
  await writeFileData(data);
}

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data);
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const patch = await request.json() as Partial<EduosData>;
    const data = await readData();
    const nextData: EduosData = {
      ...data,
      ...patch,
      profile: {
        ...data.profile,
        ...patch.profile,
      },
      journey: {
        ...data.journey,
        milestones: patch.journey?.milestones || data.journey.milestones,
      },
    };

    await writeData(nextData);
    return NextResponse.json(nextData);
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { event?: GrowthEvent; events?: GrowthEvent[]; pathwayStages?: PathwayStage[]; goals?: PlanGoal[]; goalTasks?: PlanTask[]; goalLogs?: PlanLog[]; goalPhases?: PlanPhase[] };
    const data = await readData();

    if (body.events) {
      data.events = body.events;
    }

    if (body.event) {
      data.events = [body.event, ...data.events.filter((event) => event.id !== body.event!.id)];
    }

    if (body.pathwayStages) {
      data.pathwayStages = body.pathwayStages;
    }

    if (body.goals) {
      data.goals = body.goals;
    }

    if (body.goalTasks) {
      data.goalTasks = body.goalTasks;
    }

    if (body.goalLogs) {
      data.goalLogs = body.goalLogs;
    }

    if (body.goalPhases) {
      data.goalPhases = body.goalPhases;
    }

    await writeData(data);
    return NextResponse.json(data);
  } catch (error) {
    return dataErrorResponse(error);
  }
}
