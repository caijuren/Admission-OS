/**
 * AI Provider Interface
 * 统一AI接口抽象层，支持未来切换不同AI服务商
 */

export interface AIConfig {
  provider: "openai" | "claude" | "gemini" | "deepseek";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface GenerateWeeklyReportInput {
  weekNumber: number;
  tasks: Array<{
    title: string;
    progress: number;
    status: string;
  }>;
  gradeChanges: Array<{
    subject: string;
    change: number;
  }>;
  readingCount: number;
  englishHours: number;
  exerciseCount: number;
}

export interface GenerateWeeklyReportOutput {
  summary: string;
  highlights: string[];
  riskWarnings: string[];
  nextWeekRecommendations: string[];
}

export interface GeneratePortfolioInput {
  studentName: string;
  targetSchool: string;
  readingStats: {
    totalBooks: number;
    completedBooks: number;
    avgRating: number;
    topCategories: string[];
    favoriteBooks: Array<{ title: string; author: string; rating: number }>;
  };
  gradeTrends: Array<{
    subject: string;
    latestScore: number;
    bestScore: number;
    trend: "up" | "down" | "stable";
  }>;
  honors: Array<{
    title: string;
    level: string;
    date: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    achievements: string[];
  }>;
  timeline: Array<{
    date: string;
    title: string;
    category: string;
  }>;
}

export interface GeneratePortfolioOutput {
  introduction: string;
  academicStrengths: string[];
  extracurricularHighlights: string[];
  growthNarrative: string;
  futureAspiration: string;
}

export interface AnalyzeProgressInput {
  currentMetrics: Array<{
    name: string;
    currentValue: number;
    targetValue: number;
  }>;
  recentEvents: Array<{
    type: string;
    title: string;
    date: string;
  }>;
  targetSchool: string;
  daysRemaining: number;
}

export interface AnalyzeProgressOutput {
  onTrack: boolean;
  completionRate: number;
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
  recommendations: string[];
}

export interface GenerateRoadmapInput {
  currentGrade: string;
  targetSchool: string;
  currentMetrics: Record<string, number>;
}

export interface GenerateRoadmapOutput {
  milestones: Array<{
    title: string;
    description: string;
    targetDate: string;
    keyMetrics: string[];
  }>;
  actionPlan: Array<{
    category: string;
    actions: string[];
    priority: number;
  }>;
}

export interface AIProvider {
  /**
   * 生成周报摘要
   */
  generateWeeklyReport(input: GenerateWeeklyReportInput): Promise<GenerateWeeklyReportOutput>;

  /**
   * 生成档案介绍
   */
  generatePortfolio(input: GeneratePortfolioInput): Promise<GeneratePortfolioOutput>;

  /**
   * 分析学习进度
   */
  analyzeProgress(input: AnalyzeProgressInput): Promise<AnalyzeProgressOutput>;

  /**
   * 生成成长路线图
   */
  generateRoadmap(input: GenerateRoadmapInput): Promise<GenerateRoadmapOutput>;
}
