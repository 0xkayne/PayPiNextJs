import { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createA2UPayment, submitA2UPayment, completeA2UPayment } from "@/lib/pi-network";

/**
 * 商家收款完成接口
 * 处理用户向商家的支付，自动分账并转账
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { paymentId, txid, merchantUid } = body ?? {};

  if (!paymentId || !txid || !merchantUid) {
    return json({ error: "缺少必要参数" }, { status: 400 });
  }

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    return json({ error: "服务器未配置" }, { status: 500 });
  }

  try {
    // 1. 获取并验证 U2A 支付详情
    const paymentRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (!paymentRes.ok) {
      return json({ error: "无法获取支付详情" }, { status: 500 });
    }

    const payment = await paymentRes.json();

    // 2. 完成 U2A 支付（用户到 App）
    const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    if (!completeRes.ok) {
      const text = await completeRes.text().catch(() => "");
      return json({ error: `完成支付失败`, details: text }, { status: 500 });
    }

    // 3. 查找商家二维码
    const merchantPaycode = await prisma.merchantPaycode.findFirst({
      where: { merchantUid },
    });

    if (!merchantPaycode) {
      return json({ error: "商家不存在" }, { status: 404 });
    }

    // 4. 计算分账（支付金额已扣除 0.01 Pi）
    const totalAmount = Number(payment.amount);

    // 95% 转给商家（向下取整到 6 位小数）
    const merchantAmount = Math.floor(totalAmount * 0.95 * 1000000) / 1000000;

    // 5% 进入分红池（向上取整到 6 位小数）
    const dividendAmount = Math.ceil(totalAmount * 0.05 * 1000000) / 1000000;

    // 5. 获取付款人信息
    const payerUid = payment.user_uid;
    let payerUser = null;
    if (payerUid) {
      payerUser = await prisma.piUser.findUnique({
        where: { piUid: payerUid },
      });
    }

    // 6. 创建商家收款记录
    const merchantPayment = await prisma.merchantPayment.create({
      data: {
        merchantPaycodeId: merchantPaycode.id,
        payerUserId: payerUser?.id,
        payerUid: payerUid,
        totalAmount,
        merchantAmount,
        dividendAmount,
        u2aPaymentId: paymentId,
        u2aTxid: txid,
        a2uStatus: "pending",
      },
    });

    // 7. 异步处理 A2U 转账（转给商家）和更新分红池
    processMerchantPayment({
      merchantPaymentId: merchantPayment.id,
      merchantPaycodeId: merchantPaycode.id,
      merchantUid,
      merchantAmount,
      dividendAmount,
    }).catch(err => {
      console.error("处理商家收款失败:", err);
      // 更新状态为失败
      prisma.merchantPayment.update({
        where: { id: merchantPayment.id },
        data: {
          a2uStatus: "failed",
          a2uErrorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      }).catch(console.error);
    });

    return json({
      ok: true,
      data: {
        merchantPaymentId: merchantPayment.id,
        merchantAmount,
        dividendAmount,
      }
    });

  } catch (error) {
    console.error("商家收款处理失败:", error);
    return json({
      error: "处理失败，请重试",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// 异步处理商家收款（A2U 转账和更新分红池）
async function processMerchantPayment(params: {
  merchantPaymentId: string;
  merchantPaycodeId: string;
  merchantUid: string;
  merchantAmount: number;
  dividendAmount: number;
}) {
  const { merchantPaymentId, merchantPaycodeId, merchantUid, merchantAmount, dividendAmount } = params;

  try {
    console.log(`开始处理商家收款: ${merchantPaymentId}`);

    // 1. 创建 A2U 支付（App 转给商家）
    const a2uPaymentId = await createA2UPayment({
      uid: merchantUid,
      amount: merchantAmount,
      memo: `商家收款 ${merchantAmount} Pi`,
      metadata: {
        merchantPaymentId,
        type: "merchant-payment",
      },
    });

    console.log(`创建 A2U 支付: ${a2uPaymentId}`);

    // 2. 更新商家收款记录状态
    await prisma.merchantPayment.update({
      where: { id: merchantPaymentId },
      data: {
        a2uPaymentId,
        a2uStatus: "created",
      },
    });

    // 3. 提交到区块链
    const a2uTxid = await submitA2UPayment(a2uPaymentId);
    console.log(`提交 A2U 支付到区块链: ${a2uTxid}`);

    await prisma.merchantPayment.update({
      where: { id: merchantPaymentId },
      data: {
        a2uTxid,
        a2uStatus: "submitted",
      },
    });

    // 4. 完成 A2U 支付
    await completeA2UPayment(a2uPaymentId, a2uTxid);
    console.log(`完成 A2U 支付: ${a2uPaymentId}`);

    // 5. 更新商家收款记录状态和分红池
    await prisma.$transaction([
      // 更新收款记录
      prisma.merchantPayment.update({
        where: { id: merchantPaymentId },
        data: {
          a2uStatus: "completed",
          completedAt: new Date(),
        },
      }),
      // 增加商家分红池
      prisma.merchantPaycode.update({
        where: { id: merchantPaycodeId },
        data: {
          dividendPool: {
            increment: dividendAmount,
          },
        },
      }),
    ]);

    console.log(`商家收款处理完成: ${merchantPaymentId}, 分红池增加: ${dividendAmount} Pi`);

  } catch (error) {
    console.error(`处理商家收款失败 (${merchantPaymentId}):`, error);

    // 更新为失败状态
    await prisma.merchantPayment.update({
      where: { id: merchantPaymentId },
      data: {
        a2uStatus: "failed",
        a2uErrorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}

