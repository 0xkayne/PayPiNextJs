import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

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

export async function POST(req: NextRequest) {
  // 1. 验证用户登录
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) return auth.res;

  try {
    const body = await req.json();
    const { amountPi, expiresAt } = body;

    // 2. 验证参数
    if (!amountPi || !expiresAt) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const amount = parseFloat(amountPi);
    if (isNaN(amount) || amount <= 0) {
      return Response.json({ error: "金额必须大于0" }, { status: 400 });
    }

    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return Response.json({ error: "过期时间无效" }, { status: 400 });
    }

    // 3. 生成唯一口令（64位hex，具有抗碰撞性）
    const code = randomBytes(32).toString("hex");

    // 4. 创建红包记录（状态：pending）
    const envelope = await prisma.redEnvelope.create({
      data: {
        code,
        creatorUserId: auth.user.id,
        amountPi: amount,
        expiresAt: expiryDate,
        status: "pending",
        u2aStatus: "pending",
      },
    });

    // 5. 返回口令和红包信息给前端
    // 前端需要调用 Pi SDK 创建 U2A 支付
    return Response.json({
      data: {
        envelopeId: envelope.id,
        code: envelope.code,
        amountPi: envelope.amountPi.toString(),
        expiresAt: envelope.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("创建红包失败:", error);
    return Response.json({ error: "创建红包失败" }, { status: 500 });
  }
}
