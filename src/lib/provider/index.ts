/**
 * Provider selector. DATA_PROVIDER=supabase switches implementations once
 * the Supabase project exists — nothing else in the app changes.
 */

import type { DataProvider } from "./contract";
import { MockProvider } from "./mock/provider";

// NOTE: no globalThis cache here — MockProvider is stateless (all state lives
// in the MockStore's own globalThis slot), and caching the provider instance
// across dev HMR pins OLD method code. A fresh instance per call is free.
export function getProvider(): DataProvider {
  // "supabase" branch lands in Phase 7 (SupabaseProvider stub) and goes
  // live when the project + env vars exist.
  return new MockProvider();
}

export type { DataProvider } from "./contract";
