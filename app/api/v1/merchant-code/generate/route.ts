import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

const PI_ADDR_RE = /^[A-Z0-9]{56}$/;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req as unknown as Request);
  if (auth.error) return auth.res;

  const body = await req.json().catch(() => ({}));
  const { piAddress, startPi } = body ?? {};

  if (!PI_ADDR_RE.test(piAddress)) {
    return json({ error: "Pi 地址格式非法（需 56 位大写字母或数字）" }, { status: 400 });
  }
  const start = Number(startPi);
  if (!Number.isFinite(start) || start < 0) {
    return json({ error: "Start money 非法" }, { status: 400 });
  }

  // 幂等：同一用户只保留一份记录
  const existing = await prisma.merchantPaycode.findUnique({ where: { ownerUserId: auth.user.id } });
  if (existing) {
    return json({
      data: {
        id: existing.id,
        piAddress: existing.piAddress,
        startPi: Number(existing.startPi),
        payload: JSON.parse(existing.payloadJson),
        qrPngDataUrl: existing.qrPngDataUrl,
      },
    });
  }

  const payload = { type: "paypi", version: 1, piAddress, startPi: start };
  const payloadStr = JSON.stringify(payload);
  const qrPngDataUrl = await QRCode.toDataURL(payloadStr, { errorCorrectionLevel: "M" });

  const created = await prisma.merchantPaycode.create({
    data: {
      ownerUserId: auth.user.id,
      piAddress,
      startPi: start,
      payloadJson: payloadStr,
      qrPngDataUrl,
    },
  });

  return json({ data: { id: created.id, piAddress, startPi: Number(created.startPi), payload, qrPngDataUrl } });
}


