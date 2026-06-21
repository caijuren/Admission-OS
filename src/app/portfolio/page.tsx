"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Lightbulb,
  School,
  Target,
  Trophy,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { growthService } from "@/services";
import type { GrowthEvent } from "@/types";
import {
  DEFAULT_PROFILE,
  type StudentProfile,
  buildGrowthNarrative,
  formatMonth,
  getAssetStats,
  getEventTone,
  getGradeStats,
  getProductConfig,
  getReadingStats,
} from "@/lib/product-data";

const materialSections = [
  { key: "profile", title: "申请人摘要", owner: "设置页", status: "已接入" },
  { key: "grades", title: "校内成绩与排名", owner: "校内成绩", status: "已接入" },
  { key: "reading", title: "阅读表达素材", owner: "阅读表达", status: "已接入" },
  { key: "assets", title: "项目 / 荣誉 / 证书", owner: "竞争力", status: "待补充" },
  { key: "timeline", title: "关键证据时间线", owner: "成长档案", status: "已接入" },
];

export default function PortfolioPage() {
  const [events, setEvents] = useState<GrowthEvent[]>([]);
  const [profile, setProfile] = useState<StudentProfile>(DEFAULT_PROFILE);
  const [exportState, setExportState] = useState("");

  useEffect(() => {
    growthService.getEvents().then(setEvents);
    getProductConfig().then((config) => setProfile(config.profile));
  }, []);

  const readingStats = useMemo(() => getReadingStats(events), [events]);
  const gradeStats = useMemo(() => getGradeStats(events), [events]);
  const assetStats = useMemo(() => getAssetStats(events), [events]);
  const timeline = useMemo(
    () => events.filter((event) => event.is_highlight || event.is_milestone).slice(0, 6),
    [events]
  );
  const assets = useMemo(
    () => events.filter((event) => event.type === "honor" || event.type === "project").slice(0, 5),
    [events]
  );
  const readiness = Math.round(
    (Number(Boolean(profile.name && profile.name !== DEFAULT_PROFILE.name))
      + Number(gradeStats.examCount > 0)
      + Number(readingStats.totalBooks > 0)
      + Number(assetStats.honors + assetStats.projects > 0)
      + Number(timeline.length > 0)) * 20
  );
  const missingMaterials = [
    gradeStats.examCount > 0 ? "" : "校内成绩",
    readingStats.totalBooks > 0 ? "" : "阅读表达",
    assetStats.honors + assetStats.projects > 0 ? "" : "项目/荣誉",
    timeline.length > 0 ? "" : "关键证据",
  ].filter(Boolean);

  function handlePrint() {
    setExportState("已打开打印面板，可选择“保存为 PDF”。");
    window.setTimeout(() => window.print(), 80);
  }

  return (
    <div className="design-page-shell portfolio-print-scope">
      <section className="page-toolbar no-print">
        <div>
          <h1>申请材料</h1>
          <span>完成度 {readiness}% · {timeline.length} 条关键证据</span>
        </div>
        <button
          className="primary-action"
          onClick={handlePrint}
        >
          <Download className="w-4 h-4" />
          导出材料
        </button>
      </section>

      {exportState && <div className="inline-feedback no-print">{exportState}</div>}

      <section className="portfolio-release-strip no-print">
        <div className="portfolio-readiness-meter">
          <strong>{readiness}%</strong>
          <span>材料完成度</span>
          <div className="line-meter"><i style={{ width: `${readiness}%` }} /></div>
        </div>
        <div>
          <h2>{missingMaterials.length ? "发版前仍需补齐材料" : "材料结构已完整"}</h2>
          <p>{missingMaterials.length ? `建议优先补：${missingMaterials.join("、")}。` : "可以导出 PDF 做人工校对，重点检查文字表达和证据顺序。"}</p>
        </div>
        <div className="portfolio-release-tags">
          {materialSections.map((item) => (
            <span key={item.key} className={item.status === "已接入" ? "ready" : ""}>{item.title}</span>
          ))}
        </div>
      </section>

      <section className="portfolio-layout-grid">
        <article className="data-panel portfolio-summary-panel">
          <div className="data-panel-inner">
            <div className="portfolio-profile-head">
              <div className="portfolio-avatar compact">{profile.name.slice(0, 1) || "孩"}</div>
              <div>
                <span>申请人摘要</span>
                <h2>{profile.name}</h2>
                <p><School className="h-3.5 w-3.5" /> {profile.school} · {profile.grade}</p>
                <p><Target className="h-3.5 w-3.5" /> 目标：{profile.targetSchool}</p>
              </div>
            </div>
            <blockquote>{buildGrowthNarrative(events, profile)}</blockquote>
          </div>
        </article>

        <section className="portfolio-stat-grid">
          {[
            [GraduationCap, "最高成绩", gradeStats.bestScore || 0, "分", "text-[#2F7DD3]"],
            [BookOpen, "阅读素材", readingStats.totalBooks || 0, "条", "text-[#23B87A]"],
            [Trophy, "荣誉证书", assetStats.honors || 0, "项", "text-[#FFB347]"],
            [Lightbulb, "项目证据", assetStats.projects || 0, "个", "text-[#E68A00]"],
          ].map(([Icon, label, value, unit, color]) => {
            const TypedIcon = Icon as typeof BookOpen;
            return (
              <article key={label as string} className="metric-card">
                <div className="metric-head">
                  <TypedIcon className={cn("h-4 w-4", color as string)} />
                  <span>{label as string}</span>
                </div>
                <strong className={color as string}>{String(value)}<span>{unit as string}</span></strong>
              </article>
            );
          })}
        </section>
      </section>

      <section className="portfolio-material-grid portfolio-document-preview">
        <article className="data-panel">
          <div className="data-panel-inner">
            <div className="panel-title-row">
              <div>
                <h2>材料清单</h2>
                <p>先确认结构完整，再补证据内容。</p>
              </div>
            </div>
            <div className="material-check-list">
              {materialSections.map((item) => (
                <div key={item.key} className="material-check-row">
                  <CheckCircle2 className={cn("h-4 w-4", item.status === "已接入" ? "text-[#23B87A]" : "text-[#94A3B8]")} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.owner}</span>
                  </div>
                  <em>{item.status}</em>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="data-panel">
          <div className="data-panel-inner">
            <div className="panel-title-row">
              <div>
                <h2>关键证据时间线</h2>
                <p>只展示可进入申请材料的亮点和里程碑。</p>
              </div>
            </div>
            <div className="portfolio-evidence-list">
              {timeline.map((item) => {
                const tone = getEventTone(item);
                return (
                  <div key={item.id} className="portfolio-evidence-row">
                    <span className={cn("timeline-dot", tone)} />
                    <div>
                      <strong>{item.title}</strong>
                      <em><Calendar className="h-3 w-3" /> {formatMonth(item.date)} · {item.category}</em>
                    </div>
                  </div>
                );
              })}
              {timeline.length === 0 && <div className="empty-line">暂无可进入申请材料的亮点证据</div>}
            </div>
          </div>
        </article>

        <article className="data-panel">
          <div className="data-panel-inner">
            <div className="panel-title-row">
              <div>
                <h2>项目 / 荣誉 / 证书</h2>
                <p>用于支撑竞争力表达。</p>
              </div>
            </div>
            <div className="portfolio-asset-list">
              {assets.map((item) => (
                <div key={item.id} className="portfolio-asset-row">
                  {item.type === "project" ? <FileText className="h-4 w-4 text-[#2F7DD3]" /> : <Award className="h-4 w-4 text-[#FFB347]" />}
                  <div>
                    <strong>{item.title}</strong>
                    <span>{formatMonth(item.date)} · {item.category}</span>
                  </div>
                </div>
              ))}
              {assets.length === 0 && <div className="empty-line">暂无项目、荣誉或证书资产</div>}
            </div>
          </div>
        </article>

        <article className="data-panel">
          <div className="data-panel-inner">
            <div className="panel-title-row">
              <div>
                <h2>目标陈述素材</h2>
                <p>来自设置页和当前成长档案。</p>
              </div>
            </div>
            <div className="portfolio-statement-box">
              <User className="h-4 w-4 text-[#23B87A]" />
              <p>{profile.quote || "补充目标寄语后，这里会形成申请材料中的目标陈述素材。"}</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
