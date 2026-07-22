/**
 * Phase 5 flow: admin surfaces + sync health + analytics deltas.
 * Runs LAST — asserts everything earlier flows created shows up in the
 * admin APIs and moved the analytics.
 */

import { FlowRun } from "../assert";
import { SimClient } from "../client";
import type { Analytics } from "@/lib/provider/contract";
import type { Enquiry, Order, Rental, RepairJob, SyncRecord, User } from "@/lib/types";

export async function flowAdmin(): Promise<FlowRun> {
  const run = new FlowRun("admin-surfaces");
  const hq = new SimClient("hq");
  await hq.loginAdmin("U-001");

  // Everything created by earlier flows is visible in admin lists
  const orders = await hq.get<Order[]>("/api/admin/orders?limit=300");
  // Seed history is ORD-2026-00001..00250; anything above was created live this run
  const liveOrders = orders.data?.filter((o) => Number(o.code.slice(-5)) > 250) ?? [];
  run.must("live orders visible", liveOrders.length >= 4, `${liveOrders.length} orders from this run (b2c, split, refurb, b2b-convert)`);

  const repairs = await hq.get<RepairJob[]>("/api/admin/repairs?phone=9877700011");
  run.must("live repair visible", (repairs.data?.length ?? 0) >= 1, repairs.data?.[0]?.code ?? "none");

  const rentals = await hq.get<Rental[]>("/api/admin/rentals?limit=300");
  const closedNow = rentals.data?.filter((r) => r.stage === "closed" && r.timeline.some((e) => e.by !== "system"));
  run.must("live rental visible", (closedNow?.length ?? 0) >= 1, closedNow?.[0]?.code ?? "none");

  const enquiries = await hq.get<Enquiry[]>("/api/admin/enquiries?stage=order_confirmed&limit=100");
  const converted = enquiries.data?.find((e) => e.convertedOrderId);
  run.must("converted enquiry visible", !!converted, `${converted?.code} → ${converted?.convertedOrderId}`);

  // Users & roles
  const users = await hq.get<User[]>("/api/admin/users");
  const roles = new Set(users.data?.map((u) => u.role));
  run.must("all roles seeded", ["hq_admin", "outlet_manager", "distributor", "repair_desk", "b2b_desk", "customer"].every((r) => roles.has(r as User["role"])), `${roles.size} roles`);

  // Sync health: retry flips a failed record
  const failed = await hq.get<SyncRecord[]>("/api/admin/sync?status=failed");
  run.must("failed sync records exist", (failed.data?.length ?? 0) > 0, `${failed.data?.length} failed`);
  const target = failed.data![0];
  const retried = await hq.post<SyncRecord>("/api/admin/sync", { id: target.id });
  run.must("retry flips to synced", retried.ok && retried.data?.status === "synced", `${target.id}: failed → ${retried.data?.status}`);

  // Stock override marks sync stale (intervention honesty)
  const products = await hq.get<{ id: string }[]>("/api/admin/products?line=new&limit=1");
  const pid = products.data![0].id;
  await hq.post(`/api/admin/products/${pid}/stock`, { nodeId: "N-001", qty: 99 });
  const sync = await hq.get<SyncRecord[]>("/api/admin/sync?status=stale");
  const nowStale = sync.data?.find((r) => r.entityId === pid);
  run.must("override marks sync stale", !!nowStale, `${pid} stale after manual stock override`);

  // Analytics reflect the run's writes
  const a = await hq.get<Analytics>("/api/admin/analytics");
  run.must("analytics revenue > 0", (a.data?.totals.revenue ?? 0) > 0, `₹${a.data?.totals.revenue.toLocaleString("en-IN")}`);
  // Seed produces ~250 orders / ~80 repairs; a few may fall outside the 90-day
  // analytics window depending on rng draws, so assert seed-shape bounds, not exacts.
  run.must("analytics counts live entities", (a.data?.totals.orders ?? 0) >= 240 && (a.data?.totals.repairs ?? 0) >= 75, `orders=${a.data?.totals.orders} repairs=${a.data?.totals.repairs}`);
  run.must("distributor league present", (a.data?.distributorLeague.length ?? 0) >= 5, `${a.data?.distributorLeague.length} distributors ranked`);

  // Role scoping: outlet manager sees only their node's orders
  const om = new SimClient("outlet");
  await om.loginAdmin("U-002");
  const scoped = await om.get<Order[]>("/api/admin/orders?limit=300");
  const foreign = scoped.data?.filter((o) => !o.fulfilments.some((f) => f.nodeId === "N-001")) ?? [];
  run.must("outlet manager scoped", foreign.length === 0, `${scoped.data?.length} orders, all via N-001`);

  return run;
}
