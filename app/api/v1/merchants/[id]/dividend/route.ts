import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createA2UPayment, submitA2UPayment, completeA2UPayment } from "@/lib/pi-network";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * 商家分红分配接口
 * 按照用户的累计付款金额占比分配分红
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req as unknown as Request);
  if (auth.error) return auth.res;

  const { id: merchantPaycodeId } = await params;

  try {
    // 1. 获取商家二维码信息
    const merchantPaycode = await prisma.merchantPaycode.findUnique({
      where: { id: merchantPaycodeId },
    });

    if (!merchantPaycode) {
      return json({ error: "商家不存在" }, { status: 404 });
    }

    // 2. 验证是否为商家所有者
    if (merchantPaycode.ownerUserId !== auth.user.id) {
      return json({ error: "无权操作" }, { status: 403 });
    }

    // 3. 检查分红池余额
    const dividendPool = Number(merchantPaycode.dividendPool);
    if (dividendPool <= 0) {
      return json({ error: "分红池余额不足" }, { status: 400 });
    }

    // 4. 聚合每个用户的累计付款金额
    const payerStats = await prisma.merchantPayment.groupBy({
      by: ['payerUid'],
      where: {
        merchantPaycodeId,
        a2uStatus: 'completed',  // 只统计已完成的付款
      },
      _sum: {
        totalAmount: true,
      },
    });

    if (payerStats.length === 0) {
      return json({ error: "暂无付款记录" }, { status: 400 });
    }

    // 5. 计算总付款金额
    const totalPaid = payerStats.reduce((sum, stat) => {
      const amount = stat._sum.totalAmount;
      return sum + (amount ? Number(amount) : 0);
    }, 0);

    if (totalPaid <= 0) {
      return json({ error: "总付款金额为0" }, { status: 400 });
    }

    // 6. 创建分红分配记录
    const distribution = await prisma.merchantDividendDistribution.create({
      data: {
        merchantPaycodeId,
        totalDividend: dividendPool,
        recipientCount: payerStats.length,
        status: 'pending',
      },
    });

    console.log(`创建分红分配任务: ${distribution.id}, 总额: ${dividendPool} Pi, 受益人: ${payerStats.length}`);

    // 7. 异步处理分红分配
    processDividendDistribution({
      distributionId: distribution.id,
      merchantPaycodeId,
      payerStats: payerStats.map(stat => ({
        payerUid: stat.payerUid,
        totalPaidAmount: Number(stat._sum.totalAmount || 0),
      })),
      totalPaid,
      dividendPool,
    }).catch(err => {
      console.error("分红分配失败:", err);
      // 更新状态为失败
      prisma.merchantDividendDistribution.update({
        where: { id: distribution.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
        },
      }).catch(console.error);
    });

    return json({
      ok: true,
      data: {
        distributionId: distribution.id,
        totalDividend: dividendPool,
        recipientCount: payerStats.length,
      },
    });

  } catch (error) {
    console.error("创建分红分配失败:", error);
    return json({
      error: "分红分配失败",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// 异步处理分红分配
async function processDividendDistribution(params: {
  distributionId: string;
  merchantPaycodeId: string;
  payerStats: Array<{ payerUid: string; totalPaidAmount: number }>;
  totalPaid: number;
  dividendPool: number;
}) {
  const { distributionId, merchantPaycodeId, payerStats, totalPaid, dividendPool } = params;

  try {
    console.log(`开始处理分红分配: ${distributionId}`);

    // 1. 更新状态为处理中
    await prisma.merchantDividendDistribution.update({
      where: { id: distributionId },
      data: { status: 'processing' },
    });

    // 2. 为每个付款用户创建分红并发起 A2U 支付
    let totalDistributed = 0;
    const results: Array<{ success: boolean; payerUid: string; error?: string }> = [];

    for (const stat of payerStats) {
      try {
        // 计算占比和分红金额
        const percentage = stat.totalPaidAmount / totalPaid;
        const dividendAmount = Math.floor(dividendPool * percentage * 1000000) / 1000000;

        // 确保分红金额 > 0
        if (dividendAmount <= 0) {
          console.log(`跳过用户 ${stat.payerUid}，分红金额为 0`);
          continue;
        }

        totalDistributed += dividendAmount;

        console.log(`处理用户 ${stat.payerUid} 的分红: ${dividendAmount} Pi (占比: ${(percentage * 100).toFixed(2)}%)`);

        // 查找用户信息
        const recipientUser = await prisma.piUser.findUnique({
          where: { piUid: stat.payerUid },
        });

        // 创建 A2U 支付
        const a2uPaymentId = await createA2UPayment({
          uid: stat.payerUid,
          amount: dividendAmount,
          memo: `商家分红 ${dividendAmount} Pi`,
          metadata: {
            distributionId,
            type: "merchant-dividend",
            payerUid: stat.payerUid,
          },
        });

        console.log(`创建 A2U 分红支付: ${a2uPaymentId}`);

        // 创建分红支付记录
        const dividendPayment = await prisma.merchantDividendPayment.create({
          data: {
            distributionId,
            recipientUserId: recipientUser?.id,
            recipientUid: stat.payerUid,
            totalPaidAmount: stat.totalPaidAmount,
            percentage,
            dividendAmount,
            paymentId: a2uPaymentId,
            status: 'created',
          },
        });

        // 提交到区块链
        const txid = await submitA2UPayment(a2uPaymentId);
        console.log(`提交 A2U 分红支付到区块链: ${txid}`);

        await prisma.merchantDividendPayment.update({
          where: { id: dividendPayment.id },
          data: {
            txid,
            status: 'submitted',
          },
        });

        // 完成支付
        await completeA2UPayment(a2uPaymentId, txid);
        console.log(`完成 A2U 分红支付: ${a2uPaymentId}`);

        await prisma.merchantDividendPayment.update({
          where: { id: dividendPayment.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        results.push({ success: true, payerUid: stat.payerUid });

      } catch (error) {
        console.error(`处理用户 ${stat.payerUid} 的分红失败:`, error);

        // 创建失败记录
        await prisma.merchantDividendPayment.create({
          data: {
            distributionId,
            recipientUid: stat.payerUid,
            totalPaidAmount: stat.totalPaidAmount,
            percentage: stat.totalPaidAmount / totalPaid,
            dividendAmount: Math.floor(dividendPool * (stat.totalPaidAmount / totalPaid) * 1000000) / 1000000,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        }).catch(console.error);

        results.push({
          success: false,
          payerUid: stat.payerUid,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // 3. 统计结果
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    const finalStatus = failedCount > 0
      ? (successCount > 0 ? 'partial_completed' : 'failed')
      : 'completed';

    // 4. 更新分红分配状态并清空分红池
    await prisma.$transaction([
      prisma.merchantDividendDistribution.update({
        where: { id: distributionId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      }),
      // 清空分红池（只清空成功分配的部分）
      prisma.merchantPaycode.update({
        where: { id: merchantPaycodeId },
        data: {
          dividendPool: dividendPool - totalDistributed,
        },
      }),
    ]);

    console.log(`分红分配完成: ${distributionId}, 状态: ${finalStatus}, 成功: ${successCount}, 失败: ${failedCount}`);

  } catch (error) {
    console.error(`分红分配处理失败 (${distributionId}):`, error);

    // 更新为失败状态
    await prisma.merchantDividendDistribution.update({
      where: { id: distributionId },
      data: {
        status: 'failed',
        completedAt: new Date(),
      },
    });

    throw error;
  }
}
