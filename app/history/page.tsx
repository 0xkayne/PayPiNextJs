"use client";
import { useEffect, useState } from "react";
import type { Transaction } from "@/lib/types";

export default function HistoryPage() {
  const [list, setList] = useState<Transaction[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("paypi_token") || "" : "";

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/v1/transactions/history", {
        headers: { authorization: `Bearer ${token}` },
      });
      const r = await res.json();
      setList(r?.data || []);
    })();
  }, [token]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">交易历史</h2>
      <div className="grid gap-3">
        {list.map((x) => (
          <div key={x.id} className="border rounded p-3 text-sm">
            <div>时间：{x.createdAt}</div>
            <div>收款地址：{x.toAddress}</div>
            <div>金额：{x.amountPi} Pi</div>
            {x.txHash && <div>哈希：{x.txHash}</div>}
          </div>
        ))}
        {!list.length && <div className="opacity-75 text-sm">暂无记录</div>}
      </div>
    </div>
  );
}


