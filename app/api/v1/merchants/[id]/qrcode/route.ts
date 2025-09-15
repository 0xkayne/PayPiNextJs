import { json } from "@/lib/http";
import { getMerchantById, getMerchantPaycodePayload } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const m = getMerchantById(id as any);
  if ("error" in m) return json(m, { status: 404 });
  const payload = getMerchantPaycodePayload(id as any);
  return json({ data: { merchant: m.data, paycode: payload } });
}


