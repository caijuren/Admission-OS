import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getStudent(): Promise<import("@/types").Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching student:", error);
    return null;
  }
  return data;
}

export async function getBooks() {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching books:", error);
    return [];
  }
  return data;
}

export async function getExams() {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching exams:", error);
    return [];
  }
  return data;
}

export async function getGoals() {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching goals:", error);
    return [];
  }
  return data;
}

export async function getHonors() {
  const { data, error } = await supabase
    .from("honors")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching honors:", error);
    return [];
  }
  return data;
}

export async function getIndicatorProgress() {
  const { data, error } = await supabase
    .from("indicator_progress")
    .select("*");

  if (error) {
    console.error("Error fetching indicators:", error);
    return [];
  }
  return data;
}
