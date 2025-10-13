import { json, requireAuth } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.res;

  const rec = await prisma.merchantPaycode.findUnique({ where: { ownerUserId: auth.user.id } });
  if (!rec) return json({ data: null });

  return json({
    data: {
      id: rec.id,
      piAddress: rec.piAddress,
      startPi: Number(rec.startPi),
      payload: JSON.parse(rec.payloadJson),
      qrPngDataUrl: rec.qrPngDataUrl,
    },
  });
}


