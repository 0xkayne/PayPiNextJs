import { NextRequest } from "next/server";
import { loginUser } from "@/lib/db";
import { json } from "@/lib/http";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body ?? {};
  const r = loginUser({ username, password });
  if ("error" in r) return json(r, { status: 400 });
  return json(r);
}


