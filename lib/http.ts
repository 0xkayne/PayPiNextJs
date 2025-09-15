import { NextResponse } from "next/server";
import { findUserByToken } from "./db";

export function json<T>(data: T, init?: number | ResponseInit) {
  const responseInit: ResponseInit | undefined =
    typeof init === "number" ? { status: init } : init;
  return NextResponse.json<T>(data, responseInit);
}

export function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  return findUserByToken(authHeader);
}

export function requireAuth(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return { error: true as const, res: json({ error: "未授权" }, { status: 401 }) };
  }
  return { error: false as const, user };
}


