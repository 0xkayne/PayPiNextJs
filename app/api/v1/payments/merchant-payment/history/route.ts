import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/**
 * 获取用户的商家支付历史
 * 返回该用户通过扫码支付给商家的所有记录
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req as unknown as Request);
  if (auth.error) return auth.res;

  try {
    // 获取用户的 Pi UID
    const user = await prisma.piUser.findUnique({
      where: { id: auth.user.id },
      select: { piUid: true }
    });

    if (!user?.piUid) {
      return json({ data: [] }); // 没有 UID，返回空数组
    }

    // 查询该用户作为付款人的所有商家支付记录
    const payments = await prisma.merchantPayment.findMany({
      where: {
        payerUid: user.piUid
      },
      include: {
        merchantPaycode: {
          select: {
            merchantUid: true,
            owner: {
              select: {
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 格式化返回数据
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      merchantUid: payment.merchantPaycode.merchantUid,
      merchantUsername: payment.merchantPaycode.owner.username,
      totalAmount: Number(payment.totalAmount),
      merchantAmount: Number(payment.merchantAmount),
      dividendAmount: Number(payment.dividendAmount),
      u2aPaymentId: payment.u2aPaymentId,
      u2aTxid: payment.u2aTxid,
      a2uPaymentId: payment.a2uPaymentId,
      a2uTxid: payment.a2uTxid,
      a2uStatus: payment.a2uStatus,
      a2uErrorMessage: payment.a2uErrorMessage,
      createdAt: payment.createdAt.toISOString(),
      completedAt: payment.completedAt?.toISOString() || null
    }));

    return json({ data: formattedPayments });

  } catch (error) {
    console.error("Failed to get merchant payment history:", error);
    return json({
      error: "Failed to load payment history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

