/**
 * Order / Enquiry / Repair / Rental state machines — exactly the flows in
 * deck §08. Every provider write validates through assertTransition(); an
 * illegal move throws TransitionError which API routes surface as 409 with
 * the allowed list. The simulation harness asserts both directions.
 */

import type { EnquiryStage, OrderStatus, RentalStage, RepairStage } from "./types";

export class TransitionError extends Error {
  readonly allowed: string[];
  constructor(entity: string, from: string, to: string, allowed: string[]) {
    super(`${entity}: illegal transition ${from} -> ${to}. Allowed: ${allowed.join(", ") || "(none — terminal)"}`);
    this.name = "TransitionError";
    this.allowed = allowed;
  }
}

type Machine<S extends string> = Record<S, S[]>;

/** Purchase: browse→cart→checkout are pre-order; the Order starts at confirmed. */
export const ORDER_MACHINE: Machine<OrderStatus> = {
  confirmed: ["processing", "cancelled"],
  processing: ["ready", "dispatched", "cancelled"],
  ready: ["dispatched", "completed", "cancelled"], // pickup orders complete from ready
  dispatched: ["completed"],
  completed: [],
  cancelled: [],
};

export const ENQUIRY_MACHINE: Machine<EnquiryStage> = {
  new: ["contacted", "lost"],
  contacted: ["requirement", "lost"],
  requirement: ["quoted", "lost"],
  quoted: ["negotiation", "order_confirmed", "lost"],
  negotiation: ["quoted", "order_confirmed", "lost"], // re-quote loops allowed
  order_confirmed: [],
  lost: [],
};

export const REPAIR_MACHINE: Machine<RepairStage> = {
  booked: ["received", "cancelled"],
  received: ["diagnosed", "cancelled"],
  diagnosed: ["quoted", "cancelled"],
  quoted: ["approved", "cancelled"],
  approved: ["in_repair", "cancelled"],
  in_repair: ["ready"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const RENTAL_MACHINE: Machine<RentalStage> = {
  enquiry: ["availability_confirmed", "cancelled"],
  availability_confirmed: ["agreement", "cancelled"],
  agreement: ["deposit_paid", "cancelled"],
  deposit_paid: ["dispatched", "cancelled"],
  dispatched: ["active"],
  active: ["return_due", "returned"],
  return_due: ["returned"],
  returned: ["closed"],
  closed: [],
  cancelled: [],
};

export function allowedTransitions<S extends string>(machine: Machine<S>, from: S): S[] {
  return machine[from] ?? [];
}

export function assertTransition<S extends string>(
  entity: string,
  machine: Machine<S>,
  from: S,
  to: S,
): void {
  const allowed = allowedTransitions(machine, from);
  if (!allowed.includes(to)) throw new TransitionError(entity, from, to, allowed);
}
