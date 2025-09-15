import { NextRequest } from "next/server";
import { createTransaction } from "@/lib/db";
import { json, requireAuth } from "@/lib/http";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.res;
  const body = await req.json().catch(() => ({}));
  const { toAddress, amountPi, merchantId } = body ?? {};
  const r = createTransaction({
    fromUserId: auth.user.id,
    toAddress,
    amountPi: Number(amountPi),
    merchantId,
  });
  if ("error" in r) return json(r, { status: 400 });
  return json(r);
}


