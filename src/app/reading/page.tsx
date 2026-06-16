"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Star,
  TrendingUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { growthService } from "@/services";
import type { GrowthEvent } from "@/types";
import { STUDENT_ID, formatMonth, getReadingStats } from "@/lib/product-data";

const covers = ["bg-[#FFB347]", "bg-[#5B6BF5]", "bg-[#4CD7A4]", "bg-[#8B5CF6]", "bg-[#64748B]"];

export default function ReadingPage() {
  const [events, setEvents] = useState<GrowthEvent[]>([]);
  const [open, setOpen] = useState(false);

  const loadEvents = () => {
    growthService.getReadingEvents().then(setEvents);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const stats = useMemo(() => getReadingStats(events), [events]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await growthService.addReadingEvent({
      student_id: STUDENT_ID,
      bookTitle: String(form.get("bookTitle") || "未命名书籍"),
      bookAuthor: String(form.get("bookAuthor") || "未知作者"),
      bookCategory: String(form.get("bookCategory") || "阅读"),
      rating: Number(form.get("rating") || 5),
      date: String(form.get("date") || "2026-06"),
      note: String(form.get("note") || ""),
      isHighlight: form.get("isHighlight") === "on",
    });
    setOpen(false);
    loadEvents();
  };

  return (
    <div className="design-page-shell">
      <section className="page-toolbar">
        <div>
          <h1>阅读表达</h1>
          <span>已读 {stats.totalBooks} 本 · 本月 {stats.monthlyBooks} 本</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="primary-action">
              <Plus className="w-4 h-4" />
              记录阅读
            </button>
          </DialogTrigger>
          <DialogContent className="app-dialog">
            <DialogHeader>
              <DialogTitle>新增阅读记录</DialogTitle>
              <DialogDescription>沉淀阅读理解、作文素材和面试表达材料，重要内容可纳入自招证据。</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="app-form">
              <label className="form-field"><span>书名</span><Input name="bookTitle" placeholder="例如 道德经" required /></label>
              <div className="form-grid two">
                <label className="form-field"><span>作者</span><Input name="bookAuthor" placeholder="作者" /></label>
                <label className="form-field"><span>分类</span><Input name="bookCategory" placeholder="古文 / 现代文 / 科普" /></label>
              </div>
              <div className="form-grid two">
                <label className="form-field"><span>阅读月份</span><Input name="date" type="month" defaultValue="2026-06" /></label>
                <label className="form-field"><span>评分</span><Input name="rating" type="number" min="1" max="5" defaultValue="5" /></label>
              </div>
              <label className="form-field"><span>阅读收获</span><Input name="note" placeholder="一句可复用的表达素材" /></label>
              <label className="form-check">
                <input name="isHighlight" type="checkbox" />
                纳入自招证据
              </label>
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>取消</Button>
                <Button type="submit" className="bg-[#5B6BF5] hover:bg-[#4F5DE0]">保存到成长档案</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </section>

      <section className="metric-grid">
        {[
          [BookMarked, "已读总数", `${stats.totalBooks}`, "本", "text-[#5B6BF5]"],
          [Clock, "已完成", `${stats.completedBooks}`, "本", "text-[#4CD7A4]"],
          [TrendingUp, "本月阅读", `${stats.monthlyBooks}`, "本", "text-[#FFB347]"],
          [Star, "平均评分", stats.avgRating ? stats.avgRating.toFixed(1) : "0", "/5", "text-[#8B5CF6]"],
        ].map(([Icon, label, value, unit, color]) => {
          const TypedIcon = Icon as typeof BookOpen;
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
              <h2>阅读与表达素材</h2>
              <p>按时间记录阅读证据，后续可转化为作文、面试和个人陈述素材。</p>
            </div>
          </div>
          <div className="space-y-3">
        {events.map((event, index) => (
          <div key={event.id} className="reading-row group">
                <div className={cn("reading-cover", covers[index % covers.length])}>
                  <BookOpen className="w-6 h-6 text-white/75" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-slate-800 group-hover:text-[#5B6BF5] transition-colors truncate">
                        《{event.metadata.bookTitle || event.title.replace("完成《", "").replace("》", "")}》
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#6B7280]">
                        {event.metadata.bookCategory || "阅读"}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#94A3B8] mt-0.5">{event.metadata.bookAuthor || event.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#94A3B8]" />
                        <span className="text-[11px] text-[#94A3B8]">{formatMonth(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: event.metadata.rating || 0 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-[#FFB347] text-[#FFB347]" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="evidence-status-pill">{event.is_highlight ? "证据" : "已入账"}</span>
                </div>
          </div>
        ))}
            {events.length === 0 && (
              <div className="empty-state-panel">
                <BookOpen className="h-8 w-8" />
                <strong>还没有阅读表达素材</strong>
                <span>先记录一本暑假阅读书目，补充一句可复用观点，后续可转化为作文和面谈表达。</span>
                <button className="empty-action-button" onClick={() => setOpen(true)}>添加第一条阅读素材</button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
