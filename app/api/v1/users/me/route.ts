import { json, requireAuth } from "@/lib/http";

export async function GET(req: Request) {
  const { error, res, user } = requireAuth(req as any);
  if (error) return res;
  const { passwordHash, ...safe } = user as any;
  return json({ data: safe });
}


