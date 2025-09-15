import { NextRequest } from "next/server";
import { createBatchTransactions } from "@/lib/db";
import { json, requireAuth } from "@/lib/http";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.res;
  const body = await req.json().catch(() => ({}));
  const { items, merchantId } = body ?? {};
  const r = createBatchTransactions({
    fromUserId: auth.user.id,
    items: Array.isArray(items) ? items : [],
    merchantId,
  });
  if ("error" in r) return json(r, { status: 400 });
  return json(r);
}


