/**
 * Repositories Index - EduOS
 * 
 * Note: For development without Supabase, use MockEventRepository (in-memory)
 * For production, use SupabaseEventRepository
 */

// Re-export from event.repository with renamed exports to avoid conflicts
import {
  EventRepository as MockEventRepository,
  eventRepository as mockEventRepository,
} from "./event.repository";

export {
  MockEventRepository,
  mockEventRepository as eventRepository,
};

// Import and re-export the interface type
import type { IEventRepository as MockIEventRepository } from "./event.repository";
export type { MockIEventRepository as IEventRepository };

// Supabase implementations
export {
  SupabaseEventRepository,
} from "./supabase-event.repository";

export * from "./supabase-repositories";
