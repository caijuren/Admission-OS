/**
 * Repository Layer - EduOS
 * 数据访问层抽象 - 统一 Event 模型，经 /api/data 持久化
 */

import type { GrowthEvent, EventFilters, CreateEventInput, EventSource } from "@/types";

type EduosData = {
  events: GrowthEvent[];
};

let eventCache: { events: GrowthEvent[]; timestamp: number } | null = null;
let eventRequest: Promise<GrowthEvent[]> | null = null;
const eventCacheMs = 1000;

async function readEvents(): Promise<GrowthEvent[]> {
  if (eventCache && Date.now() - eventCache.timestamp < eventCacheMs) {
    return eventCache.events;
  }

  if (eventRequest) return eventRequest;

  eventRequest = fetch("/api/data", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return eventCache?.events || [];
      const data = await response.json() as EduosData;
      const events = Array.isArray(data.events) ? data.events : [];
      eventCache = { events, timestamp: Date.now() };
      return events;
    })
    .catch(() => eventCache?.events || [])
    .finally(() => {
      eventRequest = null;
    });

  return eventRequest;
}

async function writeEvents(events: GrowthEvent[]) {
  const response = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });

  if (!response.ok) {
    throw new Error("Failed to persist growth events");
  }

  eventCache = { events, timestamp: Date.now() };
}

function applyFilters(events: GrowthEvent[], filters?: EventFilters) {
  let results = [...events];

  if (filters) {
    if (filters.types?.length) {
      results = results.filter(e => filters.types!.includes(e.type));
    }
    if (filters.categories?.length) {
      results = results.filter(e => filters.categories!.includes(e.category));
    }
    if (filters.year) {
      results = results.filter(e => e.year === filters.year);
    }
    if (filters.startDate) {
      results = results.filter(e => e.date >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter(e => e.date <= filters.endDate!);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    if (filters.is_highlight !== undefined) {
      results = results.filter(e => e.is_highlight === filters.is_highlight);
    }
    if (filters.is_milestone !== undefined) {
      results = results.filter(e => e.is_milestone === filters.is_milestone);
    }
    if (filters.source) {
      results = results.filter(e => e.source === filters.source);
    }
    if (filters.sources?.length) {
      results = results.filter(e => filters.sources!.includes(e.source));
    }
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export interface IEventRepository {
  findAll(filters?: EventFilters): Promise<GrowthEvent[]>;
  findById(id: string): Promise<GrowthEvent | null>;
  findByYear(year: number): Promise<GrowthEvent[]>;
  findByType(type: GrowthEvent["type"]): Promise<GrowthEvent[]>;
  findBySource(source: EventSource): Promise<GrowthEvent[]>;
  findBySources(sources: EventSource[]): Promise<GrowthEvent[]>;
  findHighlights(): Promise<GrowthEvent[]>;
  findMilestones(): Promise<GrowthEvent[]>;
  create(input: CreateEventInput): Promise<GrowthEvent>;
  update(id: string, data: Partial<GrowthEvent>): Promise<GrowthEvent | null>;
  delete(id: string): Promise<boolean>;
  seed(data: GrowthEvent[]): void;
}

export class EventRepository implements IEventRepository {
  async findAll(filters?: EventFilters): Promise<GrowthEvent[]> {
    return applyFilters(await readEvents(), filters);
  }

  async findById(id: string): Promise<GrowthEvent | null> {
    const events = await readEvents();
    return events.find(e => e.id === id) || null;
  }

  async findByYear(year: number): Promise<GrowthEvent[]> {
    return applyFilters(await readEvents(), { year });
  }

  async findByType(type: GrowthEvent["type"]): Promise<GrowthEvent[]> {
    return applyFilters(await readEvents(), { types: [type] });
  }

  async findBySource(source: EventSource): Promise<GrowthEvent[]> {
    return applyFilters(await readEvents(), { source });
  }

  async findBySources(sources: EventSource[]): Promise<GrowthEvent[]> {
    return applyFilters(await readEvents(), { sources });
  }

  async findHighlights(): Promise<GrowthEvent[]> {
    return applyFilters(await readEvents(), { is_highlight: true });
  }

  async findMilestones(): Promise<GrowthEvent[]> {
    return applyFilters(await readEvents(), { is_milestone: true });
  }

  async create(input: CreateEventInput): Promise<GrowthEvent> {
    const events = await readEvents();
    const newEvent: GrowthEvent = {
      id: crypto.randomUUID(),
      student_id: input.student_id,
      type: input.type,
      category: input.category,
      title: input.title,
      description: input.description || "",
      date: input.date,
      year: parseInt(input.date.split("-")[0]),
      tags: input.tags || [],
      attachments: input.attachments || [],
      metadata: input.metadata || {},
      is_highlight: input.is_highlight || false,
      is_milestone: input.is_milestone || false,
      source: input.source || "manual",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await writeEvents([newEvent, ...events]);
    return newEvent;
  }

  async update(id: string, data: Partial<GrowthEvent>): Promise<GrowthEvent | null> {
    const events = await readEvents();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) return null;

    events[index] = {
      ...events[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    await writeEvents(events);
    return events[index];
  }

  async delete(id: string): Promise<boolean> {
    const events = await readEvents();
    const nextEvents = events.filter(e => e.id !== id);
    if (nextEvents.length === events.length) return false;

    await writeEvents(nextEvents);
    return true;
  }

  seed(data: GrowthEvent[]): void {
    void writeEvents(data);
  }
}

export const eventRepository = new EventRepository();
