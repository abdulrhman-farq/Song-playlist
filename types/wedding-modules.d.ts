/**
 * Transitional ambient module declarations for the wedding orchestration
 * subsystems that are being authored in parallel branches (Tasks, Timeline,
 * Due-date helpers, Home recap). These declarations exist so that the Live
 * Wedding Mode component can typecheck on this branch in isolation.
 *
 * When the real lib files are merged in, their concrete .ts source will
 * shadow these declarations automatically (real source > ambient .d.ts).
 *
 * This file may be safely deleted as part of the merge step.
 */

declare module "@/lib/timelineStorage" {
  export interface TimelineEntry {
    /** Stable id. */
    id: string;
    /** Local clock time in 24h "HH:mm" form. */
    time: string;
    /** Title in primary language (often Arabic). */
    title: string;
    /** Optional secondary-language title. */
    titleEn?: string;
    /** Optional playlist section slug this entry links to. */
    sectionId?: string;
    /** Optional human label for the linked section. */
    sectionLabel?: string;
    /** Free-form note. */
    note?: string;
  }
  export function loadTimeline(): TimelineEntry[];
  export function saveTimeline(entries: TimelineEntry[]): void;
}

declare module "@/lib/tasksStorage" {
  export type TaskStatus = "open" | "done";
  export interface Task {
    id: string;
    title: string;
    titleEn?: string;
    /** ISO timestamp or "HH:mm" clock string for the day-of. */
    dueAt?: string;
    status: TaskStatus;
    owner?: string;
    note?: string;
  }
  export function loadTasks(): Task[];
  export function saveTasks(tasks: Task[]): void;
}

declare module "@/lib/dueDate" {
  import type { Task } from "@/lib/tasksStorage";
  /** Returns a Date if the task has a parseable due time, else null. */
  export function dueDateOf(task: Task): Date | null;
  /** Sorts tasks by ascending due date; tasks without a due date sink. */
  export function sortByDue<T extends Task>(tasks: T[]): T[];
}
