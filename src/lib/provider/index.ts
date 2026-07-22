/**
 * Provider selector. DATA_PROVIDER=supabase switches implementations once
 * the Supabase project exists — nothing else in the app changes.
 */

import type { DataProvider } from "./contract";
import { MockProvider } from "./mock/provider";

declare global {
  // eslint-disable-next-line no-var
  var __lsiProvider: DataProvider | undefined;
}

export function getProvider(): DataProvider {
  if (!globalThis.__lsiProvider) {
    // "supabase" branch lands in Phase 7 (SupabaseProvider stub) and goes
    // live when the project + env vars exist.
    globalThis.__lsiProvider = new MockProvider();
  }
  return globalThis.__lsiProvider;
}

export type { DataProvider } from "./contract";
