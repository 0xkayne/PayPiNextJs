import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

/**
 * 完成商家二维码注册
 * 在用户完成 U2A 支付后调用
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req as unknown as Request);
  if (auth.error) return auth.res;

  const body = await req.json().catch(() => ({}));
  const { paymentId, txid, startPi } = body ?? {};

  if (!paymentId || !txid) {
    return json({ error: "缺少 paymentId 或 txid" }, { status: 400 });
  }

  const initialAmount = Number(startPi);
  if (!Number.isFinite(initialAmount) || initialAmount <= 0) {
    return json({ error: "初始金额无效" }, { status: 400 });
  }

  // 检查是否已注册
  const existing = await prisma.merchantPaycode.findUnique({
    where: { ownerUserId: auth.user.id }
  });

  if (existing) {
    return json({
      error: "您已注册过商家二维码"
    }, { status: 400 });
  }

  // 获取用户的 Pi UID
  const user = await prisma.piUser.findUnique({
    where: { id: auth.user.id }
  });

  if (!user?.piUid) {
    return json({
      error: "未找到您的 Pi UID"
    }, { status: 400 });
  }

  // 验证 U2A 支付
  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    return json({ error: "服务器未配置" }, { status: 500 });
  }

  try {
    const paymentRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (!paymentRes.ok) {
      return json({ error: "无法验证支付" }, { status: 500 });
    }

    const payment = await paymentRes.json();

    // 验证支付金额
    if (payment.amount !== initialAmount) {
      return json({ error: "支付金额不匹配" }, { status: 400 });
    }

    // 更宽松的状态检查 - 只要交易已验证即可
    if (!payment.status?.transaction_verified) {
      return json({ error: "交易尚未在区块链上验证" }, { status: 400 });
    }

    // 如果还没有完成，先完成它
    if (!payment.status?.developer_completed) {
      try {
        const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
          method: "POST",
          headers: {
            Authorization: `Key ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ txid }),
        });

        if (!completeRes.ok) {
          console.warn(`Failed to complete payment ${paymentId}, but continuing...`);
        }
      } catch (error) {
        console.error("Failed to complete payment:", error);
        // 继续执行，因为可能已经在其他地方完成了
      }
    }

    // 创建商家二维码
    const payload = {
      type: "paypi",
      version: 2,  // 版本升级
      merchantUid: user.piUid
    };
    const payloadStr = JSON.stringify(payload);
    const qrPngDataUrl = await QRCode.toDataURL(payloadStr, { errorCorrectionLevel: "M" });

    const created = await prisma.merchantPaycode.create({
      data: {
        ownerUserId: auth.user.id,
        merchantUid: user.piUid,
        dividendPool: initialAmount,
        initialAmount: initialAmount,
        registerPaymentId: paymentId,
        registerTxid: txid,
        payloadJson: payloadStr,
        qrPngDataUrl,
      },
    });

    return json({
      data: {
        id: created.id,
        merchantUid: user.piUid,
        dividendPool: Number(created.dividendPool),
        initialAmount: Number(created.initialAmount),
        qrPngDataUrl,
      },
    });
  } catch (error) {
    console.error("完成商家注册失败:", error);
    return json({
      error: "注册失败，请重试",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

