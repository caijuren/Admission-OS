// =============================================
// Core Entity Types
// =============================================

export interface Student {
  id: string;
  name: string;
  birthday: string;
  target_school: string;
  grade: string;
  created_at: string;
}

// =============================================
// Unified Event Model - Growth OS Foundation
// All growth records are unified as Events
// =============================================

export type EventType = 
  | "reading"      // 阅读
  | "exam"          // 考试
  | "honor"         // 荣誉
  | "project"       // 项目
  | "goal"          // 目标达成
  | "exercise"      // 运动
  | "expression"    // 表达/演讲
  | "other";        // 其他

export type EventCategory = 
  | "学业"    // Academic
  | "阅读"    // Reading
  | "荣誉"    // Honor
  | "项目"    // Project
  | "目标"    // Goal
  | "运动"    // Exercise
  | "表达"    // Expression
  | "其他";   // Other

export interface EventTag {
  id: string;
  name: string;
  color?: string;
}

export interface EventAttachment {
  id: string;
  name: string;
  url: string;
  type: "file" | "link" | "image";
}

export interface EventMetadata {
  // For reading events
  bookTitle?: string;
  bookAuthor?: string;
  bookCategory?: string;
  rating?: number;
  
  // For exam events
  subject?: string;
  examType?: "月考" | "期中" | "期末" | "一模" | "二模";
  score?: number;
  ranking?: number;
  totalStudents?: number;
  
  // For honor events
  honorTitle?: string;
  honorLevel?: "校级" | "区级" | "市级" | "省级" | "国家级";
  
  // For project events
  projectRole?: string;
  projectAchievements?: string[];
  
  // For goal events
  goalType?: "长期" | "年度" | "季度" | "月" | "周";
  goalProgress?: number;
  
  // For exercise events
  exerciseType?: string;
  duration?: number;
  
  // For expression events
  expressionType?: string; // 演讲、作文、绘画等
}

export type EventSource = "reading" | "grades" | "records" | "weekly" | "goals" | "timeline" | "manual";

export interface GrowthEvent {
  id: string;
  student_id: string;

  // Core fields
  type: EventType;
  category: EventCategory;
  title: string;
  description: string;
  date: string;           // Event date
  year?: number;          // Year for grouping

  // Tags and categorization
  tags: EventTag[];

  // Attachments
  attachments: EventAttachment[];

  // Type-specific data
  metadata: EventMetadata;

  // Stats
  is_highlight: boolean;  // Featured in timeline
  is_milestone: boolean;  // Major milestone

  // Source tracking
  source: EventSource;     // Which module created this event

  // System fields
  created_at: string;
  updated_at: string;
}

// Event creation helper types
export interface CreateEventInput {
  student_id: string;
  type: EventType;
  category: EventCategory;
  title: string;
  description?: string;
  date: string;
  tags?: EventTag[];
  attachments?: EventAttachment[];
  metadata?: Partial<EventMetadata>;
  is_highlight?: boolean;
  is_milestone?: boolean;
  source?: EventSource;
}

// Event query filters
export interface EventFilters {
  types?: EventType[];
  categories?: EventCategory[];
  tags?: string[];
  year?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  is_highlight?: boolean;
  is_milestone?: boolean;
  source?: EventSource;
  sources?: EventSource[];
}

// =============================================
// Legacy Types (deprecated, use GrowthEvent)
// These are kept for backward compatibility
// =============================================

/** @deprecated Use GrowthEvent instead */
export interface Book {
  id: string;
  student_id: string;
  title: string;
  author: string;
  category: "文学" | "历史" | "科普" | "传记" | "其他";
  start_date: string;
  finish_date: string;
  rating: number;
  note: string;
  created_at: string;
  
  // Convert to GrowthEvent
  toEvent?: () => GrowthEvent;
}

/** @deprecated Use GrowthEvent instead */
export interface Exam {
  id: string;
  student_id: string;
  subject: string;
  score: number;
  ranking: number;
  exam_type: "月考" | "期中" | "期末" | "一模" | "二模";
  date: string;
  created_at: string;
  
  // Convert to GrowthEvent
  toEvent?: () => GrowthEvent;
}

/** @deprecated Use GrowthEvent instead */
export interface Project {
  id: string;
  student_id: string;
  title: string;
  description: string;
  start_date: string;
  status: string;
  files: string[];
  created_at: string;
  
  // Convert to GrowthEvent
  toEvent?: () => GrowthEvent;
}

/** @deprecated Use GrowthEvent instead */
export interface Honor {
  id: string;
  student_id: string;
  title: string;
  level: "校级" | "区级" | "市级";
  date: string;
  attachment: string;
  created_at: string;
  
  // Convert to GrowthEvent
  toEvent?: () => GrowthEvent;
}

/** @deprecated Use GrowthEvent instead */
export interface Goal {
  id: string;
  student_id: string;
  type: "长期" | "年度" | "季度" | "月" | "周";
  title: string;
  description: string;
  progress: number;
  start_date: string;
  end_date: string;
  status: "进行中" | "已完成" | "已过期";
  created_at: string;
  
  // Convert to GrowthEvent
  toEvent?: () => GrowthEvent;
}

// =============================================
// Indicator & Metrics
// =============================================

export interface Indicator {
  name: string;
  current: number;
  target: number;
  trend: "up" | "down" | "stable";
  status: "green" | "yellow" | "red";
}

export interface Metric {
  id: string;
  name: string;
  category: "数学" | "物理" | "英语" | "阅读" | "学习能力" | "项目";
  targetValue: number;
  currentValue: number;
  unit: string;
  status: "green" | "yellow" | "red";
  gap: number;
  suggestion: string;
}

export interface RadarData {
  subject: string;
  value: number;
  fullMark: number;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "数学" | "物理" | "英语" | "阅读" | "学习能力" | "项目";
  estimatedMinutes: number;
  reason: string;
}

export interface GrowthPrediction {
  onTrack: boolean;
  completionRate: number;
  riskFactors: string[];
  recommendations: string[];
}

// =============================================
// Student Profile & Goals
// =============================================

export interface StudentProfile {
  targetSchool: string;
  currentGrade: string;
  currentSchool: string;
  targetYear: number;
  daysRemaining: number;
}

export interface GoalNode {
  id: string;
  title: string;
  description: string;
  grade: string;
  type: "school" | "year" | "term" | "month" | "week";
  progress: number;
  status: "completed" | "in_progress" | "pending" | "at_risk";
  children?: GoalNode[];
  metrics?: Metric[];
  startDate?: string;
  endDate?: string;
}

export interface GoalTemplate {
  schoolName: string;
  schoolType: "四校" | "八校" | "市重点" | "区重点" | "国际";
  roadmap: YearGoal[];
}

export interface YearGoal {
  grade: string;
  yearNumber: number;
  goals: {
    academic: string[];
    reading: { target: number; description: string };
    projects: { target: number; description: string };
    growth: string[];
  };
  keyMetrics: {
    name: string;
    target: string;
    priority: "must" | "should" | "could";
  }[];
}

// =============================================
// Weekly Report
// =============================================

export interface WeeklyReport {
  weekNumber: number;
  completionRate: number;
  readingCount: number;
  englishHours: number;
  exerciseCount: number;
  gradeChanges: {
    subject: string;
    change: number;
  }[];
  riskWarnings: string[];
}

// =============================================
// Portfolio Builder Types
// =============================================

export type PortfolioTemplate = "simple" | "admission" | "showcase";

export interface PortfolioBasicInfo {
  name: string;
  gender: "男" | "女";
  birthday: string;
  school: string;
  grade: string;
  avatar?: string;
}

export interface PortfolioReadingStats {
  totalBooks: number;
  completedBooks: number;
  avgRating: number;
  topCategories: string[];
  favoriteBooks: Array<{
    title: string;
    author: string;
    rating: number;
  }>;
}

export interface PortfolioGradeTrend {
  subject: string;
  trend: "up" | "down" | "stable";
  latestScore: number;
  bestScore: number;
  examsCount: number;
}

export interface PortfolioHonor {
  title: string;
  level: "校级" | "区级" | "市级";
  date: string;
  category: string;
}

export interface PortfolioProject {
  title: string;
  description: string;
  role: string;
  achievements: string[];
  startDate: string;
}

export interface PortfolioTimelineEvent {
  date: string;
  title: string;
  description: string;
  category: "学业" | "阅读" | "荣誉" | "项目" | "其他";
}

export interface PortfolioWork {
  title: string;
  description: string;
  type: "论文" | "项目" | "读书笔记" | "作品集";
  date: string;
}

export interface PortfolioData {
  basicInfo: PortfolioBasicInfo;
  targetSchool: string;
  readingStats: PortfolioReadingStats;
  gradeTrends: PortfolioGradeTrend[];
  honors: PortfolioHonor[];
  projects: PortfolioProject[];
  timeline: PortfolioTimelineEvent[];
  representativeWorks: PortfolioWork[];
  generatedAt: string;
}

// =============================================
// Roadmap & Milestones
// =============================================

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  grade: string;
  targetDate?: string;
  status: "completed" | "in_progress" | "pending";
  progress: number;
  isMajor: boolean; // Major milestones shown on roadmap
}

export interface Roadmap {
  targetSchool: string;
  schoolType: "四校" | "八校" | "市重点" | "区重点" | "国际";
  milestones: RoadmapMilestone[];
  currentPosition: {
    grade: string;
    milestoneId: string;
    progress: number;
  };
}
