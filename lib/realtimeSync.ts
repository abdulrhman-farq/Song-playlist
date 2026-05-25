/**
 * Stub for the realtime sync layer. The full Supabase-backed
 * implementation is being written by a background agent in a
 * separate worktree. This file just exports the public types so
 * the rest of the codebase can compile in the meantime.
 *
 * Replaced wholesale by the Realtime agent when its branch merges.
 */

export type RealtimeStatus = "idle" | "connecting" | "live" | "offline" | "error";
