"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  BookOpen,
  Calendar,
  Clock,
  Image as ImageIcon,
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

const covers = ["bg-[#23B87A]", "bg-[#2F7DD3]", "bg-[#FFB347]", "bg-[#8FDDBE]", "bg-[#94A3B8]"];

export default function ReadingPage() {
  const [events, setEvents] = useState<GrowthEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadEvents = () => {
    growthService.getReadingEvents().then(setEvents);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const stats = useMemo(() => getReadingStats(events), [events]);
  const todayString = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    const form = new FormData(event.currentTarget);
    const finishDate = String(form.get("finishDate") || new Date().toISOString().slice(0, 10));
    try {
      await growthService.addReadingEvent({
        student_id: STUDENT_ID,
        bookTitle: String(form.get("bookTitle") || "未命名书籍"),
        bookAuthor: String(form.get("bookAuthor") || "未知作者"),
        bookCategory: String(form.get("bookCategory") || "阅读"),
        isbn: String(form.get("isbn") || "").trim(),
        publisher: String(form.get("publisher") || "").trim(),
        coverUrl: String(form.get("coverUrl") || "").trim(),
        readingStatus: String(form.get("readingStatus") || "已读") as "想读" | "在读" | "已读" | "暂停",
        startDate: String(form.get("startDate") || finishDate),
        finishDate,
        pages: Number(form.get("pages") || 0) || undefined,
        reusablePoint: String(form.get("reusablePoint") || "").trim(),
        quote: String(form.get("quote") || "").trim(),
        useCases: String(form.get("useCases") || "")
          .split(/,|，|、|\n/)
          .map((item) => item.trim())
          .filter(Boolean),
        rating: Number(form.get("rating") || 5),
        date: finishDate,
        note: String(form.get("note") || ""),
        isHighlight: form.get("isHighlight") === "on",
      });
      setOpen(false);
      loadEvents();
    } catch {
      setSaveError("阅读记录保存失败，请确认已登录并稍后再试。");
    } finally {
      setSaving(false);
    }
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
                <label className="form-field"><span>ISBN</span><Input name="isbn" placeholder="978..." /></label>
              </div>
              <div className="form-grid three">
                <label className="form-field"><span>分类</span><Input name="bookCategory" placeholder="古文 / 英文原版 / 科普" /></label>
                <label className="form-field"><span>出版社</span><Input name="publisher" placeholder="出版社" /></label>
                <label className="form-field"><span>状态</span><select name="readingStatus" defaultValue="已读"><option>想读</option><option>在读</option><option>已读</option><option>暂停</option></select></label>
              </div>
              <label className="form-field"><span>封面 URL</span><Input name="coverUrl" placeholder="https://.../cover.jpg" /></label>
              <div className="form-grid three">
                <label className="form-field"><span>开始日期</span><Input name="startDate" type="date" defaultValue={todayString} /></label>
                <label className="form-field"><span>完成日期</span><Input name="finishDate" type="date" defaultValue={todayString} /></label>
                <label className="form-field"><span>页数</span><Input name="pages" type="number" min="0" placeholder="可选" /></label>
              </div>
              <div className="form-grid two">
                <label className="form-field"><span>评分</span><Input name="rating" type="number" min="1" max="5" defaultValue="5" /></label>
                <label className="form-field"><span>可用于</span><Input name="useCases" placeholder="作文、面谈、个人陈述" /></label>
              </div>
              <label className="form-field"><span>摘要</span><Input name="note" placeholder="这本书讲了什么，和孩子有什么关系" /></label>
              <label className="form-field"><span>可复用观点</span><Input name="reusablePoint" placeholder="一句可用于作文、面谈或材料表达的观点" /></label>
              <label className="form-field"><span>金句 / 关键词</span><Input name="quote" placeholder="摘录或关键词" /></label>
              <label className="form-check">
                <input name="isHighlight" type="checkbox" />
                纳入自招证据
              </label>
              {saveError && <div className="weekly-save-feedback error">{saveError}</div>}
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>取消</Button>
                <Button type="submit" disabled={saving} className="bg-[#23B87A] hover:bg-[#1FA36C]">
                  {saving ? "保存中" : "保存到成长档案"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </section>

      <section className="evidence-hero">
        <div>
          <span>Evidence System</span>
          <h2>阅读表达证据库</h2>
          <p>把阅读记录沉淀成可复用观点、表达素材和面谈证据，支撑长期语文表达与申请材料。</p>
        </div>
        <div className="evidence-hero-score">
          <strong>{stats.totalBooks}</strong>
          <span>阅读素材</span>
          <em>{stats.monthlyBooks} 本来自本月</em>
        </div>
      </section>

      <section className="evidence-signal-grid">
        <article><span>证据厚度</span><strong>{stats.totalBooks ? "已启动" : "待建立"}</strong></article>
        <article><span>表达素材</span><strong>{events.filter((event) => event.metadata.reusablePoint || event.metadata.quote).length}</strong></article>
        <article><span>申请亮点</span><strong>{events.filter((event) => event.is_highlight).length}</strong></article>
      </section>

      <section className="metric-grid">
        {[
          [BookMarked, "已读总数", `${stats.totalBooks}`, "本", "text-[#2F7DD3]"],
          [Clock, "已完成", `${stats.completedBooks}`, "本", "text-[#23B87A]"],
          [TrendingUp, "本月阅读", `${stats.monthlyBooks}`, "本", "text-[#FFB347]"],
          [Star, "平均评分", stats.avgRating ? stats.avgRating.toFixed(1) : "0", "/5", "text-[#E68A00]"],
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
                <div className={cn("reading-cover", !event.metadata.coverUrl && covers[index % covers.length])}>
                  {event.metadata.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.metadata.coverUrl} alt="" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-white/75" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-slate-800 group-hover:text-[#23B87A] transition-colors truncate">
                        《{event.metadata.bookTitle || event.title.replace("完成《", "").replace("》", "")}》
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#6B7280]">
                        {event.metadata.bookCategory || "阅读"}
                      </span>
                      {event.metadata.readingStatus && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EAFBF4] text-[#16724D]">
                          {event.metadata.readingStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#94A3B8] mt-0.5">
                      {[event.metadata.bookAuthor, event.metadata.publisher, event.metadata.isbn ? `ISBN ${event.metadata.isbn}` : ""].filter(Boolean).join(" · ") || event.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#94A3B8]" />
                        <span className="text-[11px] text-[#94A3B8]">
                          {event.metadata.startDate && event.metadata.finishDate
                            ? `${event.metadata.startDate} - ${event.metadata.finishDate}`
                            : formatMonth(event.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: event.metadata.rating || 0 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-[#FFB347] text-[#FFB347]" />
                        ))}
                      </div>
                    </div>
                    {(event.metadata.reusablePoint || event.metadata.quote) && (
                      <div className="reading-expression-line">
                        {event.metadata.reusablePoint && <span>{event.metadata.reusablePoint}</span>}
                        {event.metadata.quote && <em>{event.metadata.quote}</em>}
                      </div>
                    )}
                  </div>
                  <div className="reading-side-meta">
                    {event.metadata.pages ? <span>{event.metadata.pages} 页</span> : <ImageIcon className="h-4 w-4" />}
                    <span className="evidence-status-pill">{event.is_highlight ? "证据" : "已入账"}</span>
                  </div>
                </div>
          </div>
        ))}
            {events.length === 0 && (
              <div className="empty-state-panel">
                <BookOpen className="h-8 w-8" />
                <strong>还没有阅读表达素材</strong>
                <span>先记录一本暑假阅读书目，补充一句可复用观点，后续可转化为作文和面谈表达。</span>
                <button className="empty-action-button" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" />
                  添加第一条阅读素材
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
