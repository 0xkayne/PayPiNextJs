"use client";
import { useState } from "react";

type JsonRecord = Record<string, unknown>;

async function api<T extends JsonRecord>(path: string, method: string, body?: T, auth?: string) {
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

export default function TransferPage() {
  const [toAddress, setToAddress] = useState("");
  const [amountPi, setAmountPi] = useState(0);
  const [merchantId, setMerchantId] = useState("");
  const [msg, setMsg] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("paypi_token") || "" : "";

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">单笔转账</h2>
      <div className="grid gap-2">
        <input className="border p-2 rounded" placeholder="收款地址" value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
        <input className="border p-2 rounded" placeholder="金额（Pi）" type="number" value={amountPi} onChange={(e) => setAmountPi(Number(e.target.value))} />
        <input className="border p-2 rounded" placeholder="商户ID（可选）" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
        <button
          className="border rounded p-2 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
          onClick={async () => {
            const r = await api("/api/v1/transactions/transfer", "POST", { toAddress, amountPi, merchantId: merchantId || undefined }, token);
            setMsg(r?.error ? r.error : `OK: ${r?.data?.txHash || r?.data?.id}`);
          }}
        >转账</button>
      </div>
      {msg && <div className="mt-3 text-sm opacity-80">{msg}</div>}
    </div>
  );
}


