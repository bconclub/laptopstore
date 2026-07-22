import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const p = getProvider();
    const product = await p.getProductBySlug(slug);
    if (!product) return err(404, `No product: ${slug}`);

    const [nodeStock, serialUnits, rentalUnits, tiers] = await Promise.all([
      p.getNodeStock(product.id),
      product.line === "refurbished" ? p.getSerialUnits(product.id) : Promise.resolve([]),
      product.line === "rental" ? p.getRentalUnits(product.id) : Promise.resolve([]),
      p.getPriceTiers(product.id),
    ]);

    const totalStock =
      product.line === "rental"
        ? rentalUnits.filter((u) => u.status === "in_fleet").length
        : product.line === "refurbished"
          ? serialUnits.filter((u) => u.status === "available").length
          : nodeStock.reduce((s, r) => s + r.qty, 0);

    return ok({
      product,
      totalStock,
      nodeStock,
      serialUnits: serialUnits.filter((u) => u.status === "available"),
      rentalUnits,
      priceTiers: tiers,
    });
  } catch (e) {
    return handleError(e);
  }
}
