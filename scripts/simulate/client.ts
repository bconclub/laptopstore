/**
 * Typed HTTP client for the simulation harness. Keeps a cookie jar per
 * client so flows can act as different roles/users concurrently.
 */

export const BASE = process.env.SIM_BASE_URL || "http://localhost:3050";

export interface ApiResult<T = unknown> {
  status: number;
  ok: boolean;
  data?: T;
  error?: string;
  allowed?: string[];
}

export class SimClient {
  private cookie = "";
  constructor(readonly label: string) {}

  private headers(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.cookie) h["cookie"] = this.cookie;
    if (json) h["content-type"] = "application/json";
    return h;
  }

  private capture(res: Response) {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(";");
      if (pair.startsWith("lsi-session=")) this.cookie = pair;
    }
  }

  async get<T = unknown>(path: string): Promise<ApiResult<T>> {
    const res = await fetch(`${BASE}${path}`, { headers: this.headers() });
    this.capture(res);
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, ok: body.ok === true, data: body.data as T, error: body.error as string, allowed: body.allowed as string[] };
  }

  async post<T = unknown>(path: string, payload?: unknown): Promise<ApiResult<T>> {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: this.headers(true),
      body: payload == null ? undefined : JSON.stringify(payload),
    });
    this.capture(res);
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, ok: body.ok === true, data: body.data as T, error: body.error as string, allowed: body.allowed as string[] };
  }

  async patch<T = unknown>(path: string, payload?: unknown): Promise<ApiResult<T>> {
    const res = await fetch(`${BASE}${path}`, {
      method: "PATCH",
      headers: this.headers(true),
      body: payload == null ? undefined : JSON.stringify(payload),
    });
    this.capture(res);
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, ok: body.ok === true, data: body.data as T, error: body.error as string, allowed: body.allowed as string[] };
  }

  /** Storefront login: mock OTP 0000. */
  async loginPhone(phone: string): Promise<void> {
    await this.post("/api/auth/otp", { phone });
    const r = await this.post("/api/auth/verify", { phone, otp: "0000" });
    if (!r.ok) throw new Error(`login failed for ${phone}: ${r.error}`);
  }

  /** Admin login: one-click seeded staff user. */
  async loginAdmin(userId: string): Promise<void> {
    const r = await this.post("/api/auth/admin-login", { userId });
    if (!r.ok) throw new Error(`admin login failed for ${userId}: ${r.error}`);
  }
}
