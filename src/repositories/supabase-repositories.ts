/**
 * Supabase Repository Layer - EduOS
 * All other data tables
 */

import { supabase } from "@/lib/supabase";

const studentId = process.env.NEXT_PUBLIC_STUDENT_ID || "1";

// Student Repository
export async function getStudent() {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  if (error) {
    console.error("Error fetching student:", error);
    return null;
  }
  return data;
}

export async function updateStudent(data: Partial<{
  name: string;
  birthday: string;
  target_school: string;
  grade: string;
}>) {
  const { data: updated, error } = await supabase
    .from("students")
    .update(data)
    .eq("id", studentId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating student:", error);
    return null;
  }
  return updated;
}

// Reading Repository
export async function getBooks() {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching books:", error);
    return [];
  }
  return data;
}

export async function createBook(data: {
  title: string;
  author: string;
  category: string;
  start_date: string;
  finish_date: string;
  rating: number;
  note: string;
}) {
  const { data: created, error } = await supabase
    .from("books")
    .insert([{ ...data, student_id: studentId }])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating book:", error);
    return null;
  }
  return created;
}

// Exam Repository
export async function getExams() {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("student_id", studentId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching exams:", error);
    return [];
  }
  return data;
}

export async function createExam(data: {
  subject: string;
  score: number;
  ranking: number;
  exam_type: "月考" | "期中" | "期末" | "一模" | "二模";
  date: string;
}) {
  const { data: created, error } = await supabase
    .from("exams")
    .insert([{ ...data, student_id: studentId }])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating exam:", error);
    return null;
  }
  return created;
}

// Goal Repository
export async function getGoals() {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching goals:", error);
    return [];
  }
  return data;
}

export async function createGoal(data: {
  type: "长期" | "年度" | "季度" | "月" | "周";
  title: string;
  description: string;
  progress: number;
  start_date: string;
  end_date: string;
}) {
  const { data: created, error } = await supabase
    .from("goals")
    .insert([{ ...data, student_id: studentId, status: "进行中" }])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating goal:", error);
    return null;
  }
  return created;
}

export async function updateGoal(id: string, data: Partial<{
  progress: number;
  status: "进行中" | "已完成" | "已过期";
}>) {
  const { data: updated, error } = await supabase
    .from("goals")
    .update(data)
    .eq("id", id)
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating goal:", error);
    return null;
  }
  return updated;
}

// Honor Repository
export async function getHonors() {
  const { data, error } = await supabase
    .from("honors")
    .select("*")
    .eq("student_id", studentId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching honors:", error);
    return [];
  }
  return data;
}

export async function createHonor(data: {
  title: string;
  level: "校级" | "区级" | "市级" | "省级" | "国家级";
  date: string;
  description: string;
}) {
  const { data: created, error } = await supabase
    .from("honors")
    .insert([{ ...data, student_id: studentId }])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating honor:", error);
    return null;
  }
  return created;
}

// Project Repository
export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("student_id", studentId)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
  return data;
}

export async function createProject(data: {
  title: string;
  description: string;
  role: string;
  achievements: string[];
  start_date: string;
}) {
  const { data: created, error } = await supabase
    .from("projects")
    .insert([{ ...data, student_id: studentId, status: "进行中" }])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating project:", error);
    return null;
  }
  return created;
}

// Weekly Report Repository
export async function getWeeklyReports() {
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("student_id", studentId)
    .order("week_start", { ascending: false });

  if (error) {
    console.error("Error fetching weekly reports:", error);
    return [];
  }
  return data;
}

export async function createWeeklyReport(data: {
  week_start: string;
  content: string;
}) {
  const { data: created, error } = await supabase
    .from("weekly_reports")
    .insert([{ ...data, student_id: studentId }])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating weekly report:", error);
    return null;
  }
  return created;
}