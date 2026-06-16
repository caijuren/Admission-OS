/**
 * Supabase Event Repository Implementation
 * Replaces in-memory store with real database
 */

import { supabase } from "@/lib/supabase";
import type { GrowthEvent, EventFilters, CreateEventInput, EventSource } from "@/types";

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
  seed(data: GrowthEvent[]): Promise<void>;
}

export class SupabaseEventRepository implements IEventRepository {
  private studentId: string;

  constructor() {
    this.studentId = process.env.NEXT_PUBLIC_STUDENT_ID || "1";
  }

  async findAll(filters?: EventFilters): Promise<GrowthEvent[]> {
    let query = supabase
      .from("events")
      .select("*")
      .eq("student_id", this.studentId);

    if (filters) {
      if (filters.types?.length) {
        query = query.in("type", filters.types);
      }
      if (filters.categories?.length) {
        query = query.in("category", filters.categories);
      }
      if (filters.year) {
        query = query.eq("year", filters.year);
      }
      if (filters.startDate) {
        query = query.gte("date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("date", filters.endDate);
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }
      if (filters.is_highlight !== undefined) {
        query = query.eq("is_highlight", filters.is_highlight);
      }
      if (filters.is_milestone !== undefined) {
        query = query.eq("is_milestone", filters.is_milestone);
      }
      if (filters.source) {
        query = query.eq("source", filters.source);
      }
      if (filters.sources?.length) {
        query = query.in("source", filters.sources);
      }
    }

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return [];
    }

    return data || [];
  }

  async findById(id: string): Promise<GrowthEvent | null> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("student_id", this.studentId)
      .single();

    if (error) {
      console.error("Error fetching event:", error);
      return null;
    }

    return data || null;
  }

  async findByYear(year: number): Promise<GrowthEvent[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("student_id", this.studentId)
      .eq("year", year)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching events by year:", error);
      return [];
    }

    return data || [];
  }

  async findByType(type: GrowthEvent["type"]): Promise<GrowthEvent[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("student_id", this.studentId)
      .eq("type", type)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching events by type:", error);
      return [];
    }

    return data || [];
  }

  async findBySource(source: EventSource): Promise<GrowthEvent[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("student_id", this.studentId)
      .eq("source", source)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching events by source:", error);
      return [];
    }

    return data || [];
  }

  async findBySources(sources: EventSource[]): Promise<GrowthEvent[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("student_id", this.studentId)
      .in("source", sources)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching events by sources:", error);
      return [];
    }

    return data || [];
  }

  async findHighlights(): Promise<GrowthEvent[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("student_id", this.studentId)
      .eq("is_highlight", true)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching highlights:", error);
      return [];
    }

    return data || [];
  }

  async findMilestones(): Promise<GrowthEvent[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("student_id", this.studentId)
      .eq("is_milestone", true)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching milestones:", error);
      return [];
    }

    return data || [];
  }

  async create(input: CreateEventInput): Promise<GrowthEvent> {
    const newEvent: Omit<GrowthEvent, "id" | "created_at" | "updated_at"> = {
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
    };

    const { data, error } = await supabase
      .from("events")
      .insert([newEvent])
      .select("*")
      .single();

    if (error) {
      console.error("Error creating event:", error);
      throw error;
    }

    return data;
  }

  async update(id: string, data: Partial<GrowthEvent>): Promise<GrowthEvent | null> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedEvent, error } = await supabase
      .from("events")
      .update(updateData)
      .eq("id", id)
      .eq("student_id", this.studentId)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating event:", error);
      return null;
    }

    return updatedEvent || null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .eq("student_id", this.studentId);

    if (error) {
      console.error("Error deleting event:", error);
      return false;
    }

    return true;
  }

  async seed(data: GrowthEvent[]): Promise<void> {
    const eventsToInsert = data.map((event) => ({
      ...event,
      student_id: this.studentId,
    }));

    const { error } = await supabase.from("events").insert(eventsToInsert);

    if (error) {
      console.error("Error seeding events:", error);
    }
  }
}

// Singleton instance
export const eventRepository = new SupabaseEventRepository();