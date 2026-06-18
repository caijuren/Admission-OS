"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  GraduationCap,
  Plus,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { growthService } from "@/services";
import type { GrowthEvent } from "@/types";
import { STUDENT_ID, formatMonth, getGradeStats } from "@/lib/product-data";

const subjectColors: Record<string, string> = {
  数学: "bg-[#2F7DD3]",
  英语: "bg-[#23B87A]",
  语文: "bg-[#FFB347]",
  物理: "bg-[#8FDDBE]",
  综合: "bg-[#64748B]",
};

export default function GradesPage() {
  const [events, setEvents] = useState<GrowthEvent[]>([]);
  const [open, setOpen] = useState(false);

  const loadEvents = () => {
    growthService.getGradeEvents().then(setEvents);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const stats = useMemo(() => getGradeStats(events), [events]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await growthService.addGradeEvent({
      student_id: STUDENT_ID,
      subject: String(form.get("subject") || "综合"),
      score: Number(form.get("score") || 0),
      ranking: Number(form.get("ranking") || 0),
      examType: String(form.get("examType") || "期末") as "月考" | "期中" | "期末" | "一模" | "二模",
      date: String(form.get("date") || "2026-06"),
      totalStudents: Number(form.get("totalStudents") || 0) || undefined,
      isHighlight: form.get("isHighlight") === "on",
    });
    setOpen(false);
    loadEvents();
  };

  return (
    <div className="design-page-shell">
      <section className="page-toolbar">
        <div>
          <h1>校内成绩</h1>
          <span>平均分 {stats.averageScore} · {events.length} 条记录</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="primary-action">
              <Plus className="w-4 h-4" />
              记录成绩
            </button>
          </DialogTrigger>
          <DialogContent className="app-dialog">
            <DialogHeader>
              <DialogTitle>新增成绩记录</DialogTitle>
              <DialogDescription>用于判断校内稳定区间和交附嘉分目标差距。排名可选，但建议填写。</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="app-form">
              <div className="form-grid two">
                <label className="form-field"><span>科目</span><Input name="subject" placeholder="数学" defaultValue="数学" /></label>
                <label className="form-field"><span>考试类型</span><Input name="examType" placeholder="期末" defaultValue="期末" /></label>
              </div>
              <div className="form-grid three">
                <label className="form-field"><span>分数</span><Input name="score" type="number" placeholder="例如 95" required /></label>
                <label className="form-field"><span>排名</span><Input name="ranking" type="number" placeholder="可选" /></label>
                <label className="form-field"><span>总人数</span><Input name="totalStudents" type="number" placeholder="可选" /></label>
              </div>
              <label className="form-field"><span>考试月份</span><Input name="date" type="month" defaultValue="2026-06" /></label>
              <label className="form-check">
                <input name="isHighlight" type="checkbox" />
                纳入自招证据
              </label>
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>取消</Button>
                <Button type="submit" className="bg-[#23B87A] hover:bg-[#1FA36C]">保存到成长档案</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </section>

      <section className="metric-grid">
        {[
          [GraduationCap, "最新分数", `${stats.latestScore}`, "分", "text-[#2F7DD3]"],
          [TrendingUp, "平均分", `${stats.averageScore}`, "分", "text-[#23B87A]"],
          [Trophy, "最高", `${stats.bestScore}`, "分", "text-[#FFB347]"],
          [BarChart3, "最佳排名", stats.bestRanking ? `${stats.bestRanking}` : "-", "/年级", "text-[#E68A00]"],
        ].map(([Icon, label, value, unit, color]) => {
          const TypedIcon = Icon as typeof GraduationCap;
          return (
            <article key={label as string} className="metric-card">
              <div className="metric-head">
                <TypedIcon className={cn("w-4 h-4", color as string)} />
                <span>{label as string}</span>
              </div>
              <strong className={color as string}>
                {value as string}<span>{unit as string}</span>
              </strong>
            </article>
          );
        })}
      </section>

      <section className="data-panel">
        <div className="data-panel-inner">
          <div className="panel-title-row">
            <div>
              <h2>校内成绩账本</h2>
              <p>按科目与考试类型追踪表现，保留校内稳定性和学业竞争力证据。</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full refined-table">
              <thead>
                <tr className="border-b border-[#F1F5F9]">
                  {["科目", "分数", "考试", "排名", "日期", ""].map((head) => (
                    <th key={head} className="text-left text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider py-3 px-5">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const subject = event.metadata.subject || "综合";
                  return (
                    <tr key={event.id} className="border-b border-[#F1F5F9] hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", subjectColors[subject] || subjectColors["综合"])} />
                          <span className="text-[13px] font-medium text-slate-700">{subject}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-[13px] font-bold text-slate-700">{event.metadata.score || 0}</td>
                      <td className="py-4 px-5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAFBF4] text-[#16724D]">
                          {event.metadata.examType || "考试"}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-[12px] text-[#6B7280]">
                        {event.metadata.ranking ? `第${event.metadata.ranking}名` : "-"}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[#94A3B8]" />
                          <span className="text-[12px] text-[#6B7280]">{formatMonth(event.date)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className="evidence-status-pill">{event.is_highlight ? "证据" : "已入账"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {events.length === 0 && (
              <div className="empty-state-panel m-4">
                <GraduationCap className="h-8 w-8" />
                <strong>缺少校内成绩样本</strong>
                <span>先录入一次校内考试，驾驶舱才能判断自招成绩基础和名额到校稳定性。</span>
                <button className="empty-action-button" onClick={() => setOpen(true)}>记录第一次成绩</button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
