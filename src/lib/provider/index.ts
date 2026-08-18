/**
 * Provider selector. DATA_PROVIDER=supabase switches implementations once
 * the Supabase project exists — nothing else in the app changes.
 */

import type { DataProvider } from "./contract";
import { MockProvider } from "./mock/provider";
import { RdsProvider, rdsConfigured } from "./rds/provider";
import { SupabaseProvider, supabaseConfigured } from "./supabase/provider";

// NOTE: no globalThis cache here — MockProvider is stateless (all state lives
// in the MockStore's own globalThis slot), and caching the provider instance
// across dev HMR pins OLD method code. A fresh instance per call is free.
export function getProvider(): DataProvider {
  // Flip: set DATA_PROVIDER=supabase + the two NEXT_PUBLIC_SUPABASE_* vars.
  // Catalog reads go live against schema_v2; the ops layer still throws until
  // the ops RPC migration, so flip only when catalog-first pages are the goal.
  if (process.env.DATA_PROVIDER === "rds" && rdsConfigured()) {
    return new RdsProvider();
  }
  if (process.env.DATA_PROVIDER === "supabase" && supabaseConfigured()) {
    return new SupabaseProvider();
  }
  return new MockProvider();
}

export type { DataProvider } from "./contract";
