import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { payoutDividend } from "@/lib/db";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.error) return auth.res;
  const { id } = ctx.params;
  const body = await req.json().catch(() => ({}));
  const recipients = Array.isArray(body?.recipients) ? body.recipients : [];
  const r = payoutDividend({ merchantId: id as any, recipients });
  if ("error" in r) return json(r, { status: 400 });
  return json(r);
}


