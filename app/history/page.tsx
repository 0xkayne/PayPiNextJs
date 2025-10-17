"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { Transaction } from "@/lib/types";
import { useRequireAuth } from "../contexts/AuthContext";

export default function HistoryPage() {
  const { isChecking, isAuthenticated, isPiBrowser } = useRequireAuth();
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
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="mx-auto max-w-md p-6 sm:p-8">
        {/* 顶部返回与标题 */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/oneton" className="inline-flex h-10 w-10 items-center justify-center rounded hover:bg-white/10 transition-colors">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-2xl font-semibold">
            <span className="bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">Transaction</span>
          </h1>
        </div>

        {/* 空状态插图 */}
        <div className="flex flex-col items-center gap-12 mt-16">
          {/* 转账流程图标 */}
          <div className="relative w-56 h-40 flex items-center justify-center">
            <Image
              src="/NoTx.svg"
              alt="No transaction"
              width={225}
              height={154}
              className="w-full h-auto"
            />
          </div>

          {/* 空状态文字 */}
          <div className="text-center space-y-4 px-4">
            <h2 className="text-2xl font-semibold text-white">
              No transaction yet
            </h2>
            <p className="text-[#8d8f99] text-lg leading-relaxed">
              Your transaction will appear here<br />
              once you start using one-to-many transfer
            </p>
          </div>
        </div>

        {/* 有交易记录时显示列表 */}
        {list.length > 0 && (
          <div className="mt-8 rounded-2xl bg-[#111317] border border-white/10 p-4 sm:p-5">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="grid gap-3">
              {list.map((x) => (
                <div key={x.id} className="rounded-xl bg-white/5 border border-white/10 p-4 overflow-hidden">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Time</span>
                      <span className="font-medium">{new Date(x.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-white/60 shrink-0">To Address</span>
                      <span className="font-mono text-xs break-all text-right">{x.toAddress}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Amount</span>
                      <span className="bg-gradient-to-r from-[#f89318] to-[#da6a6e] bg-clip-text text-transparent font-semibold">
                        {x.amountPi} Pi
                      </span>
                    </div>
                    {x.txHash && (
                      <>
                        <div className="h-px bg-white/10" />
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-white/60 shrink-0">Tx Hash</span>
                          <span className="font-mono text-xs break-all text-right opacity-75">{x.txHash}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


