import { NextRequest, NextResponse } from "next/server";
import { findUserByToken } from "./db";

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data as any, init as any);
}

export function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return findUserByToken(authHeader);
}

export function requireAuth(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return { error: true as const, res: json({ error: "未授权" }, { status: 401 }) };
  }
  return { error: false as const, user };
}


