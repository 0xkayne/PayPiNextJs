import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 从 session token 获取用户信息
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.log("❌ 未提供 authorization token");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 从 session 获取用户 ID
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      console.log("❌ session 无效或已过期");
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    console.log(`✅ 用户认证成功: userId=${session.userId}, username=${session.user.username}`);

    // 查询该用户的所有批量转账任务
    // 注意：如果任务的 userId 为 null，需要通过其他方式关联
    const batchTasks = await prisma.batchTransferTask.findMany({
      where: {
        OR: [
          { userId: session.userId },  // 匹配 userId
          {
            AND: [
              { userId: null },  // userId 为 null 的记录
              { userPaymentId: { contains: '' } }  // 暂时查询所有（临时方案）
            ]
          }
        ]
      },
      include: {
        a2uPayments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // 限制返回最近 100 条
    });

    console.log(`📊 查询到 ${batchTasks.length} 条批量转账记录`);

    // 格式化返回数据
    const history = batchTasks.map(task => ({
      id: task.id,
      batchId: task.batchId,
      totalAmount: task.totalAmount.toString(),
      recipientCount: task.recipientCount,
      status: task.status,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      userPaymentId: task.userPaymentId,
      userTxid: task.userTxid,
      payments: task.a2uPayments.map(p => ({
        id: p.id,
        toAddress: p.toAddress,
        amount: p.amount.toString(),
        status: p.status,
        txid: p.txid,
        errorMessage: p.errorMessage,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
      })),
    }));

    return Response.json({ data: history });
  } catch (error) {
    console.error('Failed to fetch batch transfer history:', error);
    return Response.json(
      { error: 'Failed to fetch history', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

