/**
 * Simulation harness orchestrator.
 *   npm run simulate            → all flows (reset first)
 *   npm run simulate -- reads   → one flow
 * Requires a running server (SIM_BASE_URL, default http://localhost:3050).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FlowAbort, type FlowRun } from "./assert";
import { SimClient, BASE } from "./client";
import { flowReads } from "./flows/reads";
import { flowGuarantees, flowPurchaseB2c, flowPurchaseSplit } from "./flows/purchase";
import { flowEnquiryB2b, flowRental, flowRepair } from "./flows/services";
import { flowAdmin } from "./flows/admin";

const FLOWS: Record<string, () => Promise<FlowRun>> = {
  reads: flowReads,
  "purchase-b2c": flowPurchaseB2c,
  "purchase-split": flowPurchaseSplit,
  repair: flowRepair,
  rental: flowRental,
  "enquiry-b2b": flowEnquiryB2b,
  guarantees: flowGuarantees,
  "admin-surfaces": flowAdmin,
};

async function main() {
  const pick = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const skipReset = process.argv.includes("--no-reset");
  const names = pick.length ? pick : Object.keys(FLOWS);

  console.log(`simulate → ${BASE} · flows: ${names.join(", ")}`);

  // Reset to deterministic baseline
  if (!skipReset) {
    const hq = new SimClient("hq");
    await hq.loginAdmin("U-001");
    const r = await hq.post<{ counts: Record<string, number> }>("/api/admin/dev/reset");
    if (!r.ok) {
      console.error(`reset failed: ${r.error}`);
      process.exit(1);
    }
    console.log(`reset ok · products=${r.data?.counts.products} orders=${r.data?.counts.orders}\n`);
  }

  const results: FlowRun[] = [];
  for (const name of names) {
    const flow = FLOWS[name];
    if (!flow) {
      console.error(`unknown flow: ${name} (have: ${Object.keys(FLOWS).join(", ")})`);
      process.exit(1);
    }
    console.log(`── flow: ${name} ──`);
    try {
      results.push(await flow());
    } catch (e) {
      if (e instanceof FlowAbort) {
        console.error(`  aborted: ${e.message}`);
        const dead = results.find((r) => r.flow === name);
        if (!dead) {
          const stub = { flow: name, steps: [{ name: "aborted", pass: false, evidence: e.message }], pass: false } as unknown as FlowRun;
          results.push(stub);
        }
      } else {
        throw e;
      }
    }
    console.log("");
  }

  // Report
  const summary = results.map((r) => ({
    flow: r.flow,
    steps: r.steps.length,
    passed: r.steps.filter((s) => s.pass).length,
    pass: r.pass,
  }));
  console.table(summary);

  const report = {
    at: new Date().toISOString(),
    base: BASE,
    flows: results.map((r) => ({ flow: r.flow, pass: r.pass, steps: r.steps })),
    pass: results.every((r) => r.pass),
  };
  const dir = join("scripts", "simulate", "reports");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `run-${report.at.replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`report: ${file}`);
  console.log(report.pass ? "SIMULATION PASS" : "SIMULATION FAIL");
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error("simulate crashed:", e);
  process.exit(1);
});
