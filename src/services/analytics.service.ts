/**
 * Usage Analytics Service - EduOS
 * Tracks user interactions for product analytics
 */

import { supabase } from "@/lib/supabase";

const studentId = process.env.NEXT_PUBLIC_STUDENT_ID || "1";

export interface PageVisit {
  id: string;
  student_id: string;
  page_name: string;
  visit_time: string;
  duration_ms: number;
  created_at: string;
}

export interface DailyStats {
  date: string;
  student_id: string;
  dashboard_visits: number;
  timeline_visits: number;
  portfolio_visits: number;
  reading_visits: number;
  grades_visits: number;
  goals_visits: number;
  weekly_visits: number;
  total_visits: number;
  active_minutes: number;
  data_entries: number;
  created_at: string;
}

export interface AnalyticsSummary {
  last30Days: {
    totalVisits: number;
    activeDays: number;
    avgDailyVisits: number;
    avgDurationMinutes: number;
  };
  pageStats: Array<{
    page: string;
    visits: number;
    avgDurationMinutes: number;
  }>;
  dailyData: Array<{
    date: string;
    visits: number;
    durationMinutes: number;
  }>;
}

let pageStartTime: Record<string, number> = {};
let currentPage: string | null = null;

export class AnalyticsService {
  private async getTodayDate(): Promise<string> {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  async trackPageView(pageName: string): Promise<void> {
    if (currentPage && pageStartTime[currentPage]) {
      const duration = Date.now() - pageStartTime[currentPage];
      await this.recordPageVisit(currentPage, duration);
    }

    currentPage = pageName;
    pageStartTime[pageName] = Date.now();
  }

  async recordPageVisit(pageName: string, durationMs: number): Promise<void> {
    try {
      await supabase.from("usage_events").insert([{
        student_id: studentId,
        event_type: "page_view",
        page_name: pageName,
        duration_ms: durationMs,
        occurred_at: new Date().toISOString(),
      }]);

      await this.updateDailyStats(pageName);
    } catch (error) {
      console.error("Error recording page visit:", error);
    }
  }

  async trackDataEntry(module: string): Promise<void> {
    try {
      await supabase.from("usage_events").insert([{
        student_id: studentId,
        event_type: "data_entry",
        page_name: module,
        duration_ms: 0,
        occurred_at: new Date().toISOString(),
      }]);

      const today = await this.getTodayDate();
      const { data: existing } = await supabase
        .from("usage_daily")
        .select("data_entries")
        .eq("student_id", studentId)
        .eq("date", today)
        .single();

      if (existing) {
        await supabase
          .from("usage_daily")
          .update({ data_entries: (existing.data_entries || 0) + 1 })
          .eq("student_id", studentId)
          .eq("date", today);
      }
    } catch (error) {
      console.error("Error recording data entry:", error);
    }
  }

  private async updateDailyStats(pageName: string): Promise<void> {
    const today = await this.getTodayDate();
    const pageColumn = `${pageName.toLowerCase()}_visits` as keyof DailyStats;

    const { data: existing } = await supabase
      .from("usage_daily")
      .select("*")
      .eq("student_id", studentId)
      .eq("date", today)
      .single();

    if (existing) {
      const updates: Record<string, number> = {};
      updates[pageColumn] = (existing[pageColumn] || 0) + 1;
      updates["total_visits"] = (existing.total_visits || 0) + 1;

      await supabase
        .from("usage_daily")
        .update(updates)
        .eq("student_id", studentId)
        .eq("date", today);
    } else {
      const defaultStats: Record<string, unknown> = {
        date: today,
        student_id: studentId,
        dashboard_visits: 0,
        timeline_visits: 0,
        portfolio_visits: 0,
        reading_visits: 0,
        grades_visits: 0,
        goals_visits: 0,
        weekly_visits: 0,
        total_visits: 1,
        active_minutes: 0,
        data_entries: 0,
        created_at: new Date().toISOString(),
      };

      defaultStats[pageColumn] = 1;

      await supabase.from("usage_daily").insert([defaultStats]);
    }
  }

  async getLast30DaysSummary(): Promise<AnalyticsSummary> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("usage_daily")
      .select("*")
      .eq("student_id", studentId)
      .gte("date", startDate)
      .order("date", { ascending: true });
    const dailyStats = (data || []) as DailyStats[];

    if (error) {
      console.error("Error fetching daily stats:", error);
      return this.getEmptySummary();
    }

    const activeDays = dailyStats?.filter(d => d.total_visits > 0).length || 0;
    const totalVisits = dailyStats?.reduce((sum, d) => sum + (d.total_visits || 0), 0) || 0;
    const totalMinutes = dailyStats?.reduce((sum, d) => sum + (d.active_minutes || 0), 0) || 0;

    const pageNames = ["dashboard", "timeline", "portfolio", "reading", "grades", "goals", "weekly"];
    const pageStats = pageNames.map(page => {
      const visits = dailyStats.reduce((sum, d) => {
        const value = d[`${page}_visits` as keyof DailyStats];
        return sum + (typeof value === "number" ? value : 0);
      }, 0);
      return {
        page,
        visits,
        avgDurationMinutes: visits > 0 ? totalMinutes / visits : 0,
      };
    });

    const dailyData = (dailyStats || []).map(d => ({
      date: d.date,
      visits: d.total_visits || 0,
      durationMinutes: d.active_minutes || 0,
    }));

    return {
      last30Days: {
        totalVisits,
        activeDays,
        avgDailyVisits: activeDays > 0 ? totalVisits / activeDays : 0,
        avgDurationMinutes: totalVisits > 0 ? totalMinutes / totalVisits : 0,
      },
      pageStats,
      dailyData,
    };
  }

  private getEmptySummary(): AnalyticsSummary {
    return {
      last30Days: {
        totalVisits: 0,
        activeDays: 0,
        avgDailyVisits: 0,
        avgDurationMinutes: 0,
      },
      pageStats: [
        { page: "dashboard", visits: 0, avgDurationMinutes: 0 },
        { page: "timeline", visits: 0, avgDurationMinutes: 0 },
        { page: "portfolio", visits: 0, avgDurationMinutes: 0 },
        { page: "reading", visits: 0, avgDurationMinutes: 0 },
        { page: "grades", visits: 0, avgDurationMinutes: 0 },
        { page: "goals", visits: 0, avgDurationMinutes: 0 },
        { page: "weekly", visits: 0, avgDurationMinutes: 0 },
      ],
      dailyData: [],
    };
  }

  async getTodayStats(): Promise<DailyStats | null> {
    const today = await this.getTodayDate();
    const { data, error } = await supabase
      .from("usage_daily")
      .select("*")
      .eq("student_id", studentId)
      .eq("date", today)
      .single();

    if (error) {
      console.error("Error fetching today stats:", error);
      return null;
    }

    return data || null;
  }
}

export const analyticsService = new AnalyticsService();
