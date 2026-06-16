"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calculator,
  BookOpen,
  Sparkles,
  TrendingUp,
  BarChart3,
  Brain,
  Atom,
  Lightbulb,
  GraduationCap,
  TreePine,
  ArrowUp,
  Target,
  Star,
  ChevronDown,
  Award,
  Crown,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { growthService } from "@/services";
import type { GrowthEvent } from "@/types";
import { STUDENT_ID, getAbilityScores, getAssetStats } from "@/lib/product-data";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const skillCategories = [
  {
    id: "math",
    name: "数学",
    icon: Calculator,
    color: "primary" as const,
    xpColor: "bg-[#5B6BF5]",
    xpBg: "bg-[#EEF2FF]",
    xpText: "text-[#5B6BF5]",
    subSkills: ["代数", "几何", "概率统计", "函数"],
  },
  {
    id: "english",
    name: "英语",
    icon: BookOpen,
    color: "green" as const,
    xpColor: "bg-[#4CD7A4]",
    xpBg: "bg-[#ECFDF5]",
    xpText: "text-[#4CD7A4]",
    subSkills: ["阅读", "听力", "写作", "口语"],
  },
  {
    id: "reading",
    name: "阅读",
    icon: BookOpen,
    color: "orange" as const,
    xpColor: "bg-[#FFB347]",
    xpBg: "bg-[#FFF7ED]",
    xpText: "text-[#FFB347]",
    subSkills: ["文学经典", "科普读物", "历史人文", "阅读理解"],
  },
  {
    id: "learning",
    name: "学习力",
    icon: Brain,
    color: "purple" as const,
    xpColor: "bg-[#8B5CF6]",
    xpBg: "bg-[#F5F3FF]",
    xpText: "text-[#8B5CF6]",
    subSkills: ["专注力", "记忆力", "逻辑思维", "时间管理"],
  },
  {
    id: "physics",
    name: "物理",
    icon: Atom,
    color: "slate" as const,
    xpColor: "bg-[#64748B]",
    xpBg: "bg-[#F8FAFC]",
    xpText: "text-[#64748B]",
    subSkills: ["力学", "电学", "光学", "实验"],
  },
];

export default function SkillTreePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "trend" | "analysis">("overview");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [events, setEvents] = useState<GrowthEvent[]>([]);
  const [assetOpen, setAssetOpen] = useState(false);
  const [assetType, setAssetType] = useState<"honor" | "project">("honor");

  const loadEvents = () => {
    growthService.getEvents().then(setEvents);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const assetStats = useMemo(() => getAssetStats(events), [events]);
  const abilityScores = useMemo(() => getAbilityScores(events), [events]);
  const dynamicSkills = skillCategories.map((skill) => ({
    ...skill,
    progress: abilityScores.find((score) => score.name === skill.name)?.value || 0,
  }));
  const skillsWithDetails = dynamicSkills.map((skill) => ({
    ...skill,
    level: `Lv.${Math.floor(skill.progress / 10)}`,
    exp: `${skill.progress * 10}/1000`,
    subSkills: skill.subSkills.map((name) => ({ name, score: skill.progress })),
  }));
  const hasTrendData = events.some((event) => event.type === "exam" || event.type === "reading" || event.type === "project" || event.type === "honor");
  const growthTrend = hasTrendData
    ? Array.from({ length: 6 }).map((_, index) => {
        const month = `${index + 1}月`;
        return {
          month,
          math: index === 5 ? dynamicSkills.find((skill) => skill.id === "math")?.progress || 0 : 0,
          english: index === 5 ? dynamicSkills.find((skill) => skill.id === "english")?.progress || 0 : 0,
          reading: index === 5 ? dynamicSkills.find((skill) => skill.id === "reading")?.progress || 0 : 0,
          learning: index === 5 ? dynamicSkills.find((skill) => skill.id === "learning")?.progress || 0 : 0,
        };
      })
    : [];
  const admissionDimensions = [
    ["数学上限", skillsWithDetails.find((skill) => skill.id === "math")?.progress || 0, "决定自招上限"],
    ["英语能力", skillsWithDetails.find((skill) => skill.id === "english")?.progress || 0, "支撑材料与面试"],
    ["语文表达", skillsWithDetails.find((skill) => skill.id === "reading")?.progress || 0, "决定理解与表达底座"],
    ["学习能力", skillsWithDetails.find((skill) => skill.id === "learning")?.progress || 0, "决定长期执行稳定性"],
    ["理科潜力", skillsWithDetails.find((skill) => skill.id === "physics")?.progress || 0, "支撑理科分层"],
  ];

  async function handleAssetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (assetType === "honor") {
      await growthService.addHonorEvent({
        student_id: STUDENT_ID,
        title: String(form.get("title") || "未命名荣誉"),
        level: String(form.get("level") || "校级") as "校级" | "区级" | "市级" | "省级" | "国家级",
        date: String(form.get("date") || new Date().toISOString().slice(0, 7)),
        description: String(form.get("description") || ""),
      });
    } else {
      await growthService.addProjectEvent({
        student_id: STUDENT_ID,
        title: String(form.get("title") || "未命名项目"),
        description: String(form.get("description") || ""),
        role: String(form.get("role") || "参与者"),
        achievements: String(form.get("achievements") || "")
          .split(/\n|,|，|、/)
          .map((item) => item.trim())
          .filter(Boolean),
        startDate: String(form.get("date") || new Date().toISOString().slice(0, 7)),
      });
    }

    setAssetOpen(false);
    loadEvents();
  }

  return (
    <div className="design-page-shell">
      <section className="page-toolbar">
        <div>
          <h1>能力资产</h1>
          <span>证据 {events.length} 条 · 荣誉 {assetStats.honors} 项 · 项目 {assetStats.projects} 个</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="primary-action" onClick={() => { setAssetType("honor"); setAssetOpen(true); }}>
            <Plus className="w-4 h-4" />
            新增荣誉
          </button>
          <button className="secondary-action" onClick={() => { setAssetType("project"); setAssetOpen(true); }}>
            <Plus className="w-4 h-4" />
            新增项目
          </button>
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-[#F1F5F9] shadow-sm">
            {[
              { id: "overview" as const, label: "能力总览" },
              { id: "trend" as const, label: hasTrendData ? "发展趋势" : "趋势待补" },
              { id: "analysis" as const, label: events.length ? "差距分析" : "差距待补" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-xs font-medium rounded-lg transition-all",
                  activeTab === tab.id
                    ? "bg-[#5B6BF5] text-white shadow-sm"
                    : "text-[#6B7280] hover:bg-slate-50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="metric-grid">
        {[
          ["荣誉资产", assetStats.honors, "text-[#FFB347]"],
          ["项目成果", assetStats.projects, "text-[#8B5CF6]"],
          ["目标节点", assetStats.goals, "text-[#5B6BF5]"],
          ["升学证据", assetStats.highlights, "text-[#4CD7A4]"],
        ].map(([label, value, color]) => (
          <article key={label as string} className="metric-card">
            <div className="metric-head"><Sparkles className={cn("h-4 w-4", color as string)} /><span>{label as string}</span></div>
            <strong className={color as string}>{String(value)}</strong>
          </article>
        ))}
      </section>

      {activeTab === "overview" && (
      <>
      {events.length === 0 && (
        <section className="action-empty-panel">
          <strong>能力资产还没有证据</strong>
          <span>先补一条成绩、阅读、项目或荣誉记录，系统才会开始判断学科能力、项目成果和自招差距。</span>
        </section>
      )}

      <section className="admission-dimension-grid">
        {admissionDimensions.map(([name, value, desc]) => (
          <article key={name as string} className="admission-dimension-card">
            <div>
              <strong>{name as string}</strong>
              <span>{desc as string}</span>
            </div>
            <b>{String(value)}</b>
            <div className="line-meter"><i style={{ width: `${Number(value)}%` }} /></div>
          </article>
        ))}
      </section>

      {/* Skill Tree Illustration */}
      <Card className="card-glow overflow-hidden subtle-section">
        <CardContent className="p-0">
          <div className="skill-tree-reference-panel">
            <div className="skill-tree-visual">
              <div className="skill-root">
                <strong>学习力</strong>
                <span>{skillsWithDetails.find((skill) => skill.id === "learning")?.progress || 0}</span>
              </div>
              <div className="skill-trunk" />
              <div className="skill-branch-grid">
                {skillsWithDetails.slice(0, 4).map((skill) => (
                  <div key={skill.id} className="skill-branch">
                    <div className={cn("skill-branch-head", skill.xpText)}>
                      <strong>{skill.name}</strong>
                      <span>{skill.progress}</span>
                    </div>
                    <div className="skill-leaves">
                      {skill.subSkills.slice(0, 3).map((sub) => (
                        <div key={sub.name} className="skill-leaf">
                          <span>{sub.name}</span>
                          <em>{sub.score}</em>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skillsWithDetails.map((skill) => {
          const Icon = skill.icon;
          const isExpanded = expandedSkill === skill.id;

          return (
            <Card
              key={skill.id}
              className={cn(
                "card-glow overflow-hidden cursor-pointer transition-all duration-300",
                isExpanded && "ring-2 ring-[#5B6BF5]/20"
              )}
              onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", skill.xpBg)}>
                      <Icon className={cn("w-4 h-4", skill.xpText)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{skill.name}</p>
                      <p className="text-[10px] text-[#94A3B8]">{skill.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-lg font-bold", skill.xpText)}>{skill.progress}</span>
                    <span className="text-[10px] text-[#94A3B8]">/100</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", skill.xpColor)}
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>

                {/* XP bar */}
                <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-3">
                  <span>EXP</span>
                  <span>{skill.exp}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", skill.xpColor)}
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>

                {/* Expanded sub-skills */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#F1F5F9] space-y-2 animate-fade-in">
                    {skill.subSkills.map((sub) => (
                      <div key={sub.name} className="flex items-center gap-2">
                        <span className="text-[11px] text-[#6B7280] w-16">{sub.name}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", skill.xpColor)}
                            style={{ width: `${sub.score}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-600 w-7 text-right">
                          {sub.score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      </>
      )}

      {activeTab === "trend" && (
      <Card className="card-glow">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-[#4CD7A4]" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-800">能力发展趋势</h2>
          </div>

          {growthTrend.length ? (
          <div className="relative h-48">
            {/* Y axis labels */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-[#94A3B8]">
              <span>100</span>
              <span>80</span>
              <span>60</span>
              <span>40</span>
              <span>20</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-8 h-full flex items-end gap-2">
              {growthTrend.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-0.5 h-40">
                    <div className="flex-1 bg-[#5B6BF5] rounded-t-sm" style={{ height: `${data.math}%` }} />
                    <div className="flex-1 bg-[#4CD7A4] rounded-t-sm" style={{ height: `${data.english}%` }} />
                    <div className="flex-1 bg-[#FFB347] rounded-t-sm" style={{ height: `${data.reading}%` }} />
                    <div className="flex-1 bg-[#8B5CF6] rounded-t-sm" style={{ height: `${data.learning}%` }} />
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">{data.month}</span>
                </div>
              ))}
            </div>
          </div>
          ) : (
            <div className="goal-empty-state">当前还没有可形成趋势的真实成绩、阅读、项目或荣誉数据。</div>
          )}

          {/* Legend */}
          {growthTrend.length > 0 && <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#F1F5F9]">
            {[
              { color: "bg-[#5B6BF5]", label: "数学" },
              { color: "bg-[#4CD7A4]", label: "英语" },
              { color: "bg-[#FFB347]", label: "阅读" },
              { color: "bg-[#8B5CF6]", label: "学习力" },
            ].map((leg) => (
              <div key={leg.label} className="flex items-center gap-1.5">
                <div className={cn("w-3 h-3 rounded", leg.color)} />
                <span className="text-[11px] text-[#6B7280]">{leg.label}</span>
              </div>
            ))}
          </div>}
        </CardContent>
      </Card>
      )}

      {activeTab === "analysis" && (
        <section className="data-panel">
          <div className="data-panel-inner">
            <div className="panel-title-row">
              <div>
                <h2>交附嘉分自招差距分析</h2>
                <p>先把没有证据、没有成绩、没有项目沉淀的地方找出来。</p>
              </div>
            </div>
            <div className="gap-analysis-list">
              {[
                ["校内成绩", assetStats.goals ? "已有目标记录，但成绩样本仍需持续补充" : "还需要记录校内考试成绩，判断稳定区间"],
                ["数学上限", "需要用专题、错题和竞赛型题目证明上限"],
                ["英语能力", "需要沉淀 PET/FCE、原版阅读、听说输出证据"],
                ["语文表达", "需要阅读理解、写作和口述表达材料支撑"],
                ["项目荣誉", assetStats.honors + assetStats.projects ? "已有部分证据，继续补完整过程材料" : "当前项目/荣誉证据不足，申请材料支撑偏弱"],
              ].map(([title, text]) => (
                <div key={title} className="gap-analysis-row">
                  <AlertTriangle className="h-4 w-4 text-[#E68A00]" />
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Dialog open={assetOpen} onOpenChange={setAssetOpen}>
        <DialogContent className="app-dialog">
          <DialogHeader>
            <DialogTitle>{assetType === "honor" ? "新增荣誉证据" : "新增项目证据"}</DialogTitle>
            <DialogDescription>
              保存后会进入成长档案、能力资产和申请材料，用来支撑自招材料表达。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssetSubmit} className="app-form">
            <label className="form-field">
              <span>{assetType === "honor" ? "荣誉名称" : "项目名称"}</span>
              <Input name="title" placeholder={assetType === "honor" ? "例如 区级数学活动一等奖" : "例如 英语阅读展示项目"} required />
            </label>
            <div className="form-grid two">
              <label className="form-field">
                <span>日期</span>
                <Input name="date" type="month" defaultValue={new Date().toISOString().slice(0, 7)} />
              </label>
              {assetType === "honor" ? (
                <label className="form-field">
                  <span>级别</span>
                  <select name="level" defaultValue="区级">
                    <option>校级</option>
                    <option>区级</option>
                    <option>市级</option>
                    <option>省级</option>
                    <option>国家级</option>
                  </select>
                </label>
              ) : (
                <label className="form-field">
                  <span>角色</span>
                  <Input name="role" placeholder="例如 负责人 / 主讲 / 参与者" />
                </label>
              )}
            </div>
            <label className="form-field">
              <span>{assetType === "honor" ? "证据说明" : "项目说明"}</span>
              <textarea name="description" placeholder="补充背景、过程和可展示成果" />
            </label>
            {assetType === "project" && (
              <label className="form-field">
                <span>阶段成果</span>
                <textarea name="achievements" placeholder="一行一个，例如：完成展示稿 / 形成作品链接 / 获得老师反馈" />
              </label>
            )}
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setAssetOpen(false)}>取消</Button>
              <Button type="submit">保存证据</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
