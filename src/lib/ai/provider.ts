/**
 * Mock AI Provider
 * 本地模拟实现，用于开发阶段
 * 未来可替换为真实API调用
 */

import type {
  AIProvider,
  GenerateWeeklyReportInput,
  GenerateWeeklyReportOutput,
  GeneratePortfolioInput,
  GeneratePortfolioOutput,
  AnalyzeProgressInput,
  AnalyzeProgressOutput,
  GenerateRoadmapInput,
  GenerateRoadmapOutput,
} from "./types";

export class MockAIProvider implements AIProvider {
  async generateWeeklyReport(input: GenerateWeeklyReportInput): Promise<GenerateWeeklyReportOutput> {
    // 模拟AI生成
    return {
      summary: `本周是第${input.weekNumber}周，学习状态总体良好。完成了${input.tasks.filter(t => t.status === "completed").length}项任务，阅读量达到${input.readingCount}本。`,
      highlights: [
        "数学函数专题复习完成度达到80%",
        "英语RAZ阅读持续稳定推进",
        "保持了良好的学习节奏",
      ],
      riskWarnings: input.gradeChanges.some(g => g.change < -5)
        ? ["部分科目成绩有所下滑，建议重点关注"]
        : [],
      nextWeekRecommendations: [
        "继续保持数学每日练习习惯",
        "加强英语听力训练",
        "适当增加户外运动时间",
      ],
    };
  }

  async generatePortfolio(input: GeneratePortfolioInput): Promise<GeneratePortfolioOutput> {
    return {
      introduction: `${input.studentName}是一位全面发展、目标明确的学生，始终以进入${input.targetSchool}为目标而努力。`,
      academicStrengths: [
        "数学思维能力强，逻辑推理清晰",
        "英语能力突出，阅读理解优秀",
        "具有良好的学习习惯和自律性",
      ],
      extracurricularHighlights: [
        `已完成${input.readingStats.totalBooks}本各类书籍的阅读`,
        "参与多个科技创新项目，展现创新思维",
        "获得多项校级、区级荣誉",
      ],
      growthNarrative: "从五年级到现在的两年多时间里，通过持续努力和各学科的均衡发展，展现出了巨大的成长潜力。",
      futureAspiration: `以进入${input.targetSchool}为契机，继续在学术和个人发展上追求卓越。`,
    };
  }

  async analyzeProgress(input: AnalyzeProgressInput): Promise<AnalyzeProgressOutput> {
    const completionRate = input.currentMetrics.reduce((acc, m) => acc + (m.currentValue / m.targetValue) * 100, 0) / input.currentMetrics.length;
    
    return {
      onTrack: completionRate >= 60,
      completionRate: Math.round(completionRate),
      riskLevel: completionRate >= 70 ? "low" : completionRate >= 50 ? "medium" : "high",
      riskFactors: completionRate < 70 ? ["部分指标落后于计划"] : [],
      recommendations: [
        "保持当前学习节奏",
        "针对薄弱科目加强练习",
        "继续拓展阅读广度",
      ],
    };
  }

  async generateRoadmap(input: GenerateRoadmapInput): Promise<GenerateRoadmapOutput> {
    return {
      milestones: [
        {
          title: "夯实基础",
          description: "六升七暑假完成初中数学预科",
          targetDate: "2026-08",
          keyMetrics: ["数学基础", "英语词汇"],
        },
        {
          title: "稳步提升",
          description: "七年级达到年级前30%",
          targetDate: "2027-06",
          keyMetrics: ["综合排名", "单科成绩"],
        },
        {
          title: "冲刺阶段",
          description: "八年级进入年级前10%",
          targetDate: "2028-06",
          keyMetrics: ["综合排名", "竞赛成绩"],
        },
        {
          title: "目标达成",
          description: `成功考入${input.targetSchool}`,
          targetDate: "2029-07",
          keyMetrics: ["中考成绩", "综合素质"],
        },
      ],
      actionPlan: [
        {
          category: "数学",
          actions: ["每日一题", "专题突破", "竞赛训练"],
          priority: 1,
        },
        {
          category: "英语",
          actions: ["词汇积累", "阅读训练", "听力练习"],
          priority: 2,
        },
        {
          category: "阅读",
          actions: ["每日阅读30分钟", "写读书笔记"],
          priority: 3,
        },
      ],
    };
  }
}

// Factory function
export function createAIProvider(): AIProvider {
  // 未来可根据配置切换不同provider
  return new MockAIProvider();
}
