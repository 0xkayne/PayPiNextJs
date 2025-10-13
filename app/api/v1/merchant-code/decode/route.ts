import { NextRequest } from "next/server";
import { json } from "@/lib/http";

const PI_ADDR_RE = /^[A-Z0-9]{56}$/;

type PayPayload = { type: "paypi"; version: 1; piAddress: string; startPi: number };

function isPayPayload(obj: unknown): obj is PayPayload {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.type === "paypi" &&
    o.version === 1 &&
    typeof o.piAddress === "string" &&
    (typeof o.startPi === "number" || typeof o.startPi === "string")
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { qrData } = body ?? {};
  if (typeof qrData !== "string" || !qrData.length) {
    return json({ error: "缺少 qrData" }, { status: 400 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(qrData);
  } catch {
    return json({ error: "二维码数据不是合法 JSON" }, { status: 400 });
  }
  if (!isPayPayload(payload)) {
    return json({ error: "二维码类型/版本不匹配" }, { status: 400 });
  }
  if (!PI_ADDR_RE.test(payload.piAddress)) {
    return json({ error: "Pi 地址格式非法" }, { status: 400 });
  }
  const start = Number(payload.startPi);
  if (!Number.isFinite(start) || start < 0) {
    return json({ error: "Start money 非法" }, { status: 400 });
  }
  return json({ data: { piAddress: payload.piAddress, startPi: start } });
}


