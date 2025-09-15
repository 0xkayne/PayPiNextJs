import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { registerMerchant } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.res;
  const body = await req.json().catch(() => ({}));
  const { name, receiveAddress, feePercent = 0, dividendPercent = 0 } = body ?? {};
  const r = registerMerchant({
    name,
    ownerUserId: auth.user.id,
    receiveAddress,
    feePercent: Number(feePercent),
    dividendPercent: Number(dividendPercent),
  });
  if ("error" in r) return json(r, { status: 400 });
  return json(r);
}


