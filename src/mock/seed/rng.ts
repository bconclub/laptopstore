/**
 * Deterministic PRNG for the seed. NEVER use Math.random()/Date.now() in
 * seed code — the simulation harness depends on identical output every run.
 */

export const SEED = 42;
/** Fixed "now" anchor — all seeded history is dated relative to this. */
export const NOW_ANCHOR = new Date("2026-07-22T09:00:00.000Z");

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next: () => number;
  constructor(seed = SEED) {
    this.next = mulberry32(seed);
  }
  float(): number {
    return this.next();
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  pickN<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(this.next() * copy.length), 1)[0]);
    }
    return out;
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
}

export function daysAgo(days: number, anchor = NOW_ANCHOR): Date {
  return new Date(anchor.getTime() - days * 86400_000);
}

export function daysAhead(days: number, anchor = NOW_ANCHOR): Date {
  return new Date(anchor.getTime() + days * 86400_000);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
