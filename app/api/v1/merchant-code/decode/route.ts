import { NextRequest } from "next/server";
import { json } from "@/lib/http";

// 支持新旧两种版本的二维码格式
type PayPayloadV1 = { type: "paypi"; version: 1; piAddress: string; startPi: number };
type PayPayloadV2 = { type: "paypi"; version: 2; merchantUid: string };
type PayPayload = PayPayloadV1 | PayPayloadV2;

function isPayPayloadV1(obj: unknown): obj is PayPayloadV1 {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.type === "paypi" &&
    o.version === 1 &&
    typeof o.piAddress === "string" &&
    (typeof o.startPi === "number" || typeof o.startPi === "string")
  );
}

function isPayPayloadV2(obj: unknown): obj is PayPayloadV2 {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.type === "paypi" &&
    o.version === 2 &&
    typeof o.merchantUid === "string"
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

  // 支持 v2 格式（新版本 - 使用 merchantUid）
  if (isPayPayloadV2(payload)) {
    if (!payload.merchantUid || payload.merchantUid.length === 0) {
      return json({ error: "商家 UID 无效" }, { status: 400 });
    }
    return json({
      data: {
        merchantUid: payload.merchantUid,
        version: 2
      }
    });
  }

  // 支持 v1 格式（旧版本 - 使用 piAddress）兼容
  if (isPayPayloadV1(payload)) {
    const PI_ADDR_RE = /^[A-Z0-9]{56}$/;
    if (!PI_ADDR_RE.test(payload.piAddress)) {
      return json({ error: "Pi 地址格式非法" }, { status: 400 });
    }
    const start = Number(payload.startPi);
    if (!Number.isFinite(start) || start < 0) {
      return json({ error: "Start money 非法" }, { status: 400 });
    }
    return json({
      data: {
        piAddress: payload.piAddress,
        startPi: start,
        version: 1
      }
    });
  }

  return json({ error: "二维码类型/版本不匹配" }, { status: 400 });
}
