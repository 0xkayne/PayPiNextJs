import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createA2UPayment, submitA2UPayment, completeA2UPayment } from "@/lib/pi-network";

export async function POST(req: NextRequest) {
  const { paymentId, txid } = await req.json().catch(() => ({}));
  if (!paymentId || !txid) {
    return Response.json({ error: "missing paymentId/txid" }, { status: 400 });
  }

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "server not configured" }, { status: 500 });
  }

  // 1. 获取支付详情
  const paymentRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
    headers: { Authorization: `Key ${apiKey}` },
  });

  if (!paymentRes.ok) {
    return Response.json({ error: "failed to get payment details" }, { status: 500 });
  }

  const payment = await paymentRes.json();

  // 2. 完成 U2A 支付
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
    return Response.json({ error: `complete failed`, details: text }, { status: 500 });
  }

  // 3. 检查是否为批量转账（通过 metadata 判断）
  const metadata = payment.metadata || {};
  if (metadata.batchId && metadata.recipients && Array.isArray(metadata.recipients)) {
    // 这是一笔批量转账，先创建任务记录再异步处理
    try {
      // 检查是否已存在（幂等性）
      const existing = await prisma.batchTransferTask.findUnique({
        where: { batchId: metadata.batchId },
      });

      if (!existing) {
        // 从 Pi Platform 支付对象中获取用户信息
        const payerUid = payment.user_uid || null;
        let userId = null;

        // 如果有 user_uid，尝试查找数据库中的用户
        if (payerUid) {
          const payer = await prisma.piUser.findUnique({
            where: { piUid: payerUid },
          });
          userId = payer?.id || null;
        }

        // 创建任务记录（状态为 pending）
        await prisma.batchTransferTask.create({
          data: {
            batchId: metadata.batchId,
            userId: userId,
            userPaymentId: paymentId,
            userTxid: txid,
            totalAmount: payment.amount,
            recipientCount: metadata.recipients.length,
            status: 'pending',
            metadata: JSON.stringify(metadata.recipients),
          },
        });
        console.log(`✓ Created batch task: ${metadata.batchId} (status: pending, userId: ${userId || 'unknown'})`);
      }

      // 异步触发处理
      processBatchTransfer({
        batchId: metadata.batchId,
        userPaymentId: paymentId,
        userTxid: txid,
        totalAmount: payment.amount,
        recipients: metadata.recipients,
      }).catch(err => {
        console.error('Batch transfer error:', err);
        // 更新为失败状态
        prisma.batchTransferTask.update({
          where: { batchId: metadata.batchId },
          data: { status: 'failed', completedAt: new Date() },
        }).catch(console.error);
      });
    } catch (error) {
      console.error('Failed to create batch task:', error);
      return Response.json({
        error: 'Failed to create batch task',
        details: error instanceof Error ? error.message : 'Unknown'
      }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}

// 处理批量转账分发（异步）
async function processBatchTransfer(params: {
  batchId: string;
  userPaymentId: string;
  userTxid: string;
  totalAmount: number;
  recipients: Array<{ toAddress: string; amount: number }>;
}) {
  const { batchId, recipients } = params;

  try {
    // 1. 获取并更新批量转账任务状态为 processing
    const task = await prisma.batchTransferTask.findUnique({
      where: { batchId },
    });

    if (!task) {
      throw new Error(`Batch task not found: ${batchId}`);
    }

    // 更新状态为 processing
    await prisma.batchTransferTask.update({
      where: { batchId },
      data: { status: 'processing' },
    });

    console.log(`Starting batch transfer task: ${task.id} for batchId: ${batchId}`);

    // 2. 为每个收款人创建 A2U 支付
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        // 直接使用前端传来的 Pi uid（无需查询数据库，Pi Network API 会验证）
        const recipientPiUid = recipient.toAddress;

        console.log(`Processing payment ${i + 1}/${recipients.length} to Pi uid: ${recipientPiUid}`);

        // 创建 A2U 支付 - Pi Network API 会自动验证 uid 的有效性
        const paymentId = await createA2UPayment({
          uid: recipientPiUid,
          amount: recipient.amount,
          memo: `Batch transfer ${i + 1}/${recipients.length} from batch ${batchId}`,
          metadata: {
            batchId,
            index: i,
            recipientPiUid: recipientPiUid
          },
        });

        // 记录到数据库（用于追踪）
        const a2uPayment = await prisma.a2UPayment.create({
          data: {
            batchTaskId: task.id,
            paymentId,
            toAddress: recipientPiUid,
            recipientUid: recipientPiUid,
            amount: recipient.amount,
            memo: `Batch transfer ${i + 1}/${recipients.length}`,
            status: 'created',
          },
        });

        console.log(`Created A2U payment: ${paymentId} for Pi uid: ${recipientPiUid}`);

        // 提交到区块链
        const txid = await submitA2UPayment(paymentId);
        await prisma.a2UPayment.update({
          where: { id: a2uPayment.id },
          data: {
            txid,
            status: 'submitted',
            submittedAt: new Date(),
          },
        });

        console.log(`Submitted A2U payment: ${paymentId} with txid: ${txid}`);

        // 完成支付
        await completeA2UPayment(paymentId, txid);
        await prisma.a2UPayment.update({
          where: { id: a2uPayment.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        console.log(`Completed A2U payment: ${paymentId}`);

      } catch (error) {
        // 记录失败
        console.error(`Failed to process recipient ${i}:`, error);

        // 尝试查找是否已创建支付记录
        const existingPayment = await prisma.a2UPayment.findFirst({
          where: {
            batchTaskId: task.id,
            toAddress: recipient.toAddress,
          },
        });

        if (existingPayment) {
          await prisma.a2UPayment.update({
            where: { id: existingPayment.id },
            data: {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } else {
          // 如果没有记录，创建一个失败记录
          await prisma.a2UPayment.create({
            data: {
              batchTaskId: task.id,
              paymentId: `failed_${Date.now()}_${i}`,
              toAddress: recipient.toAddress,
              amount: recipient.amount,
              memo: `Batch transfer ${i + 1}/${recipients.length}`,
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }
    }

    // 3. 更新任务状态
    const failedCount = await prisma.a2UPayment.count({
      where: { batchTaskId: task.id, status: 'failed' },
    });

    const completedCount = await prisma.a2UPayment.count({
      where: { batchTaskId: task.id, status: 'completed' },
    });

    const finalStatus = failedCount > 0
      ? (completedCount > 0 ? 'partial_completed' : 'failed')
      : 'completed';

    await prisma.batchTransferTask.update({
      where: { id: task.id },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });

    console.log(`Batch transfer task completed: ${task.id} with status: ${finalStatus}`);

  } catch (error) {
    console.error('Batch transfer task error:', error);
    // 更新任务状态为失败
    await prisma.batchTransferTask.updateMany({
      where: { batchId },
      data: {
        status: 'failed',
        completedAt: new Date(),
      },
    });
  }
}


