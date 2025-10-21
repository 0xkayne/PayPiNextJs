import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batchId');

  if (!batchId) {
    return Response.json({ error: 'Missing batchId' }, { status: 400 });
  }

  const task = await prisma.batchTransferTask.findUnique({
    where: { batchId },
    include: {
      a2uPayments: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!task) {
    return Response.json({ error: 'Batch task not found' }, { status: 404 });
  }

  // 统计各状态的支付数量
  const statusCounts = task.a2uPayments.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Response.json({
    batchId: task.batchId,
    status: task.status,
    totalAmount: task.totalAmount.toString(),
    recipientCount: task.recipientCount,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    statusCounts,
    payments: task.a2uPayments.map(p => ({
      toAddress: p.toAddress,
      amount: p.amount.toString(),
      status: p.status,
      txid: p.txid,
      errorMessage: p.errorMessage,
      createdAt: p.createdAt,
      completedAt: p.completedAt,
    })),
  });
}

