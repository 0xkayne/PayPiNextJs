import { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const SESSION_TTL_DAYS = 7;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { piAccessToken, username, walletAddress } = body ?? {};

  if (!piAccessToken || !username) {
    return json({ error: "缺少必要字段: piAccessToken 或 username" }, { status: 400 });
  }

  // TODO: 可选的服务端校验 piAccessToken（与 Pi Server SDK/REST 对接）

  let user = await prisma.piUser.findUnique({ where: { username } });
  if (!user) {
    user = await prisma.piUser.create({ data: { username, walletAddress } });
  } else if (walletAddress && user.walletAddress !== walletAddress) {
    user = await prisma.piUser.update({ where: { id: user.id }, data: { walletAddress } });
  }

  const token = randomBytes(24).toString("hex");
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);

  const session = await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt: expires,
    },
  });

  return json({ data: { sessionToken: session.token, user: { id: user.id, username: user.username, walletAddress: user.walletAddress ?? null } } });
}


