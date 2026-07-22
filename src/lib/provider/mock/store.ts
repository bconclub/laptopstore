/**
 * MockStore — the in-memory database.
 *
 * globalThis-cached so server components and route handlers share one
 * instance across HMR in `next dev`. With MOCK_PERSIST=1 every mutation
 * debounce-writes .mock/state.json (gitignored) and boot restores it, so a
 * dev/demo session survives restarts. `npm run mock:reset` or
 * POST /api/admin/dev/reset reseeds.
 *
 * Vercel/serverless caveat: state is per-lambda instance; the rich seeded
 * history keeps the demo populated regardless. Real persistence = the
 * Supabase provider swap.
 */

import { buildSeed, seedCounts, type SeedData } from "@/mock/seed/generate";

export interface MockStore extends SeedData {
  /** Monotonic counters for live-created entities */
  counters: { order: number; enquiry: number; repair: number; rental: number; fulfilment: number };
}

const PERSIST_PATH = ".mock/state.json";
const persistEnabled = () =>
  process.env.MOCK_PERSIST === "1" && process.env.NEXT_RUNTIME !== "edge";

declare global {
  // eslint-disable-next-line no-var
  var __lsiMockStore: MockStore | undefined;
  // eslint-disable-next-line no-var
  var __lsiMockPersistTimer: ReturnType<typeof setTimeout> | undefined;
}

function freshStore(): MockStore {
  const seed = buildSeed();
  return {
    ...seed,
    counters: {
      order: seed.orders.length,
      enquiry: seed.enquiries.length,
      repair: seed.repairJobs.length,
      rental: seed.rentals.length,
      fulfilment: 0,
    },
  };
}

async function tryRestore(): Promise<MockStore | undefined> {
  if (!persistEnabled()) return undefined;
  try {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(PERSIST_PATH, "utf8");
    const parsed = JSON.parse(raw) as MockStore;
    if (parsed?.products?.length && parsed?.counters) return parsed;
  } catch {
    /* no snapshot — fresh seed */
  }
  return undefined;
}

/** Fire-and-forget debounced persistence. */
export function persist(store: MockStore): void {
  if (!persistEnabled()) return;
  clearTimeout(globalThis.__lsiMockPersistTimer);
  globalThis.__lsiMockPersistTimer = setTimeout(async () => {
    try {
      const { mkdir, writeFile } = await import("node:fs/promises");
      await mkdir(".mock", { recursive: true });
      await writeFile(PERSIST_PATH, JSON.stringify(store), "utf8");
    } catch {
      /* read-only fs (serverless) — in-memory only */
    }
  }, 300);
}

let restorePromise: Promise<MockStore> | undefined;

export async function getStore(): Promise<MockStore> {
  if (globalThis.__lsiMockStore) return globalThis.__lsiMockStore;
  restorePromise ??= (async () => {
    const restored = await tryRestore();
    globalThis.__lsiMockStore ??= restored ?? freshStore();
    return globalThis.__lsiMockStore;
  })();
  return restorePromise;
}

export async function resetStore(): Promise<MockStore> {
  globalThis.__lsiMockStore = freshStore();
  restorePromise = Promise.resolve(globalThis.__lsiMockStore);
  if (persistEnabled()) {
    try {
      const { rm } = await import("node:fs/promises");
      await rm(PERSIST_PATH, { force: true });
    } catch {
      /* ignore */
    }
  }
  persist(globalThis.__lsiMockStore);
  return globalThis.__lsiMockStore;
}

export function storeCounts(store: MockStore): Record<string, number> {
  return seedCounts(store);
}
