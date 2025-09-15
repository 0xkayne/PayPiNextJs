import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { claimRedEnvelope } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.res;
  const body = await req.json().catch(() => ({}));
  const { code } = body ?? {};
  const r = claimRedEnvelope({ code, claimerUserId: auth.user.id });
  if ("error" in r) return json(r, { status: 400 });
  return json(r);
}


