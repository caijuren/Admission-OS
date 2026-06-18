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
  executionMode?: "孩子自主" | "家长陪练" | "亲子共学" | "家长验收";
};

export type AiIntegrationConfig = {
  provider?: "openai" | "deepseek" | "custom";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type AiConversation = {
  id: string;
  title: string;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
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
  integrations?: {
    dingtalkWebhookUrl?: string;
    ai?: AiIntegrationConfig;
  };
  events: GrowthEvent[];
  pathwayStages?: PathwayStage[];
  goals?: PlanGoal[];
  goalTasks?: PlanTask[];
  goalLogs?: PlanLog[];
  goalPhases?: PlanPhase[];
  aiConversations?: AiConversation[];
};

const dataPath = path.join(process.cwd(), "data", "eduos.json");
const localDataPath = path.join(process.cwd(), "data", "eduos.local.json");
const appStateKey = process.env.ADMISSION_OS_STATE_KEY || "default";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readSeedData(): Promise<EduosData> {
  const raw = await fs.readFile(dataPath, "utf8");
  return JSON.parse(raw) as EduosData;
}

async function readLocalData(): Promise<EduosData> {
  try {
    const raw = await fs.readFile(localDataPath, "utf8");
    return JSON.parse(raw) as EduosData;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const seedData = await readSeedData();
    await writeLocalData(seedData);
    return seedData;
  }
}

async function writeLocalData(data: EduosData) {
  await fs.mkdir(path.dirname(localDataPath), { recursive: true });
  const tempPath = `${localDataPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, localDataPath);
}

function isDatabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isDatabaseRequired() {
  return process.env.ADMISSION_OS_DATA_DRIVER === "database" || process.env.ADMISSION_OS_DATA_DRIVER === "structured";
}

function isStructuredDatabaseRequired() {
  return process.env.ADMISSION_OS_DATA_DRIVER === "structured";
}

function getDatabaseUserId(userId: string) {
  if (uuidPattern.test(userId)) return userId;

  const mappedUserId = process.env.ADMISSION_OS_STRUCTURED_USER_ID || process.env.ADMISSION_OS_USER_ID;
  if (mappedUserId && uuidPattern.test(mappedUserId)) return mappedUserId;

  throw new Error(
    "Structured Supabase data store requires a UUID user id. Set ADMISSION_OS_STRUCTURED_USER_ID when using local auth."
  );
}

async function writeJsonStateData(userId: string, data: EduosData) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("app_state")
    .upsert({
      user_id: userId,
      key: appStateKey,
      data,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
}

async function readJsonStateData(userId: string): Promise<EduosData | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("user_id", userId)
    .eq("key", appStateKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.data ? data.data as EduosData : null;
}

function taskGoalIds(task: PlanTask) {
  const ids = Array.isArray(task.goalIds) && task.goalIds.length ? task.goalIds : [task.goalId];
  return ids.filter(Boolean);
}

async function replaceUserRows(
  table: string,
  userId: string,
  rows: Record<string, unknown>[],
  idColumn = "id"
) {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select(idColumn)
    .eq("user_id", userId);

  if (selectError) throw selectError;

  const nextIds = new Set(rows.map((row) => String(row[idColumn])));
  const deleteIds = ((existing || []) as unknown as Record<string, unknown>[])
    .map((row) => String(row[idColumn]))
    .filter((id) => !nextIds.has(id));

  if (deleteIds.length) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId).in(idColumn, deleteIds);
    if (error) throw error;
  }

  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows);
    if (error) throw error;
  }
}

async function writeStructuredData(userId: string, data: EduosData) {
  const databaseUserId = getDatabaseUserId(userId);
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const profile = data.profile;

  const { error: studentError } = await supabase.from("students").upsert({
    user_id: databaseUserId,
    external_id: profile.id || "default",
    name: profile.name,
    school: profile.school,
    grade: profile.grade,
    target_school: profile.targetSchool,
    current_stage: profile.currentStage,
    progress: profile.progress,
    quote: profile.quote,
    updated_at: now,
  }, { onConflict: "user_id,external_id" });
  if (studentError) throw studentError;

  await replaceUserRows("goals", databaseUserId, (data.goals || []).map((goal) => ({
    id: goal.id,
    user_id: databaseUserId,
    title: goal.title,
    type: goal.type,
    period: goal.period,
    progress: goal.progress,
    status: goal.status,
    description: goal.description,
    parent_id: goal.parentId || null,
    focus: goal.focus || [],
    updated_at: now,
  })));

  await replaceUserRows("goal_tasks", databaseUserId, (data.goalTasks || []).map((task) => ({
    id: task.id,
    user_id: databaseUserId,
    goal_id: task.goalId,
    goal_ids: taskGoalIds(task),
    phase_id: task.phaseId || null,
    category: task.category,
    title: task.title,
    description: task.description || null,
    target: task.target,
    current: task.current,
    unit: task.unit,
    daily_target: task.dailyTarget || null,
    status: task.status,
    priority: task.priority || null,
    execution_mode: task.executionMode || null,
    updated_at: now,
  })));

  await replaceUserRows("goal_logs", databaseUserId, (data.goalLogs || []).map((log) => ({
    id: log.id,
    user_id: databaseUserId,
    goal_id: log.goalId,
    date: log.date,
    category: log.category || null,
    summary: log.summary || null,
    amount: log.amount || null,
    note: log.note || null,
    created_at: now,
  })));

  await replaceUserRows("growth_events", databaseUserId, (data.events || []).map((event) => ({
    id: event.id,
    user_id: databaseUserId,
    student_id: event.student_id || profile.id || "default",
    type: event.type,
    category: event.category,
    title: event.title,
    description: event.description || "",
    date: event.date,
    year: event.year || Number(event.date?.slice(0, 4)) || new Date().getFullYear(),
    tags: event.tags || [],
    attachments: event.attachments || [],
    metadata: event.metadata || {},
    is_highlight: Boolean(event.is_highlight),
    is_milestone: Boolean(event.is_milestone),
    source: event.source || "manual",
    payload: event,
    created_at: event.created_at || now,
    updated_at: now,
  })));

  await replaceUserRows("pathway_stages", databaseUserId, (data.pathwayStages || []).map((stage) => ({
    id: stage.id,
    user_id: databaseUserId,
    title: stage.title,
    period: stage.period,
    status: stage.status,
    summary: stage.summary,
    targets: stage.targets || [],
    updated_at: now,
  })));

  const integrations = data.integrations || {};
  const integrationRows = [
    integrations.dingtalkWebhookUrl ? {
      provider: "dingtalk",
      user_id: databaseUserId,
      enabled: true,
      config: { webhookUrl: integrations.dingtalkWebhookUrl },
      updated_at: now,
    } : null,
    integrations.ai ? {
      provider: "ai",
      user_id: databaseUserId,
      enabled: Boolean(integrations.ai.apiKey),
      config: integrations.ai,
      updated_at: now,
    } : null,
  ].filter(Boolean) as Record<string, unknown>[];

  await replaceUserRows("integrations", databaseUserId, integrationRows, "provider");
  await writeJsonStateData(databaseUserId, data);
}

async function readStructuredData(userId: string): Promise<EduosData> {
  const databaseUserId = getDatabaseUserId(userId);
  const supabase = createSupabaseAdminClient();
  let snapshot = await readJsonStateData(databaseUserId);

  if (!snapshot) {
    snapshot = await readSeedData();
    await writeStructuredData(userId, snapshot);
    return snapshot;
  }

  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", databaseUserId)
    .limit(1);
  if (studentError) throw studentError;

  if (!students?.length) {
    await writeStructuredData(userId, snapshot);
    return snapshot;
  }

  const [
    goalsResult,
    tasksResult,
    logsResult,
    eventsResult,
    stagesResult,
    integrationsResult,
  ] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", databaseUserId).order("created_at", { ascending: true }),
    supabase.from("goal_tasks").select("*").eq("user_id", databaseUserId).order("created_at", { ascending: true }),
    supabase.from("goal_logs").select("*").eq("user_id", databaseUserId).order("date", { ascending: false }),
    supabase.from("growth_events").select("*").eq("user_id", databaseUserId).order("date", { ascending: false }),
    supabase.from("pathway_stages").select("*").eq("user_id", databaseUserId).order("created_at", { ascending: true }),
    supabase.from("integrations").select("*").eq("user_id", databaseUserId),
  ]);

  const errors = [goalsResult.error, tasksResult.error, logsResult.error, eventsResult.error, stagesResult.error, integrationsResult.error].filter(Boolean);
  if (errors.length) throw errors[0];

  const student = students[0] as Record<string, unknown>;
  const integrations = (integrationsResult.data || []).reduce<NonNullable<EduosData["integrations"]>>((acc, row) => {
    const provider = String(row.provider || "");
    const config = (row.config || {}) as Record<string, string>;
    if (provider === "dingtalk") acc.dingtalkWebhookUrl = config.webhookUrl || "";
    if (provider === "ai") acc.ai = config as AiIntegrationConfig;
    return acc;
  }, { ...snapshot.integrations });

  return {
    ...snapshot,
    profile: {
      id: String(student.external_id || snapshot.profile.id),
      name: String(student.name || snapshot.profile.name),
      school: String(student.school || snapshot.profile.school),
      grade: String(student.grade || snapshot.profile.grade),
      targetSchool: String(student.target_school || snapshot.profile.targetSchool),
      currentStage: String(student.current_stage || snapshot.profile.currentStage),
      progress: Number(student.progress ?? snapshot.profile.progress),
      quote: String(student.quote || snapshot.profile.quote),
    },
    integrations,
    goals: (goalsResult.data || []).map((goal) => ({
      id: goal.id,
      title: goal.title,
      type: goal.type,
      period: goal.period,
      progress: Number(goal.progress || 0),
      status: goal.status,
      description: goal.description,
      parentId: goal.parent_id || undefined,
      focus: goal.focus || [],
    })) as PlanGoal[],
    goalTasks: (tasksResult.data || []).map((task) => ({
      id: task.id,
      goalId: task.goal_id,
      goalIds: task.goal_ids || [task.goal_id],
      phaseId: task.phase_id || undefined,
      category: task.category,
      title: task.title,
      description: task.description || undefined,
      target: Number(task.target || 0),
      current: Number(task.current || 0),
      unit: task.unit,
      dailyTarget: task.daily_target || undefined,
      status: task.status,
      priority: task.priority || undefined,
      executionMode: task.execution_mode || undefined,
    })) as PlanTask[],
    goalLogs: (logsResult.data || []).map((log) => ({
      id: log.id,
      goalId: log.goal_id,
      date: log.date,
      category: log.category || undefined,
      summary: log.summary || undefined,
      amount: log.amount || undefined,
      note: log.note || undefined,
    })) as PlanLog[],
    events: (eventsResult.data || []).map((event) => ({
      ...(event.payload || {}),
      id: event.id,
      student_id: event.student_id,
      type: event.type,
      category: event.category,
      title: event.title,
      description: event.description,
      date: event.date,
      year: event.year,
      tags: event.tags || [],
      attachments: event.attachments || [],
      metadata: event.metadata || {},
      is_highlight: Boolean(event.is_highlight),
      is_milestone: Boolean(event.is_milestone),
      source: event.source || "manual",
      created_at: event.created_at,
      updated_at: event.updated_at,
    })) as GrowthEvent[],
    pathwayStages: (stagesResult.data || []).map((stage) => ({
      id: stage.id,
      title: stage.title,
      period: stage.period,
      status: stage.status,
      summary: stage.summary,
      targets: stage.targets || [],
    })) as PathwayStage[],
  };
}

export async function readData(userId: string): Promise<EduosData> {
  if (!isDatabaseConfigured()) {
    if (isDatabaseRequired()) {
      throw new Error("Production data store requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    return readLocalData();
  }

  if (isStructuredDatabaseRequired()) {
    return readStructuredData(userId);
  }

  const data = await readJsonStateData(userId);
  if (data) return data;

  const seedData = await readSeedData();
  await writeJsonStateData(userId, seedData);
  return seedData;
}

export async function writeData(userId: string, data: EduosData) {
  if (!isDatabaseConfigured()) {
    if (isDatabaseRequired()) {
      throw new Error("Production data store requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    await writeLocalData(data);
    return;
  }

  if (isStructuredDatabaseRequired()) {
    await writeStructuredData(userId, data);
    return;
  }

  await writeJsonStateData(userId, data);
}
