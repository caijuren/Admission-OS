"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock,
  FileText,
  Plus,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { growthService } from "@/services";
import type { GrowthEvent } from "@/types";
import {
  STUDENT_ID,
  getEventIcon,
  getEventTone,
  getWeeklyWindow,
} from "@/lib/product-data";
import { Button } from "@/components/ui/button";
import seedData from "../../../data/eduos.json";

export default function WeeklyPage() {
  const [events, setEvents] = useState<GrowthEvent[]>(seedData.events as GrowthEvent[]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  const loadEvents = () => {
    growthService.getEvents().then(setEvents);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const weekly = useMemo(() => getWeeklyWindow(events), [events]);
  const latestCategories = useMemo(
    () => Array.from(new Set(weekly.highlights.map((item) => item.category))).join("、") || "目标推进",
    [weekly.highlights]
  );

  function generateDraft() {
    const evidenceLines = weekly.highlights.length
      ? weekly.highlights.map((item, index) => `${index + 1}. ${item.title}（${item.category}，${item.date}）`).join("\n")
      : "1. 本阶段尚未形成足够证据，建议先补充成绩、阅读、项目或目标执行记录。";
    const nextLines = weekly.nextWeek.map((item, index) => `${index + 1}. ${item}`).join("\n");
    const nextDraft = [
      `阶段小结：本阶段围绕${latestCategories}沉淀了 ${weekly.highlights.length} 条关键证据。`,
      "",
      "推进证据：",
      evidenceLines,
      "",
      "下阶段重点：",
      nextLines,
      "",
      "家长观察：",
      "请补充本阶段状态、执行阻力和需要调整的节奏。",
    ].join("\n");

    setDraft(nextDraft);
    setGeneratedAt(new Date().toLocaleString("zh-CN", { hour12: false }));
    setSaved(false);
  }

  async function saveDraft() {
    if (!draft.trim()) return;
    await growthService.createEvent({
      student_id: STUDENT_ID,
      type: "other",
      category: "其他",
      title: `${weekly.week} 阶段复盘`,
      description: draft.trim(),
      date: new Date().toISOString().slice(0, 10),
      tags: [{ id: crypto.randomUUID(), name: "阶段复盘", color: "#5B6BF5" }],
      metadata: {},
      is_highlight: true,
      is_milestone: false,
      source: "weekly",
    });
    setSaved(true);
    loadEvents();
  }

  return (
    <div className="design-page-shell">
      <section className="page-toolbar">
        <div>
          <h1>阶段复盘</h1>
          <span>{weekly.date}</span>
        </div>
        <button
          className="primary-action"
          onClick={generateDraft}
        >
          <Plus className="w-4 h-4" />
          {generatedAt ? "已生成" : "生成复盘"}
        </button>
      </section>

      {generatedAt && (
        <div className="inline-feedback">
          已根据当前成长档案生成阶段复盘草稿 · {generatedAt}{saved ? " · 已保存到成长档案" : ""}
        </div>
      )}

      {events.length === 0 && (
        <section className="action-empty-panel">
          <strong>复盘依据不足</strong>
          <span>先补充成绩、阅读、目标任务或项目证据，再生成阶段复盘会更准确。</span>
        </section>
      )}

      <section className="data-panel weekly-summary-panel">
        <div className="data-panel-inner">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#5B6BF5]/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#5B6BF5]" />
            </div>
              <h2 className="text-[15px] font-semibold text-slate-800">阶段小结</h2>
          </div>
          <p className="text-[14px] text-slate-600 leading-relaxed">{weekly.summary}</p>
        </div>
      </section>

      {draft && (
        <section className="data-panel weekly-draft-panel">
          <div className="data-panel-inner">
            <div className="panel-title-row">
              <div>
                <h2>复盘草稿</h2>
                <p>可以直接编辑，保存后会作为亮点证据进入成长档案。</p>
              </div>
              <Button type="button" onClick={saveDraft} disabled={saved}>
                {saved ? "已保存" : "保存复盘"}
              </Button>
            </div>
            <textarea
              className="weekly-draft-editor"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setSaved(false);
              }}
            />
          </div>
        </section>
      )}

      <div className="summer-bottom-grid">
        <section className="data-panel">
          <div className="data-panel-inner">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-[#FFB347]" />
              <h2 className="text-[15px] font-semibold text-slate-800">阶段推进证据</h2>
            </div>
            <div className="space-y-3">
              {weekly.highlights.map((item) => {
                const Icon = getEventIcon(item);
                const tone = getEventTone(item);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC]">
                    <Icon
                      className={cn(
                        "w-4 h-4 flex-shrink-0",
                        tone === "green" && "text-[#4CD7A4]",
                        tone === "orange" && "text-[#FFB347]",
                        tone === "purple" && "text-[#8B5CF6]",
                        tone === "primary" && "text-[#5B6BF5]"
                      )}
                    />
                    <span className="text-[13px] text-slate-700">{item.title}</span>
                  </div>
                );
              })}
              {weekly.highlights.length === 0 && (
                <div className="empty-line">暂无阶段推进证据</div>
              )}
            </div>
          </div>
        </section>

        <section className="data-panel">
          <div className="data-panel-inner">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#5B6BF5]" />
              <h2 className="text-[15px] font-semibold text-slate-800">下一阶段重点</h2>
            </div>
            <div className="space-y-3">
              {weekly.nextWeek.map((item, index) => {
                const icons = [Target, BookOpen, FileText];
                const Icon = icons[index % icons.length];
                return (
                  <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC]">
                    <Icon className="w-4 h-4 flex-shrink-0 text-[#5B6BF5]" />
                    <span className="text-[13px] text-slate-700">{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
