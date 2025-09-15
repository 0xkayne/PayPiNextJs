import { json } from "@/lib/http";
import { getMerchantById, getMerchantPaycodePayload } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string | string[] | undefined }> }
) {
  const { id } = await ctx.params;
  const merchantId = Array.isArray(id) ? id[0] : id;
  const m = getMerchantById(merchantId as string);
  if ("error" in m) return json(m, { status: 404 });
  const payload = getMerchantPaycodePayload(merchantId as string);
  return json({ data: { merchant: m.data, paycode: payload } });
}


