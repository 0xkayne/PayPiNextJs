"use client";
import { useState } from "react";
import Link from "next/link";

async function api(path: string, method: string, body?: unknown, auth?: string) {
  const res = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export default function RedEnvelopePage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("paypi_token") || "" : "";
  const [amountPi, setAmountPi] = useState<string>("");
  const [durationHours, setDurationHours] = useState<string>("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"menu" | "create-form" | "claim">("menu");
  const [balance] = useState<number>(0);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">口令红包</h2>

      {mode === "menu" && (
        <div className="grid gap-4 max-w-sm">
          <button className="border rounded p-4 hover:cursor-pointer" onClick={() => setMode("create-form")}>发起口令红包</button>
          <button className="border rounded p-4 hover:cursor-pointer" onClick={() => setMode("claim")}>接收口令红包</button>
          <Link className="border rounded p-4 text-center" href="/">返回主界面</Link>
        </div>
      )}

      {mode === "create-form" && (
        <div className="grid gap-6">
          <div className="border rounded p-4">
            <h3 className="font-medium mb-3">创建红包</h3>
            <div className="grid gap-2">
              <input className="border p-2 rounded" placeholder="金额（Pi）" type="number" value={amountPi} onChange={(e) => setAmountPi(e.target.value)} />
              <input className="border p-2 rounded" placeholder="红包持续时间（小时，最大24）" type="number" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
              <button
                className="border rounded p-2"
                onClick={async () => {
                  setMsg("");
                  setCode("");
                  const parsedAmount = Number(amountPi);
                  const parsedHours = Number(durationHours);
                  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                    setMsg("请输入有效的红包金额");
                    return;
                  }
                  if (parsedAmount > balance) {
                    setMsg("红包金额不能大于当前账户余额");
                    return;
                  }
                  if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
                    setMsg("请输入有效的红包持续时间（小时）");
                    return;
                  }
                  if (parsedHours > 24) {
                    setMsg("红包持续时间不能超过24小时");
                    return;
                  }
                  const expiresAt = new Date(Date.now() + parsedHours * 60 * 60 * 1000).toISOString();
                  const r = await api("/api/v1/red-envelopes/create", "POST", { amountPi: parsedAmount, expiresAt }, token);
                  if (r?.data?.code) {
                    setCode(r.data.code);
                  } else {
                    setMsg(r?.error || "创建失败");
                  }
                }}
              >生成口令红包</button>
              {code && (
                <div className="text-sm text-center">
                  口令：<span className="font-mono break-all">{code}</span>
                </div>
              )}
              <div className="text-sm opacity-80">当前账户余额：{balance} Pi</div>
            </div>
          </div>
          <button className="border rounded p-2" onClick={() => setMode("menu")}>返回口令红包界面</button>
          {msg && <div className="text-sm opacity-80">{msg}</div>}
        </div>
      )}

      {mode === "claim" && (
        <div className="grid gap-6">
          <div className="border rounded p-4">
            <h3 className="font-medium mb-3">领取红包</h3>
            <div className="grid gap-2">
              <input className="border p-2 rounded" placeholder="口令 code" value={code} onChange={(e) => setCode(e.target.value)} />
              <button
                className="border rounded p-2"
                onClick={async () => {
                  const r = await api("/api/v1/red-envelopes/claim", "POST", { code }, token);
                  setMsg(r?.error ? r.error : `领取成功: ${r?.data?.tx?.txHash || r?.data?.tx?.id}`);
                }}
              >点击领取</button>
            </div>
          </div>
          <button className="border rounded p-2" onClick={() => setMode("menu")}>返回口令红包界面</button>
          {msg && <div className="text-sm opacity-80">{msg}</div>}
        </div>
      )}
    </div>
  );
}


