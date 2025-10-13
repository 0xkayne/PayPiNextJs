import { json, requireAuth } from "@/lib/http";

export async function GET(req: Request) {
  const { error, res, user } = await requireAuth(req);
  if (error) return res;
  const { id, username, piAddress, createdAt } = user;
  return json({ data: { id, username, piAddress, createdAt } });
}


