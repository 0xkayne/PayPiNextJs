import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { createRedEnvelope } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req as unknown as Request);
  if (auth.error) return auth.res;
  const body = await req.json().catch(() => ({}));
  const { amountPi, expiresAt } = body ?? {};
  const r = createRedEnvelope({
    creatorUserId: auth.user.id,
    amountPi: Number(amountPi),
    expiresAt,
  });
  if ("error" in r) return json(r, { status: 400 });
  return json(r);
}


