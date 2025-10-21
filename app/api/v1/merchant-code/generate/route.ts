import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/**
 * 商家注册准备接口
 * 返回当前用户的 UID，前端将用此 UID 发起支付
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req as unknown as Request);
  if (auth.error) return auth.res;

  // 检查用户是否已有商家二维码
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
      error: "未找到您的 Pi UID，请先完成 Pi 登录"
    }, { status: 400 });
  }

  // 返回准备数据，让前端发起支付
  return json({
    data: {
      merchantUid: user.piUid,
      ready: true
    }
  });
}


