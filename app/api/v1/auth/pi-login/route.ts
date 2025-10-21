import { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const SESSION_TTL_DAYS = 7;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { piAccessToken, username, walletAddress, uid } = body ?? {};

  if (!piAccessToken || !username) {
    return json({ error: "缺少必要字段: piAccessToken 或 username" }, { status: 400 });
  }

  // 优先用 piUid 查找，fallback 到 username
  let user = uid
    ? await prisma.piUser.findUnique({ where: { piUid: uid } })
    : null;

  if (!user) {
    user = await prisma.piUser.findUnique({ where: { username } });
  }

  if (!user) {
    // 创建新用户
    user = await prisma.piUser.create({
      data: { username, walletAddress, piUid: uid || null }
    });
  } else {
    // 更新钱包地址和 piUid（如果之前没有）
    const updates: { walletAddress?: string | null; piUid?: string | null } = {};
    if (walletAddress && user.walletAddress !== walletAddress) {
      updates.walletAddress = walletAddress;
    }
    if (uid && !user.piUid) {
      updates.piUid = uid;
    }

    if (Object.keys(updates).length > 0) {
      user = await prisma.piUser.update({ where: { id: user.id }, data: updates });
    }
  }

  const token = randomBytes(24).toString("hex");
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);

  const session = await prisma.session.create({
    data: { token, userId: user.id, expiresAt: expires },
  });

  return json({
    data: {
      sessionToken: session.token,
      user: {
        id: user.id,
        piUid: user.piUid,
        username: user.username,
        walletAddress: user.walletAddress ?? null
      }
    }
  });
}


