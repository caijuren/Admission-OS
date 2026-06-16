import { GoalTemplate, Metric, GoalNode, RadarData, ActionItem, GrowthPrediction, StudentProfile } from "@/types";

// 交附嘉分路线模板
export const jiaojiaRoute: GoalTemplate = {
  schoolName: "交附嘉分",
  schoolType: "四校",
  roadmap: [
    {
      grade: "六年级",
      yearNumber: 1,
      goals: {
        academic: ["完成六年级数学体系", "保持英语优势", "建立物理兴趣"],
        reading: { target: 20, description: "完成20本课外阅读" },
        projects: { target: 0, description: "开始探索兴趣方向" },
        growth: ["建立成长档案", "养成良好学习习惯", "每周1次表达训练"]
      },
      keyMetrics: [
        { name: "数学基础", target: "掌握六年级全部内容", priority: "must" },
        { name: "英语听说读写", target: "保持班级前列", priority: "must" },
        { name: "阅读量", target: "20本/年", priority: "should" },
        { name: "表达力", target: "每周1次演讲/口述", priority: "could" }
      ]
    },
    {
      grade: "七年级",
      yearNumber: 2,
      goals: {
        academic: ["年级前30%", "争取前20%", "建立学科优势"],
        reading: { target: 30, description: "累计50本" },
        projects: { target: 1, description: "开始第一个项目" },
        growth: ["自主学习能力提升", "时间管理能力", "建立错题本"]
      },
      keyMetrics: [
        { name: "年级排名", target: "前30%", priority: "must" },
        { name: "数学", target: "稳定在90+", priority: "must" },
        { name: "英语", target: "稳定在90+", priority: "must" },
        { name: "阅读量", target: "30本/年", priority: "should" },
        { name: "项目经验", target: "完成1个", priority: "should" }
      ]
    },
    {
      grade: "八年级",
      yearNumber: 3,
      goals: {
        academic: ["年级前20%", "争取前10%", "物理形成优势"],
        reading: { target: 30, description: "累计80本" },
        projects: { target: 1, description: "完成一个完整项目" },
        growth: ["竞赛初步尝试", "综合能力提升", "自招准备启动"]
      },
      keyMetrics: [
        { name: "年级排名", target: "前20%", priority: "must" },
        { name: "物理", target: "成为优势学科", priority: "must" },
        { name: "数学", target: "竞赛获证", priority: "should" },
        { name: "阅读量", target: "30本/年", priority: "should" },
        { name: "项目", target: "完成1个", priority: "should" }
      ]
    },
    {
      grade: "九年级",
      yearNumber: 4,
      goals: {
        academic: ["年级前10%", "争取前5%", "一模区前10%", "二模区前10%"],
        reading: { target: 20, description: "累计100本" },
        projects: { target: 1, description: "完善自招材料" },
        growth: ["自招准备完成", "中考稳定发挥", "综合评价材料"]
      },
      keyMetrics: [
        { name: "一模成绩", target: "区前10%", priority: "must" },
        { name: "二模成绩", target: "区前10%", priority: "must" },
        { name: "自招材料", target: "完成", priority: "must" },
        { name: "年级排名", target: "前10%", priority: "should" }
      ]
    }
  ]
};

// 计算距离目标日期的天数
export function calculateDaysRemaining(targetYear: number): number {
  const now = new Date();
  const targetDate = new Date(targetYear, 5, 15); // 中考通常在6月15日左右
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 获取当前年级对应的目标数据
export function getGradeYearGoals(currentGrade: string, template: GoalTemplate): GoalNode[] {
  const gradeMap: Record<string, number> = {
    "五升六": 0,
    "六年级": 0,
    "六升七": 1,
    "七年级": 1,
    "七升八": 2,
    "八年级": 2,
    "八升九": 3,
    "九年级": 3
  };

  const currentIndex = gradeMap[currentGrade] ?? 0;

  return template.roadmap.map((yearGoal, index) => ({
    id: `year-${yearGoal.yearNumber}`,
    title: `${yearGoal.grade}目标`,
    description: `进入${template.schoolName}的${yearGoal.grade}阶段目标`,
    grade: yearGoal.grade,
    type: "year" as const,
    progress: index < currentIndex ? 100 : index === currentIndex ? 45 : 0,
    status: index < currentIndex ? "completed" : index === currentIndex ? "in_progress" : "pending",
    children: generateTermGoals(yearGoal, index, currentIndex),
    metrics: generateMetrics(yearGoal),
    startDate: getStartDate(yearGoal.grade),
    endDate: getEndDate(yearGoal.grade)
  }));
}

// 生成学期目标
function generateTermGoals(yearGoal: { grade: string; goals: { academic: string[]; reading: { target: number; description: string }; projects: { target: number; description: string }; growth: string[] } }, yearIndex: number, currentYearIndex: number): GoalNode[] {
  const terms = ["上学期", "下学期"];
  return terms.map((term, termIndex) => ({
    id: `term-${yearIndex}-${termIndex}`,
    title: `${yearGoal.grade}${term}`,
    description: termIndex === 0 ? yearGoal.goals.academic.slice(0, 2).join("、") : yearGoal.goals.academic.slice(2).join("、") || yearGoal.goals.academic[0],
    grade: yearGoal.grade,
    type: "term" as const,
    progress: yearIndex < currentYearIndex ? 100 : yearIndex === currentYearIndex && termIndex === 0 ? 70 : 0,
    status: yearIndex < currentYearIndex ? "completed" : yearIndex === currentYearIndex && termIndex === 0 ? "in_progress" : "pending"
  }));
}

// 生成指标数据
function generateMetrics(yearGoal: { keyMetrics: { name: string; target: string; priority: "must" | "should" | "could" }[] }): Metric[] {
  return yearGoal.keyMetrics.map((metric, index) => {
    const categoryMap: Record<string, "数学" | "物理" | "英语" | "阅读" | "学习能力" | "项目"> = {
      "数学基础": "数学",
      "数学": "数学",
      "物理": "物理",
      "英语听说读写": "英语",
      "英语": "英语",
      "阅读量": "阅读",
      "表达能力": "学习能力",
      "表达力": "学习能力",
      "年级排名": "学习能力",
      "项目经验": "项目",
      "自主学习能力": "学习能力"
    };

    const category = categoryMap[metric.name] || "学习能力";
    const currentValue = metric.priority === "must" ? 60 + Math.random() * 25 : 50 + Math.random() * 30;
    const targetValue = 100;
    const gap = targetValue - currentValue;

    return {
      id: `metric-${index}`,
      name: metric.name,
      category,
      targetValue,
      currentValue: Math.round(currentValue),
      unit: category === "阅读" || category === "项目" ? "项" : "分",
      status: currentValue >= 80 ? "green" : currentValue >= 60 ? "yellow" : "red",
      gap: Math.round(gap),
      suggestion: generateSuggestion(category, gap, metric.priority)
    };
  });
}

// 生成建议
function generateSuggestion(category: string, gap: number, priority: string): string {
  if (gap < 10) return "继续保持，当前状态良好";
  if (priority === "must") {
    return `需要重点加强${category}，建议每天增加30分钟针对性练习`;
  }
  return `可适当增加${category}的学习时间`;
}

// 获取开始日期
function getStartDate(grade: string): string {
  const year = new Date().getFullYear();
  const gradeStartMap: Record<string, string> = {
    "六年级": `${year - 3}-09-01`,
    "七年级": `${year - 2}-09-01`,
    "八年级": `${year - 1}-09-01`,
    "九年级": `${year}-09-01`
  };
  return gradeStartMap[grade] || `${year - 3}-09-01`;
}

// 获取结束日期
function getEndDate(grade: string): string {
  const year = new Date().getFullYear();
  const gradeEndMap: Record<string, string> = {
    "六年级": `${year - 2}-06-30`,
    "七年级": `${year - 1}-06-30`,
    "八年级": `${year}-06-30`,
    "九年级": `${year + 1}-06-15`
  };
  return gradeEndMap[grade] || `${year - 2}-06-30`;
}

// 生成雷达图数据
export function generateRadarData(metrics: Metric[]): RadarData[] {
  const categoryMap: Record<string, { value: number; fullMark: number }> = {
    "数学": { value: 78, fullMark: 100 },
    "物理": { value: 65, fullMark: 100 },
    "英语": { value: 82, fullMark: 100 },
    "阅读": { value: 55, fullMark: 100 },
    "学习能力": { value: 75, fullMark: 100 },
    "项目": { value: 30, fullMark: 100 }
  };

  metrics.forEach(m => {
    if (categoryMap[m.category]) {
      categoryMap[m.category].value = m.currentValue;
    }
  });

  return Object.entries(categoryMap).map(([subject, data]) => ({
    subject,
    value: data.value,
    fullMark: data.fullMark
  }));
}

// 生成行动建议
export function generateActionRecommendations(profile: StudentProfile, metrics: Metric[]): ActionItem[] {
  const recommendations: ActionItem[] = [];

  // 按优先级排序指标
  const sortedMetrics = [...metrics].sort((a, b) => {
    if (a.status === "red" && b.status !== "red") return -1;
    if (a.status === "yellow" && b.status === "green") return -1;
    return 0;
  });

  // 生成高优先级行动
  sortedMetrics.slice(0, 3).forEach((metric, index) => {
    const timeMap: Record<string, number> = {
      "数学": 40,
      "物理": 40,
      "英语": 30,
      "阅读": 30,
      "学习能力": 20,
      "项目": 60
    };

    recommendations.push({
      id: `action-${index}`,
      title: `${metric.category}${metric.name}提升计划`,
      description: `当前${metric.name}完成度${metric.currentValue}%，目标${metric.targetValue}%`,
      priority: metric.status === "red" ? "high" : metric.status === "yellow" ? "medium" : "low",
      category: metric.category,
      estimatedMinutes: timeMap[metric.category] || 30,
      reason: metric.suggestion
    });
  });

  return recommendations;
}

// 生成成长预测
export function generateGrowthPrediction(profile: StudentProfile, metrics: Metric[]): GrowthPrediction {
  const avgProgress = metrics.reduce((sum, m) => sum + (m.currentValue / m.targetValue) * 100, 0) / metrics.length;
  const redMetrics = metrics.filter(m => m.status === "red");
  const yellowMetrics = metrics.filter(m => m.status === "yellow");

  const riskFactors: string[] = [];
  if (redMetrics.length > 0) {
    riskFactors.push(`${redMetrics.map(m => m.name).join("、")}落后较多`);
  }
  if (yellowMetrics.length > 1) {
    riskFactors.push("多项指标需要关注");
  }
  if (profile.daysRemaining < 365) {
    riskFactors.push("距离中考时间不足一年");
  }

  return {
    onTrack: avgProgress >= 60 && redMetrics.length === 0,
    completionRate: Math.round(avgProgress),
    riskFactors,
    recommendations: riskFactors.length > 0
      ? ["建议增加每日学习时间", "重点突破薄弱科目", "保持优势科目稳定"]
      : ["继续保持当前节奏", "注意各科目均衡发展"]
  };
}

// 生成学生档案
export function generateStudentProfile(targetSchool: string, currentGrade: string, currentSchool: string): StudentProfile {
  const gradeYearMap: Record<string, number> = {
    "五升六": 2031,
    "六年级": 2030,
    "六升七": 2030,
    "七年级": 2029,
    "七升八": 2029,
    "八年级": 2028,
    "八升九": 2028,
    "九年级": 2027
  };

  const targetYear = gradeYearMap[currentGrade] || 2030;

  return {
    targetSchool,
    currentGrade,
    currentSchool,
    targetYear,
    daysRemaining: calculateDaysRemaining(targetYear)
  };
}

// 计算总体完成度
export function calculateOverallProgress(goalTree: GoalNode[]): number {
  const completedWeight = goalTree.reduce((sum, node) => {
    if (node.status === "completed") return sum + 1;
    if (node.status === "in_progress") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((completedWeight / goalTree.length) * 100);
}
