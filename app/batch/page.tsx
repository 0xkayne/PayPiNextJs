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

type Item = { toAddress: string; amountPi: number };

export default function BatchPage() {
  const [items, setItems] = useState<Item[]>([{ toAddress: "", amountPi: 0 }]);
  const [merchantId, setMerchantId] = useState("");
  const [msg, setMsg] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("paypi_token") || "" : "";

  const updateItem = (idx: number, field: keyof Item, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: field === "amountPi" ? Number(value) : value } : it)));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">批量转账</h2>
      <div className="grid gap-4">
        {items.map((it, i) => (
          <div key={i} className="grid gap-2 border rounded p-3">
            <input className="border p-2 rounded" placeholder="收款地址" value={it.toAddress} onChange={(e) => updateItem(i, "toAddress", e.target.value)} />
            <input className="border p-2 rounded" placeholder="金额（Pi）" type="number" value={it.amountPi} onChange={(e) => updateItem(i, "amountPi", e.target.value)} />
          </div>
        ))}
        <div className="flex gap-2">
          <button className="border rounded p-2" onClick={() => setItems((p) => [...p, { toAddress: "", amountPi: 0 }])}>+ 添加一条</button>
          <button className="border rounded p-2" onClick={() => setItems((p) => p.slice(0, -1))} disabled={items.length <= 1}>- 移除一条</button>
        </div>
        <input className="border p-2 rounded" placeholder="商户ID（可选）" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
        <button
          className="border rounded p-2 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
          onClick={async () => {
            const r = await api("/api/v1/transactions/batch-transfer", "POST", { items, merchantId: merchantId || undefined }, token);
            setMsg(r?.error ? r.error : `OK: 共 ${r?.data?.transactions?.length || 0} 笔，总额 ${r?.data?.totalAmount}`);
          }}
        >批量转账</button>
      </div>
      {msg && <div className="mt-3 text-sm opacity-80">{msg}</div>}
    </div>
  );
}


