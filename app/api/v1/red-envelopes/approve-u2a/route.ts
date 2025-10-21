import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { envelopeId, paymentId } = await req.json();

    if (!envelopeId || !paymentId) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "服务器配置错误" }, { status: 500 });
    }

    // 1. 获取支付详情
    const paymentRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (!paymentRes.ok) {
      return Response.json({ error: "获取支付详情失败" }, { status: 500 });
    }

    const payment = await paymentRes.json();

    // 2. 验证支付元数据
    const envelope = await prisma.redEnvelope.findUnique({
      where: { id: envelopeId },
    });

    if (!envelope) {
      return Response.json({ error: "红包不存在" }, { status: 404 });
    }

    // 3. 验证金额
    if (payment.amount !== parseFloat(envelope.amountPi.toString())) {
      return Response.json({ error: "支付金额不匹配" }, { status: 400 });
    }

    // 4. 验证元数据
    if (payment.metadata?.envelopeId !== envelopeId) {
      return Response.json({ error: "支付元数据不匹配" }, { status: 400 });
    }

    // 5. 更新红包记录
    await prisma.redEnvelope.update({
      where: { id: envelopeId },
      data: { u2aPaymentId: paymentId },
    });

    // 6. 批准支付
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!approveRes.ok) {
      const errorText = await approveRes.text();
      console.error("批准支付失败:", errorText);
      return Response.json({ error: "批准支付失败" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("批准U2A支付失败:", error);
    return Response.json({ error: "批准支付失败" }, { status: 500 });
  }
}

