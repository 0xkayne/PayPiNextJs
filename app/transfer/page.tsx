"use client";
import { useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "../contexts/AuthContext";

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
  const { isChecking, isAuthenticated, isPiBrowser } = useRequireAuth();
  const [toAddress, setToAddress] = useState("");
  const [amountPi, setAmountPi] = useState(0);
  const [merchantId, setMerchantId] = useState("");
  const [msg, setMsg] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("paypi_token") || "" : "";

  // 显示加载状态
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#090b0c] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2">Checking login status...</div>
          <div className="text-sm opacity-60">Please wait</div>
        </div>
      </div>
    );
  }

  // 未登录且不在 Pi Browser - 显示提示
  if (!isAuthenticated && !isPiBrowser) {
    return (
      <div className="min-h-screen bg-[#090b0c] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg mb-4">Please open in Pi Browser</div>
          <Link href="/" className="text-[#a625fc] underline">
            Return to home page
          </Link>
        </div>
      </div>
    );
  }

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


