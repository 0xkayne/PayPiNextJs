import { json } from "@/lib/http";
import { getUserById } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const r = getUserById(id);
  if ("error" in r) return json(r, { status: 404 });
  return json(r);
}


