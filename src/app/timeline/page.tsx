"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Filter,
  Plus,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { growthService } from "@/services";
import type { EventCategory, GrowthEvent } from "@/types";
import {
  formatMonth,
  getEventIcon,
  getEventTone,
} from "@/lib/product-data";
import seedData from "../../../data/eduos.json";

const categories: Array<"全部" | EventCategory> = ["全部", "目标", "项目", "学业", "阅读", "荣誉"];

export default function TimelinePage() {
  const [events, setEvents] = useState<GrowthEvent[]>(seedData.events as GrowthEvent[]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"全部" | EventCategory>("全部");
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    growthService.getEvents().then(setEvents);
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesCategory = category === "全部" || event.category === category;
      const matchesQuery = !query.trim()
        || event.title.toLowerCase().includes(query.toLowerCase())
        || event.description.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, events, query]);

  const grouped = useMemo(() => {
    return filteredEvents.reduce<Record<string, GrowthEvent[]>>((acc, event) => {
      const year = String(event.year || event.date.slice(0, 4));
      acc[year] = acc[year] || [];
      acc[year].push(event);
      return acc;
    }, {});
  }, [filteredEvents]);

  return (
    <div className="design-page-shell">
      <section className="page-toolbar">
        <div>
          <h1>成长档案</h1>
          <span>{filteredEvents.length} 条记录 · {category}</span>
        </div>
        <div className="action-popover-wrap">
          <button className="primary-action" onClick={() => setShowSources((current) => !current)}>
            <Plus className="w-4 h-4" />
            记录证据
          </button>
          {showSources && (
            <div className="action-popover">
              <Link href="/grades">记录成绩</Link>
              <Link href="/reading">记录阅读</Link>
              <Link href="/goals">记录目标进展</Link>
              <Link href="/records">查看能力资产</Link>
            </div>
          )}
        </div>
      </section>

      <div className="timeline-toolbar">
        <div className="timeline-search">
          <Search className="h-4 w-4 text-[#94A3B8]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索升学证据..."
            className="h-9 border-0 bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="timeline-tabs">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={cn("timeline-tab", category === item && "active")}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="timeline-filter"
          onClick={() => {
            setQuery("");
            setCategory("全部");
          }}
        >
          <Filter className="h-3.5 w-3.5" />
          重置
        </button>
      </div>

      <div className="timeline-content-stack">
        {Object.entries(grouped).map(([year, yearEvents]) => (
          <section key={year}>
            <div className="timeline-year-head">
              <span />
              <h2>{year}</h2>
              <i />
              <em>{yearEvents.length} 条记录</em>
            </div>

            <div className="timeline-line-list">
              {yearEvents.map((event) => {
                const Icon = getEventIcon(event);
                const tone = getEventTone(event);
                return (
                  <article key={event.id} className="timeline-event-card">
                    <div className={cn("timeline-dot", tone)} />
                    <div className={cn("timeline-card-accent", tone)} />
                    <div className={cn("item-icon", `tone-${tone}`)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="timeline-event-body">
                      <div className="timeline-event-title">
                        <strong>{event.title}</strong>
                        <span>{event.category}</span>
                        {event.is_milestone && <Star className="h-3.5 w-3.5 fill-[#FFB347] text-[#FFB347]" />}
                      </div>
                      <p>{event.description || "这是一条升学证据，已进入交附嘉分准备账本。"}</p>
                      <div className="timeline-event-meta">
                        <Calendar className="h-3 w-3" />
                        {formatMonth(event.date)}
                        {event.is_highlight && (
                          <>
                            <Sparkles className="h-3 w-3" />
                            亮点
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {filteredEvents.length === 0 && (
          <div className="empty-state-panel">
            <Search className="h-8 w-8" />
            <strong>{events.length ? "没有匹配的证据" : "还没有沉淀证据"}</strong>
            <span>{events.length ? "换一个关键词或筛选类型。" : "从成绩、阅读、目标地图或能力资产中新增记录后，这里会形成升学证据流水。"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
