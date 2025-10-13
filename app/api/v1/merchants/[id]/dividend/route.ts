import { json, requireAuth } from "@/lib/http";
import { payoutDividend } from "@/lib/db";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string | string[] | undefined }> }
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.res;
  const { id } = await ctx.params;
  const merchantId = Array.isArray(id) ? id[0] : id;
  if (!merchantId) return json({ error: "缺少商户ID" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const recipients = Array.isArray(body?.recipients) ? body.recipients : [];
  const r = payoutDividend({ merchantId, recipients });
  if ("error" in r) return json(r, { status: 400 });
  return json(r);
}


