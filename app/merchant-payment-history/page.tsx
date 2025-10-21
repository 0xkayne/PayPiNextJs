"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRequireAuth } from "../contexts/AuthContext";

type MerchantPaymentHistory = {
  id: string;
  merchantUid: string;
  merchantUsername: string;
  totalAmount: number;
  merchantAmount: number;
  dividendAmount: number;
  u2aPaymentId: string;
  u2aTxid: string | null;
  a2uPaymentId: string | null;
  a2uTxid: string | null;
  a2uStatus: string;
  a2uErrorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

export default function MerchantPaymentHistoryPage() {
  const { isChecking, isAuthenticated, isPiBrowser } = useRequireAuth();
  const [payments, setPayments] = useState<MerchantPaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let sessionToken = localStorage.getItem("sessionToken") || "";

        // 如果没有 sessionToken，尝试从 Pi login 获取
        if (!sessionToken) {
          const piAccessToken = localStorage.getItem("pi_accessToken") || "";
          const piUsername = localStorage.getItem("pi_username") || "";
          const piWallet = localStorage.getItem("pi_walletAddress") || "";
          const piUid = localStorage.getItem("pi_uid") || "";

          if (piAccessToken && piUsername) {
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
              console.log("✅ sessionToken obtained");
            }
          }
        }

        if (!sessionToken) {
          console.warn("⚠️ No sessionToken available");
          setLoading(false);
          return;
        }

        // 获取商家支付历史
        console.log("📡 Loading merchant payment history...");
        const res = await fetch("/api/v1/payments/merchant-payment/history", {
          headers: { authorization: `Bearer ${sessionToken}` },
        });

        if (!res.ok) {
          console.error("❌ Failed to load merchant payment history, status:", res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();
        console.log("✅ Loaded merchant payment history:", data?.data?.length || 0, "records");
        setPayments(data?.data || []);
      } catch (error) {
        console.error("❌ Error loading merchant payment history:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 显示加载状态
  if (isChecking || loading) {
    return (
      <div className="min-h-screen bg-[#090b0c] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2">Loading payment history...</div>
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

  // 获取支付状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'submitted': return 'text-blue-400';
      case 'created': return 'text-yellow-400';
      case 'pending': return 'text-gray-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // 获取支付状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'submitted': return 'Submitted';
      case 'created': return 'Created';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="mx-auto max-w-md p-6 sm:p-8">
        {/* 顶部返回与标题 */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/scan-pay" className="inline-flex h-10 w-10 items-center justify-center rounded hover:bg-white/10 transition-colors">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-2xl font-semibold">
            <span className="bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">
              Merchant Payment History
            </span>
          </h1>
        </div>

        {/* 空状态 */}
        {payments.length === 0 && (
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
                No payments yet
              </h2>
              <p className="text-[#8d8f99] text-lg leading-relaxed">
                Your merchant payment records will be displayed here<br />
                Start using scan-to-pay feature
              </p>
            </div>
          </div>
        )}

        {/* 支付历史列表 */}
        {payments.length > 0 && (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl bg-[#111317] border border-white/10 p-4 sm:p-5 overflow-hidden"
              >
                {/* 支付概览 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm text-white/60 mb-1">Payment to Merchant</div>
                      <div className="text-base font-medium text-white">
                        @{payment.merchantUsername}
                      </div>
                      <div className="text-xs font-mono text-white/40 break-all mt-1">
                        {payment.merchantUid.slice(0, 16)}...
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getStatusColor(payment.a2uStatus)}`}>
                      {getStatusText(payment.a2uStatus)}
                    </div>
                  </div>

                  <div className="h-px bg-white/10" />

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-white/60 mb-1 text-xs">Total paid</div>
                      <div className="bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent font-semibold">
                        {payment.totalAmount.toFixed(6)} Pi
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 mb-1 text-xs">To merchant</div>
                      <div className="font-medium text-green-400">
                        {payment.merchantAmount.toFixed(6)} Pi
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 mb-1 text-xs">Dividend</div>
                      <div className="font-medium text-blue-400">
                        {payment.dividendAmount.toFixed(6)} Pi
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-white/40">
                    {new Date(payment.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  {/* 展开/收起按钮 */}
                  <button
                    onClick={() => setExpandedId(expandedId === payment.id ? null : payment.id)}
                    className="w-full mt-2 py-2 text-sm text-[#a625fc] hover:text-[#f89318] transition-colors flex items-center justify-center gap-2"
                  >
                    {expandedId === payment.id ? (
                      <>
                        Hide details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        View details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>

                {/* 详细信息（展开时显示） */}
                {expandedId === payment.id && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <div className="text-sm font-medium text-white/80 mb-2">
                      Transaction details:
                    </div>

                    {/* U2A Transaction (You to App) */}
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs">
                      <div className="text-white/60 font-medium mb-2">Your Payment (U2A)</div>
                      <div className="space-y-1.5">
                        {payment.u2aPaymentId && (
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-white/50 shrink-0">Payment ID:</span>
                            <span className="font-mono text-white/80 break-all text-right text-[10px]">
                              {payment.u2aPaymentId}
                            </span>
                          </div>
                        )}
                        {payment.u2aTxid && (
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-white/50 shrink-0">Transaction ID:</span>
                            <span className="font-mono text-white/80 break-all text-right text-[10px]">
                              {payment.u2aTxid}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-white/50">Amount:</span>
                          <span className="text-white/80 font-medium">{payment.totalAmount.toFixed(6)} Pi</span>
                        </div>
                      </div>
                    </div>

                    {/* A2U Transaction (App to Merchant) */}
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs">
                      <div className="text-white/60 font-medium mb-2">
                        Transfer to Merchant (A2U)
                      </div>
                      <div className="space-y-1.5">
                        {payment.a2uPaymentId ? (
                          <>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-white/50 shrink-0">Payment ID:</span>
                              <span className="font-mono text-white/80 break-all text-right text-[10px]">
                                {payment.a2uPaymentId}
                              </span>
                            </div>
                            {payment.a2uTxid && (
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-white/50 shrink-0">Transaction ID:</span>
                                <span className="font-mono text-white/80 break-all text-right text-[10px]">
                                  {payment.a2uTxid}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-white/50">Amount:</span>
                              <span className="text-green-400 font-medium">{payment.merchantAmount.toFixed(6)} Pi</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Status:</span>
                              <span className={getStatusColor(payment.a2uStatus)}>
                                {getStatusText(payment.a2uStatus)}
                              </span>
                            </div>
                            {payment.a2uErrorMessage && (
                              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[10px]">
                                Error: {payment.a2uErrorMessage}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-white/50">Processing...</div>
                        )}
                      </div>
                    </div>

                    {/* Dividend info */}
                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-400 font-medium">Dividend Pool Contribution</span>
                        <span className="text-blue-400 font-semibold">{payment.dividendAmount.toFixed(6)} Pi</span>
                      </div>
                      <div className="text-white/50 mt-1">
                        5% of your payment goes to the merchant&apos;s dividend pool
                      </div>
                    </div>

                    {/* Completion time */}
                    {payment.completedAt && (
                      <div className="text-xs text-white/50 pt-2 border-t border-white/10">
                        Completed: {new Date(payment.completedAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 底部导航提示 */}
        {payments.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/scan-pay"
              className="inline-flex items-center gap-2 text-[#a625fc] hover:text-[#f89318] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Make another payment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

