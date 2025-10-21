import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { envelopeId, paymentId, txid } = await req.json();

    if (!envelopeId || !paymentId || !txid) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "服务器配置错误" }, { status: 500 });
    }

    // 1. 验证红包存在
    const envelope = await prisma.redEnvelope.findUnique({
      where: { id: envelopeId },
    });

    if (!envelope) {
      return Response.json({ error: "红包不存在" }, { status: 404 });
    }

    if (envelope.u2aPaymentId !== paymentId) {
      return Response.json({ error: "支付ID不匹配" }, { status: 400 });
    }

    // 2. 完成支付
    const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    if (!completeRes.ok) {
      const errorText = await completeRes.text();
      console.error("完成支付失败:", errorText);
      return Response.json({ error: "完成支付失败" }, { status: 500 });
    }

    // 3. 更新红包状态为 active（可被领取）
    await prisma.redEnvelope.update({
      where: { id: envelopeId },
      data: {
        u2aTxid: txid,
        u2aStatus: "completed",
        status: "active",
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("完成U2A支付失败:", error);
    return Response.json({ error: "完成支付失败" }, { status: 500 });
  }
}

