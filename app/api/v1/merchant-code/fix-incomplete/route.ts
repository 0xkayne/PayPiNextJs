import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

/**
 * 尝试修复未完成的商家注册支付
 * 这个端点会查询用户最近的支付，找到未完成的商家注册支付并完成它
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req as unknown as Request);
  if (auth.error) return auth.res;

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    return json({ error: "服务器未配置" }, { status: 500 });
  }

  try {
    // 获取用户信息
    const user = await prisma.piUser.findUnique({
      where: { id: auth.user.id }
    });

    if (!user?.piUid) {
      return json({ error: "未找到用户 UID" }, { status: 400 });
    }

    // 检查用户是否已有商家二维码
    const existing = await prisma.merchantPaycode.findUnique({
      where: { ownerUserId: auth.user.id }
    });

    if (existing) {
      return json({
        data: {
          id: existing.id,
          merchantUid: existing.merchantUid,
          dividendPool: Number(existing.dividendPool),
          initialAmount: Number(existing.initialAmount),
          qrPngDataUrl: existing.qrPngDataUrl,
          message: "You already have a merchant QR code"
        }
      });
    }

    // 通过 Pi API 获取用户的支付历史（最近10条）
    // 注意：这需要用户的 accessToken，但我们只有 API Key
    // 实际上 Pi API 不提供通过 API Key 直接查询用户支付的功能
    // 所以我们需要前端传递 paymentId 或使用其他方法

    return json({
      error: "Unable to automatically fix incomplete payments. Please wait 5-10 minutes and try again, or contact support.",
      details: "Pi Network does not provide an API to query user payments without specific payment IDs."
    }, { status: 400 });

  } catch (error) {
    console.error("修复未完成支付失败:", error);
    return json({
      error: "修复失败",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

