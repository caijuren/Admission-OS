#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const sourcePath = process.env.ADMISSION_OS_MIGRATION_SOURCE || path.join(root, "data", "eduos.local.json");
const userId = process.env.ADMISSION_OS_STRUCTURED_USER_ID || process.env.ADMISSION_OS_USER_ID;
const stateKey = process.env.ADMISSION_OS_STATE_KEY || "default";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this migration.");
}

if (!userId || !uuidPattern.test(userId)) {
  throw new Error("Set ADMISSION_OS_STRUCTURED_USER_ID to the Supabase auth user UUID before running this migration.");
}

const raw = await readFile(sourcePath, "utf8");
const data = JSON.parse(raw);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const now = new Date().toISOString();

async function assertOk(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
}

async function replaceRows(table, rows, idColumn = "id") {
  const existing = await supabase.from(table).select(idColumn).eq("user_id", userId);
  await assertOk(existing, `select ${table}`);
  const nextIds = new Set(rows.map((row) => String(row[idColumn])));
  const deleteIds = (existing.data || []).map((row) => String(row[idColumn])).filter((id) => !nextIds.has(id));

  if (deleteIds.length) {
    await assertOk(await supabase.from(table).delete().eq("user_id", userId).in(idColumn, deleteIds), `delete ${table}`);
  }

  if (rows.length) {
    await assertOk(await supabase.from(table).upsert(rows), `upsert ${table}`);
  }
}

const profile = data.profile || {};

await assertOk(await supabase.from("app_state").upsert({
  user_id: userId,
  key: stateKey,
  data,
  updated_at: now,
}), "upsert app_state");

await assertOk(await supabase.from("students").upsert({
  user_id: userId,
  external_id: profile.id || "default",
  name: profile.name || "孩子",
  school: profile.school || "",
  grade: profile.grade || "",
  target_school: profile.targetSchool || "",
  current_stage: profile.currentStage || "",
  progress: Number(profile.progress || 0),
  quote: profile.quote || "",
  updated_at: now,
}, { onConflict: "user_id,external_id" }), "upsert students");

await replaceRows("goals", (data.goals || []).map((goal) => ({
  id: goal.id,
  user_id: userId,
  parent_id: goal.parentId || null,
  title: goal.title,
  type: goal.type,
  period: goal.period || "",
  progress: Number(goal.progress || 0),
  status: goal.status,
  description: goal.description || "",
  focus: goal.focus || [],
  updated_at: now,
})));

await replaceRows("goal_tasks", (data.goalTasks || []).map((task) => ({
  id: task.id,
  user_id: userId,
  goal_id: task.goalId,
  goal_ids: task.goalIds?.length ? task.goalIds : [task.goalId],
  phase_id: task.phaseId || null,
  category: task.category || "",
  title: task.title,
  description: task.description || null,
  target: Number(task.target || 0),
  current: Number(task.current || 0),
  unit: task.unit || "",
  daily_target: task.dailyTarget || null,
  status: task.status || "normal",
  priority: task.priority || null,
  execution_mode: task.executionMode || null,
  updated_at: now,
})));

await replaceRows("goal_logs", (data.goalLogs || []).map((log) => ({
  id: log.id,
  user_id: userId,
  goal_id: log.goalId,
  date: log.date,
  category: log.category || null,
  summary: log.summary || null,
  amount: log.amount || null,
  note: log.note || null,
  created_at: now,
})));

await replaceRows("growth_events", (data.events || []).map((event) => ({
  id: event.id,
  user_id: userId,
  student_id: event.student_id || profile.id || "default",
  type: event.type,
  category: event.category || "",
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

await replaceRows("pathway_stages", (data.pathwayStages || []).map((stage, index) => ({
  id: stage.id,
  user_id: userId,
  title: stage.title,
  period: stage.period || "",
  status: stage.status,
  summary: stage.summary || "",
  targets: stage.targets || [],
  sort_order: index,
  updated_at: now,
})));

const integrations = data.integrations || {};
await replaceRows("integrations", [
  integrations.dingtalkWebhookUrl ? {
    provider: "dingtalk",
    user_id: userId,
    config: { webhookUrl: integrations.dingtalkWebhookUrl },
    enabled: true,
    updated_at: now,
  } : null,
  integrations.ai ? {
    provider: "ai",
    user_id: userId,
    config: integrations.ai,
    enabled: Boolean(integrations.ai.apiKey),
    updated_at: now,
  } : null,
].filter(Boolean), "provider");

console.log(`Migrated ${sourcePath} to Supabase structured tables for ${userId}.`);
