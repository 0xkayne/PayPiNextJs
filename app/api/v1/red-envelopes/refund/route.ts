import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createA2UPayment, submitA2UPayment, completeA2UPayment } from "@/lib/pi-network";

// 验证用户登录
async function requireAuth(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { error: true, res: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || new Date(session.expiresAt) < new Date()) {
    return { error: true, res: Response.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }

  return { error: false, user: session.user };
}

export async function POST(req: NextRequest) {
  // 1. 验证用户登录
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) return auth.res;

  try {
    const { envelopeId } = await req.json();

    if (!envelopeId) {
      return Response.json({ error: "缺少红包ID" }, { status: 400 });
    }

    // 2. 查找红包
    const envelope = await prisma.redEnvelope.findUnique({
      where: { id: envelopeId },
      include: { creator: true },
    });

    if (!envelope) {
      return Response.json({ error: "红包不存在" }, { status: 404 });
    }

    // 3. 验证是创建者
    if (envelope.creatorUserId !== auth.user.id) {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    // 4. 验证状态
    if (envelope.status !== "active" && envelope.status !== "expired") {
      return Response.json({ error: "红包不可退回" }, { status: 400 });
    }

    // 5. 验证已过期
    if (new Date() <= new Date(envelope.expiresAt)) {
      return Response.json({ error: "红包未过期" }, { status: 400 });
    }

    // 6. 验证创建者有uid
    if (!envelope.creator.piUid) {
      return Response.json({ error: "创建者未设置Pi UID" }, { status: 400 });
    }

    // 7. 执行 A2U 退回给创建者
    const a2uPaymentId = await createA2UPayment({
      uid: envelope.creator.piUid,
      amount: parseFloat(envelope.amountPi.toString()),
      memo: `Refund Password Gift - ${envelope.code.substring(0, 8)}`,
      metadata: { type: "red-envelope-refund", envelopeId: envelope.id },
    });

    const a2uTxid = await submitA2UPayment(a2uPaymentId);
    await completeA2UPayment(a2uPaymentId, a2uTxid);

    // 8. 更新状态
    await prisma.redEnvelope.update({
      where: { id: envelopeId },
      data: {
        status: "refunded",
        a2uPaymentId,
        a2uTxid,
        a2uStatus: "completed",
        completedAt: new Date(),
      },
    });

    return Response.json({
      data: {
        success: true,
        amountPi: envelope.amountPi.toString(),
        txid: a2uTxid,
      },
    });
  } catch (error) {
    console.error("退回红包失败:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "退回红包失败" },
      { status: 500 }
    );
  }
}

