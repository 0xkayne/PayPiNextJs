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
      merchantUid: rec.merchantUid,
      dividendPool: Number(rec.dividendPool),
      initialAmount: Number(rec.initialAmount),
      payload: JSON.parse(rec.payloadJson),
      qrPngDataUrl: rec.qrPngDataUrl,
      // 兼容旧字段
      piAddress: rec.piAddress,
      startPi: rec.startPi ? Number(rec.startPi) : undefined,
    },
  });
}


