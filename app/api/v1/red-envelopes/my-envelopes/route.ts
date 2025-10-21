import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET(req: NextRequest) {
  // 1. 验证用户登录
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) return auth.res;

  try {
    // 2. 查询用户创建的红包
    const envelopes = await prisma.redEnvelope.findMany({
      where: { creatorUserId: auth.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        claimedBy: {
          select: { username: true, piUid: true },
        },
      },
    });

    // 3. 处理返回数据
    const now = new Date();
    const data = envelopes.map((env) => {
      const isExpired = now > new Date(env.expiresAt);
      const canRefund = env.status === "active" && isExpired;

      return {
        id: env.id,
        code: env.code,
        amountPi: env.amountPi.toString(),
        status: env.status,
        u2aStatus: env.u2aStatus,
        a2uStatus: env.a2uStatus,
        expiresAt: env.expiresAt.toISOString(),
        createdAt: env.createdAt.toISOString(),
        claimedAt: env.claimedAt?.toISOString(),
        claimedBy: env.claimedBy
          ? {
            username: env.claimedBy.username,
            piUid: env.claimedBy.piUid,
          }
          : null,
        canRefund,
        isExpired,
      };
    });

    return Response.json({ data });
  } catch (error) {
    console.error("查询红包失败:", error);
    return Response.json({ error: "查询红包失败" }, { status: 500 });
  }
}

