"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { BatchTransferHistory } from "@/lib/types";
import { useRequireAuth } from "../contexts/AuthContext";

export default function HistoryPage() {
  const { isChecking, isAuthenticated, isPiBrowser } = useRequireAuth();
  const [batchHistory, setBatchHistory] = useState<BatchTransferHistory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // 获取或创建 sessionToken
      let sessionToken = localStorage.getItem("sessionToken") || "";

      // 如果没有 sessionToken，尝试从 Pi login 获取
      if (!sessionToken) {
        const piAccessToken = localStorage.getItem("pi_accessToken") || "";
        const piUsername = localStorage.getItem("pi_username") || "";
        const piWallet = localStorage.getItem("pi_walletAddress") || "";
        const piUid = localStorage.getItem("pi_uid") || "";

        if (piAccessToken && piUsername) {
          try {
            console.log("📝 Getting sessionToken...");
            const res = await fetch("/api/v1/auth/pi-login", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                piAccessToken,
                username: piUsername,
                walletAddress: piWallet || undefined,
                uid: piUid
              }),
            });
            const j = await res.json();
            if (j?.data?.sessionToken) {
              sessionToken = j.data.sessionToken;
              localStorage.setItem("sessionToken", sessionToken);
              console.log("✅ sessionToken got and saved");
            }
          } catch (error) {
            console.error("❌ Getting sessionToken failed:", error);
          }
        }
      }

      if (!sessionToken) {
        console.warn("⚠️ No usable sessionToken, cannot load history");
        return;
      }

      // 获取历史记录
      try {
        console.log("📡 Loading batch transfer history...");
        const res = await fetch("/api/v1/batch-transfer/history", {
          headers: { authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok) {
          console.error("❌ Loading history failed, status code:", res.status);
          const errorData = await res.json().catch(() => ({}));
          console.error("  Error details:", errorData);
          return;
        }
        const r = await res.json();
        console.log("✅ Successfully loaded history records:", r?.data?.length || 0, "条");
        setBatchHistory(r?.data || []);
      } catch (error) {
        console.error("❌ Loading batch transfer history failed:", error);
      }
    })();
  }, []);

  // 显示加载状态
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#090b0c] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2">Checking login status</div>
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

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      case 'partial_completed': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      case 'partial_completed': return 'Partial completed';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="mx-auto max-w-md p-6 sm:p-8">
        {/* 顶部返回与标题 */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/" className="inline-flex h-10 w-10 items-center justify-center rounded hover:bg-white/10 transition-colors">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-2xl font-semibold">
            <span className="bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">Transfer History</span>
          </h1>
        </div>

        {/* 空状态插图 */}
        {batchHistory.length === 0 && (
          <div className="flex flex-col items-center gap-12 mt-16">
            <div className="relative w-56 h-40 flex items-center justify-center">
              <Image
                src="/NoTx.svg"
                alt="No transaction"
                width={225}
                height={154}
                className="w-full h-auto"
              />
            </div>
            <div className="text-center space-y-4 px-4">
              <h2 className="text-2xl font-semibold text-white">
                No transactions yet
              </h2>
              <p className="text-[#8d8f99] text-lg leading-relaxed">
                Your batch transfer records will be displayed here<br />
                Start using the one-to-many transfer feature
              </p>
            </div>
          </div>
        )}

        {/* 批量转账历史列表 */}
        {batchHistory.length > 0 && (
          <div className="space-y-4">
            {batchHistory.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl bg-[#111317] border border-white/10 p-4 sm:p-5 overflow-hidden"
              >
                {/* 任务概览 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-white/60 mb-1">Batch transfer</div>
                      <div className="text-xs font-mono text-white/40 break-all">
                        {task.batchId}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </div>
                  </div>

                  <div className="h-px bg-white/10" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-white/60 mb-1">Total amount</div>
                      <div className="bg-gradient-to-r from-[#f89318] to-[#da6a6e] bg-clip-text text-transparent font-semibold">
                        {task.totalAmount} Pi
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 mb-1">Number of recipients</div>
                      <div className="font-medium">{task.recipientCount}</div>
                    </div>
                  </div>

                  <div className="text-xs text-white/40">
                    {new Date(task.createdAt).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  {/* 展开/收起按钮 */}
                  <button
                    onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    className="w-full mt-2 py-2 text-sm text-[#a625fc] hover:text-[#f89318] transition-colors flex items-center justify-center gap-2"
                  >
                    {expandedId === task.id ? (
                      <>
                        Hide details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        View details ({task.payments.length} payments)
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>

                {/* 详细支付列表（展开时显示） */}
                {expandedId === task.id && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <div className="text-sm font-medium text-white/80 mb-2">
                      Payment details:
                    </div>
                    {task.payments.map((payment, idx) => (
                      <div
                        key={payment.id}
                        className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-white/60">Payment {idx + 1}</span>
                          <span className={getStatusColor(payment.status)}>
                            {payment.status === 'completed' ? '✓ Completed' :
                              payment.status === 'failed' ? '✗ Failed' :
                                payment.status === 'submitted' ? '→ Submitted' : '⟳ Processing'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-white/50 shrink-0">Recipient:</span>
                            <span className="font-mono text-white/80 break-all text-right text-[10px]">
                              {payment.toAddress}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Amount:</span>
                            <span className="text-white/80 font-medium">{payment.amount} Pi</span>
                          </div>
                          {payment.txid && (
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-white/50 shrink-0">Transaction ID:</span>
                              <span className="font-mono text-white/60 break-all text-right text-[10px]">
                                {payment.txid}
                              </span>
                            </div>
                          )}
                          {payment.completedAt && (
                            <div className="flex justify-between">
                              <span className="text-white/50">Completed time:</span>
                              <span className="text-white/60 text-[10px]">
                                {new Date(payment.completedAt).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          )}
                          {payment.errorMessage && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[10px]">
                              Error: {payment.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 任务详细信息 */}
                    {task.userTxid && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs text-white/50 mb-1">U2A Transaction ID:</div>
                        <div className="font-mono text-[10px] text-white/60 break-all">
                          {task.userTxid}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


