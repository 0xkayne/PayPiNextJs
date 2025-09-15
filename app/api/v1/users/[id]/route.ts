import { json } from "@/lib/http";
import { getUserById } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string | string[] | undefined }> }
) {
  const { id } = await ctx.params;
  const userId = Array.isArray(id) ? id[0] : id;
  const r = getUserById(userId as string);
  if ("error" in r) return json(r, { status: 404 });
  return json(r);
}


