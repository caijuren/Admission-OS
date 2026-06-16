/**
 * Growth Service - EduOS
 * 业务逻辑层 - 统一 Event 模型
 */

import { eventRepository, type IEventRepository } from "@/repositories";
import { createAIProvider } from "@/lib/ai";
import type {
  AnalyzeProgressOutput,
  GenerateRoadmapOutput,
} from "@/lib/ai";
import type {
  GrowthEvent,
  EventFilters,
  PortfolioData,
  EventSource,
  EventType,
  EventCategory,
} from "@/types";
import { DEFAULT_PROFILE, getProductConfig } from "@/lib/product-data";

export class GrowthService {
  private eventRepo: IEventRepository;
  private ai: ReturnType<typeof createAIProvider>;

  constructor() {
    this.eventRepo = eventRepository;
    this.ai = createAIProvider();
  }

  // ========== Generic Event Operations ==========

  async getEvents(filters?: EventFilters): Promise<GrowthEvent[]> {
    return this.eventRepo.findAll(filters);
  }

  async getHighlights(): Promise<GrowthEvent[]> {
    return this.eventRepo.findHighlights();
  }

  async getMilestones(): Promise<GrowthEvent[]> {
    return this.eventRepo.findMilestones();
  }

  async createEvent(data: {
    student_id: string;
    type: EventType;
    category: EventCategory;
    title: string;
    description?: string;
    date: string;
    tags?: GrowthEvent["tags"];
    metadata?: GrowthEvent["metadata"];
    is_highlight?: boolean;
    is_milestone?: boolean;
    source?: EventSource;
  }): Promise<GrowthEvent> {
    return this.eventRepo.create(data);
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.eventRepo.delete(id);
  }

  // ========== Reading Module ==========

  async getReadingEvents(): Promise<GrowthEvent[]> {
    return this.eventRepo.findByType("reading");
  }

  async addReadingEvent(data: {
    student_id: string;
    bookTitle: string;
    bookAuthor: string;
    bookCategory: string;
    rating: number;
    date: string;
    note?: string;
    isHighlight?: boolean;
  }): Promise<GrowthEvent> {
    const event = await this.eventRepo.create({
      student_id: data.student_id,
      type: "reading",
      category: "阅读",
      title: `完成《${data.bookTitle}》`,
      description: data.note || `${data.bookAuthor} 著`,
      date: data.date,
      tags: [{ id: crypto.randomUUID(), name: data.bookCategory, color: "#3b82f6" }],
      metadata: {
        bookTitle: data.bookTitle,
        bookAuthor: data.bookAuthor,
        bookCategory: data.bookCategory,
        rating: data.rating,
      },
      is_highlight: data.isHighlight || false,
      is_milestone: false,
      source: "reading",
    });
    return event;
  }

  async getReadingStats(): Promise<{
    totalBooks: number;
    completedBooks: number;
    avgRating: number;
    topCategories: string[];
    favoriteBooks: Array<{ title: string; author: string; rating: number }>;
  }> {
    const events = await this.eventRepo.findByType("reading");
    if (events.length === 0) {
      return { totalBooks: 0, completedBooks: 0, avgRating: 0, topCategories: [], favoriteBooks: [] };
    }

    const totalBooks = events.length;
    const completedBooks = events.filter(e => e.metadata.bookTitle).length;
    const ratings = events.filter(e => e.metadata.rating).map(e => e.metadata.rating!);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    const categoryCount: Record<string, number> = {};
    events.forEach(e => {
      if (e.metadata.bookCategory) {
        categoryCount[e.metadata.bookCategory] = (categoryCount[e.metadata.bookCategory] || 0) + 1;
      }
    });
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    const favoriteBooks = events
      .filter(e => e.metadata.rating && e.metadata.rating >= 4)
      .slice(0, 3)
      .map(e => ({
        title: e.metadata.bookTitle || e.title,
        author: e.metadata.bookAuthor || "",
        rating: e.metadata.rating || 0,
      }));

    return { totalBooks, completedBooks, avgRating, topCategories, favoriteBooks };
  }

  // ========== Grades Module ==========

  async getGradeEvents(): Promise<GrowthEvent[]> {
    return this.eventRepo.findByType("exam");
  }

  async addGradeEvent(data: {
    student_id: string;
    subject: string;
    score: number;
    ranking: number;
    examType: "月考" | "期中" | "期末" | "一模" | "二模";
    date: string;
    totalStudents?: number;
    isHighlight?: boolean;
  }): Promise<GrowthEvent> {
    const event = await this.eventRepo.create({
      student_id: data.student_id,
      type: "exam",
      category: "学业",
      title: `${data.examType}考试 ${data.subject} ${data.score}分`,
      description: `排名年级第${data.ranking}名`,
      date: data.date,
      tags: [{ id: crypto.randomUUID(), name: data.examType, color: "#8b5cf6" }],
      metadata: {
        subject: data.subject,
        examType: data.examType,
        score: data.score,
        ranking: data.ranking,
        totalStudents: data.totalStudents,
      },
      is_highlight: data.isHighlight || data.ranking <= 10,
      is_milestone: data.ranking <= 5,
      source: "grades",
    });
    return event;
  }

  async getGradeTrends(): Promise<Array<{
    subject: string;
    trend: "up" | "down" | "stable";
    latestScore: number;
    bestScore: number;
    examsCount: number;
  }>> {
    const events = await this.eventRepo.findByType("exam");
    const subjectMap: Record<string, GrowthEvent[]> = {};
    events.forEach(e => {
      const sub = e.metadata.subject || "综合";
      if (!subjectMap[sub]) subjectMap[sub] = [];
      subjectMap[sub].push(e);
    });

    return Object.entries(subjectMap).map(([subject, evts]) => {
      const sorted = evts.sort((a, b) => b.date.localeCompare(a.date));
      const latestScore = sorted[0]?.metadata.score || 0;
      const bestScore = Math.max(...evts.map(e => e.metadata.score || 0));
      const examsCount = evts.length;
      const trend = sorted.length >= 2
        ? (sorted[0].metadata.score! > sorted[1].metadata.score! ? "up" : sorted[0].metadata.score! < sorted[1].metadata.score! ? "down" : "stable")
        : "stable" as const;

      return { subject, trend, latestScore, bestScore, examsCount };
    });
  }

  // ========== Records Module ==========

  async getRecordsEvents(): Promise<GrowthEvent[]> {
    // Records module contains honor, project, and expression events
    return this.eventRepo.findBySources(["records"]);
  }

  async addHonorEvent(data: {
    student_id: string;
    title: string;
    level: "校级" | "区级" | "市级" | "省级" | "国家级";
    date: string;
    category?: string;
    description?: string;
  }): Promise<GrowthEvent> {
    return this.eventRepo.create({
      student_id: data.student_id,
      type: "honor",
      category: "荣誉",
      title: data.title,
      description: data.description || `${data.level}荣誉`,
      date: data.date,
      tags: [{ id: crypto.randomUUID(), name: data.level, color: "#f59e0b" }],
      metadata: { honorTitle: data.title, honorLevel: data.level },
      is_highlight: true,
      is_milestone: data.level === "市级" || data.level === "省级" || data.level === "国家级",
      source: "records",
    });
  }

  async addProjectEvent(data: {
    student_id: string;
    title: string;
    description: string;
    role: string;
    achievements: string[];
    startDate: string;
  }): Promise<GrowthEvent> {
    return this.eventRepo.create({
      student_id: data.student_id,
      type: "project",
      category: "项目",
      title: data.title,
      description: data.description,
      date: data.startDate,
      tags: [{ id: crypto.randomUUID(), name: "科创", color: "#06b6d4" }],
      metadata: {
        projectRole: data.role,
        projectAchievements: data.achievements,
      },
      is_highlight: true,
      is_milestone: false,
      source: "records",
    });
  }

  // ========== Goals Module ==========

  async getGoalEvents(): Promise<GrowthEvent[]> {
    return this.eventRepo.findByType("goal");
  }

  async addGoalEvent(data: {
    student_id: string;
    title: string;
    description?: string;
    goalType: "长期" | "年度" | "季度" | "月" | "周";
    progress?: number;
    date: string;
    isMilestone?: boolean;
  }): Promise<GrowthEvent> {
    return this.eventRepo.create({
      student_id: data.student_id,
      type: "goal",
      category: "目标",
      title: data.title,
      description: data.description || "",
      date: data.date,
      tags: [{ id: crypto.randomUUID(), name: data.goalType, color: "#22c55e" }],
      metadata: {
        goalType: data.goalType,
        goalProgress: data.progress || 0,
      },
      is_highlight: data.progress === 100,
      is_milestone: data.isMilestone || data.progress === 100,
      source: "goals",
    });
  }

  // ========== Weekly Module ==========

  async getWeeklyEvents(): Promise<GrowthEvent[]> {
    const events = await this.eventRepo.findAll();
    // Get events from the last 7 days or current week
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return events.filter(e => new Date(e.date) >= weekAgo);
  }

  // ========== Portfolio Generation ==========

  async generatePortfolioData(): Promise<PortfolioData> {
    const events = await this.eventRepo.findAll();
    const profile = typeof window === "undefined" ? DEFAULT_PROFILE : (await getProductConfig()).profile;

    // Reading stats
    const readingStats = await this.getReadingStats();

    // Grade trends
    const gradeTrends = await this.getGradeTrends();

    // Honors
    const honorEvents = events.filter(e => e.type === "honor");
    const honors = honorEvents.map(e => ({
      title: e.metadata.honorTitle || e.title,
      level: (e.metadata.honorLevel || "校级") as "校级" | "区级" | "市级",
      date: e.date,
      category: e.category,
    }));

    // Projects
    const projectEvents = events.filter(e => e.type === "project");
    const projects = projectEvents.map(e => ({
      title: e.title,
      description: e.description,
      role: e.metadata.projectRole || "成员",
      achievements: e.metadata.projectAchievements || [],
      startDate: e.date,
    }));

    // Timeline
    const timeline = events
      .filter(e => e.is_highlight)
      .map(e => ({
        date: e.date,
        title: e.title,
        description: e.description,
        category: e.category as "学业" | "阅读" | "荣誉" | "项目" | "其他",
      }));

    return {
      basicInfo: {
        name: profile.name,
        gender: "男",
        birthday: "",
        school: profile.school,
        grade: profile.grade,
      },
      targetSchool: profile.targetSchool,
      readingStats,
      gradeTrends,
      honors,
      projects,
      timeline,
      representativeWorks: [],
      generatedAt: new Date().toISOString(),
    };
  }

  // ========== Dashboard Data ==========

  async getDashboardData(): Promise<{
    recentHighlights: GrowthEvent[];
    milestones: GrowthEvent[];
    readingCount: number;
    latestGrade: number;
    honorCount: number;
  }> {
    const [highlights, gradeEvents, readingEvents, honorEvents] = await Promise.all([
      this.eventRepo.findHighlights(),
      this.eventRepo.findByType("exam"),
      this.eventRepo.findByType("reading"),
      this.eventRepo.findByType("honor"),
    ]);

    const sortedGrades = gradeEvents.sort((a, b) => b.date.localeCompare(a.date));
    const latestGrade = sortedGrades[0]?.metadata.score || 0;

    return {
      recentHighlights: highlights.slice(0, 3),
      milestones: await this.eventRepo.findMilestones(),
      readingCount: readingEvents.length,
      latestGrade,
      honorCount: honorEvents.length,
    };
  }

  // ========== AI Operations ==========

  async analyzeProgress(): Promise<AnalyzeProgressOutput> {
    const events = await this.eventRepo.findAll();
    const metrics = [
      { name: "数学", currentValue: 85, targetValue: 100 },
      { name: "英语", currentValue: 90, targetValue: 95 },
      { name: "阅读", currentValue: 88, targetValue: 100 },
    ];

    return this.ai.analyzeProgress({
      currentMetrics: metrics,
      recentEvents: events.slice(0, 5).map(e => ({
        type: e.type,
        title: e.title,
        date: e.date,
      })),
      targetSchool: "交附嘉分",
      daysRemaining: 1086,
    });
  }

  async generateRoadmap(): Promise<GenerateRoadmapOutput> {
    return this.ai.generateRoadmap({
      currentGrade: "六年级",
      targetSchool: "交附嘉分",
      currentMetrics: {
        math: 85,
        english: 90,
        chinese: 88,
      },
    });
  }
}

// Singleton instance
export const growthService = new GrowthService();
