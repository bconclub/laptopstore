/** Assertion + evidence collection for simulation flows. */

export interface StepResult {
  name: string;
  pass: boolean;
  evidence: string;
}

export class FlowRun {
  readonly steps: StepResult[] = [];
  constructor(readonly flow: string) {}

  check(name: string, cond: boolean, evidence: string): boolean {
    this.steps.push({ name, pass: cond, evidence });
    const icon = cond ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${name} — ${evidence}`);
    return cond;
  }

  must(name: string, cond: boolean, evidence: string): void {
    if (!this.check(name, cond, evidence)) {
      throw new FlowAbort(`${this.flow}: ${name} failed (${evidence})`);
    }
  }

  get pass(): boolean {
    return this.steps.every((s) => s.pass);
  }
}

export class FlowAbort extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowAbort";
  }
}
