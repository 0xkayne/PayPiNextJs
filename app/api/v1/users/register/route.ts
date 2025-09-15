import { NextRequest } from "next/server";
import { createUser } from "@/lib/db";
import { json } from "@/lib/http";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password, piAddress } = body ?? {};
  const r = createUser({ username, password, piAddress });
  if ("error" in r) return json(r, { status: 400 });
  return json(r);
}


