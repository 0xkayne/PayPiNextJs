"use client";
import { useState } from "react";

async function api(path: string, method: string, body?: any, auth?: string) {
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

export default function MerchantPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("paypi_token") || "" : "";
  const [name, setName] = useState("");
  const [receiveAddress, setReceiveAddress] = useState("");
  const [feePercent, setFeePercent] = useState(0);
  const [dividendPercent, setDividendPercent] = useState(0);
  const [merchantId, setMerchantId] = useState("");
  const [recipients, setRecipients] = useState<{ toAddress: string; amountPi: number }[]>([{ toAddress: "", amountPi: 0 }]);
  const [msg, setMsg] = useState("");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">商户注册/分红</h2>

      <div className="grid gap-6">
        <div className="border rounded p-4">
          <h3 className="font-medium mb-3">注册商户</h3>
          <div className="grid gap-2">
            <input className="border p-2 rounded" placeholder="商户名称" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="border p-2 rounded" placeholder="收款地址" value={receiveAddress} onChange={(e) => setReceiveAddress(e.target.value)} />
            <input className="border p-2 rounded" type="number" placeholder="手续费 %" value={feePercent} onChange={(e) => setFeePercent(Number(e.target.value))} />
            <input className="border p-2 rounded" type="number" placeholder="分红比例 %" value={dividendPercent} onChange={(e) => setDividendPercent(Number(e.target.value))} />
            <button
              className="border rounded p-2"
              onClick={async () => {
                const r = await api("/api/v1/merchants/register", "POST", { name, receiveAddress, feePercent, dividendPercent }, token);
                setMsg(r?.error ? r.error : `商户创建: ${r?.data?.id}`);
                if (!r?.error) setMerchantId(r?.data?.id || "");
              }}
            >注册</button>
          </div>
        </div>

        <div className="border rounded p-4">
          <h3 className="font-medium mb-3">发放分红</h3>
          <div className="grid gap-2">
            <input className="border p-2 rounded" placeholder="商户ID" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
            {recipients.map((r, i) => (
              <div key={i} className="grid gap-2 border rounded p-3">
                <input className="border p-2 rounded" placeholder="地址" value={r.toAddress} onChange={(e) => setRecipients((p) => p.map((x, idx) => (idx === i ? { ...x, toAddress: e.target.value } : x)))} />
                <input className="border p-2 rounded" type="number" placeholder="金额（Pi）" value={r.amountPi} onChange={(e) => setRecipients((p) => p.map((x, idx) => (idx === i ? { ...x, amountPi: Number(e.target.value) } : x)))} />
              </div>
            ))}
            <div className="flex gap-2">
              <button className="border rounded p-2" onClick={() => setRecipients((p) => [...p, { toAddress: "", amountPi: 0 }])}>+ 添加</button>
              <button className="border rounded p-2" onClick={() => setRecipients((p) => p.slice(0, -1))} disabled={recipients.length <= 1}>- 移除</button>
            </div>
            <button
              className="border rounded p-2"
              onClick={async () => {
                const r = await api(`/api/v1/merchants/${merchantId}/dividend`, "POST", { recipients }, token);
                setMsg(r?.error ? r.error : `分红成功，剩余分红池：${r?.data?.remainingPool}`);
              }}
            >发放</button>
          </div>
        </div>

        {msg && <div className="text-sm opacity-80">{msg}</div>}
      </div>
    </div>
  );
}


