import { NextResponse } from "next/server";
import { findUserByToken } from "./db";
import { prisma } from "./prisma";

export function json<T>(data: T, init?: number | ResponseInit) {
  const responseInit: ResponseInit | undefined =
    typeof init === "number" ? { status: init } : init;
  return NextResponse.json<T>(data, responseInit);
}

export function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim() || "";
  // 优先使用数据库 Session
  // 注意：此函数不能标记为 async；调用方使用 requireAuth 进行异步封装
  return findUserByToken(bearer);
}

export async function requireAuthAsync(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim() || "";

  if (bearer) {
    // 尝试数据库会话
    const session = await prisma.session.findUnique({ where: { token: bearer }, include: { user: true } }).catch(() => null);
    if (session && session.expiresAt.getTime() > Date.now()) {
      const dbUser = session.user;
      // 兼容已有 User 形状
      const compatUser = {
        id: dbUser.id,
        username: dbUser.username,
        // 兼容字段映射：piAddress = walletAddress
        piAddress: dbUser.walletAddress || "",
        createdAt: dbUser.createdAt.toISOString(),
        // 密码哈希仅存在于内存用户模型，数据库用户无此字段
      } as unknown as { id: string; username: string; piAddress: string; createdAt: string };
      return { error: false as const, user: compatUser };
    }
  }

  // 兼容回退到旧的内存 token 方案
  const legacy = findUserByToken(authHeader || null);
  if (legacy) return { error: false as const, user: legacy };

  return { error: true as const, res: json({ error: "未授权" }, { status: 401 }) };
}

// 维持原有 requireAuth 名称的同步接口，但内部走异步（不破坏调用点类型）
export function requireAuth(req: Request) {
  return requireAuthAsync(req);
}


