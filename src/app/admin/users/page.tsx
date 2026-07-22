"use client";

/** Users & roles — role matrix over the seeded accounts. */

import { useEffect, useState } from "react";
import { Th, Td, api } from "@/components/admin/ui";
import type { User } from "@/lib/types";

const ROLE_DESC: Record<string, string> = {
  hq_admin: "Everything — catalog, network, orders, sync, users",
  outlet_manager: "Own outlet's orders, repairs, stock overrides",
  distributor: "Own node's orders + commission view",
  repair_desk: "Repair pipeline at service nodes",
  b2b_desk: "Enquiry pipeline, quotes, conversions",
  customer: "Storefront account (orders/repairs/rentals by phone)",
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    void api<User[]>("/api/admin/users").then((r) => setUsers(r.data ?? []));
  }, []);

  const staff = users.filter((u) => u.role !== "customer");
  const customers = users.filter((u) => u.role === "customer");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-ink-900">Users & roles</h1>

      <section className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>User</Th><Th>Role</Th><Th>Scope</Th><Th>Permissions</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {staff.map((u) => (
              <tr key={u.id} className="hover:bg-surface">
                <Td>
                  <span className="font-medium text-ink-900">{u.name}</span>
                  <span className="block text-xs text-ink-400">{u.phone}{u.email ? ` · ${u.email}` : ""}</span>
                </Td>
                <Td><span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{u.role.replace(/_/g, " ")}</span></Td>
                <Td>{u.nodeId ?? "All nodes"}</Td>
                <Td><span className="text-xs text-ink-500">{ROLE_DESC[u.role]}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-ink-900">Customers ({customers.length})</h2>
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
          <table className="min-w-full">
            <thead className="border-b border-line">
              <tr><Th>Name</Th><Th>Phone</Th><Th>Audience</Th><Th>Company / GSTIN</Th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((u) => (
                <tr key={u.id} className="hover:bg-surface">
                  <Td>{u.name}</Td>
                  <Td>{u.phone}</Td>
                  <Td><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${u.audience === "b2b" ? "bg-brand-600 text-white" : "bg-surface text-ink-600"}`}>{u.audience}</span></Td>
                  <Td>{u.companyName ? `${u.companyName} · ${u.gstin}` : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
