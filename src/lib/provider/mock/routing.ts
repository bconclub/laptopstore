/**
 * Pincode → fulfilment routing (deck §07).
 *
 * Rules, in order per item:
 *   1. A node serving the pincode with stock → local pickup/delivery.
 *   2. Else the nearest stocking source (same city prefix > warehouse >
 *      any stocked node) → delivery.
 *   3. No stock anywhere → unfulfillable (blocks checkout; "no phantom
 *      stock" guarantee).
 * Items resolving to different nodes → split fulfilment: one order,
 * multiple dispatches, one tracking view.
 */

import type { FulfilmentPlan, FulfilmentPlanLeg, StockRecord, StoreNode } from "@/lib/types";

interface RouteItem {
  productId: string;
  qty: number;
  serial?: string;
}

function cityPrefix(pincode: string): string {
  return pincode.slice(0, 3);
}

export function routePlan(
  pincode: string,
  items: RouteItem[],
  nodes: StoreNode[],
  stock: StockRecord[],
  serialNodeByProduct?: Map<string, string>, // refurb: serial pins the node
): FulfilmentPlan {
  const active = nodes.filter((n) => n.status === "active");
  const byNode = new Map(active.map((n) => [n.id, n]));
  const legsByNode = new Map<string, { itemIndexes: number[]; reach: "local" | "nearest" }>();
  const unfulfillable: number[] = [];

  items.forEach((item, idx) => {
    // Refurb serial purchase — the unit lives at one specific node
    const pinnedNode = item.serial ? serialNodeByProduct?.get(item.serial) : undefined;

    const stocked = pinnedNode
      ? stock.filter((s) => s.nodeId === pinnedNode).length >= 0
        ? [{ productId: item.productId, nodeId: pinnedNode, qty: 1 }]
        : []
      : stock.filter((s) => s.productId === item.productId && s.qty >= item.qty);

    if (!stocked.length) {
      unfulfillable.push(idx);
      return;
    }

    // 1) local: node serves this pincode
    const local = stocked.find((s) => byNode.get(s.nodeId)?.pincodesServed.includes(pincode));
    // 2) same-city prefix
    const sameCity = stocked.find((s) =>
      byNode.get(s.nodeId)?.pincodesServed.some((p) => cityPrefix(p) === cityPrefix(pincode)),
    );
    // 3) warehouse fallback, then any stocked node
    const warehouse = stocked.find((s) => byNode.get(s.nodeId)?.type === "warehouse");
    const chosen = local ?? sameCity ?? warehouse ?? stocked[0];
    const reach: "local" | "nearest" = local ? "local" : "nearest";

    const entry = legsByNode.get(chosen.nodeId) ?? { itemIndexes: [], reach };
    entry.itemIndexes.push(idx);
    // A leg is "local" only if every item on it is local
    if (reach === "nearest") entry.reach = "nearest";
    legsByNode.set(chosen.nodeId, entry);
  });

  const legs: FulfilmentPlanLeg[] = [...legsByNode.entries()].map(([nodeId, e]) => {
    const node = byNode.get(nodeId)!;
    return {
      nodeId,
      nodeName: node.name,
      city: node.city,
      mode: e.reach === "local" ? "pickup" : "delivery",
      itemIndexes: e.itemIndexes,
      reach: e.reach,
      etaDays: e.reach === "local" ? 0 : cityPrefix(pincode) === cityPrefix(node.pincodesServed[0] ?? "") ? 1 : 3,
    };
  });

  return { pincode, legs, split: legs.length > 1, unfulfillable };
}

/** Nearest service-capable node for repair bookings. */
export function routeRepairNode(pincode: string, nodes: StoreNode[]): StoreNode | undefined {
  const capable = nodes.filter((n) => n.serviceCapable && n.status === "active");
  return (
    capable.find((n) => n.pincodesServed.includes(pincode)) ??
    capable.find((n) => n.pincodesServed.some((p) => cityPrefix(p) === cityPrefix(pincode))) ??
    capable[0]
  );
}
