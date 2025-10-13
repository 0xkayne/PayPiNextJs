import { NextRequest } from "next/server";
import { getTransactionsByUser } from "@/lib/db";
import { json, requireAuth } from "@/lib/http";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req as unknown as Request);
  if (auth.error) return auth.res;
  const r = getTransactionsByUser(auth.user.id);
  return json(r);
}


