"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRequireAuth } from "../contexts/AuthContext";

export default function OneToNPage() {
  const { isChecking, isAuthenticated, isPiBrowser } = useRequireAuth();

  type Row = { id: string; address: string; amount: string; touchedAddr?: boolean; touchedAmt?: boolean };

  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const [rows, setRows] = useState<Row[]>([{ id: uid(), address: "", amount: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [, setBatchId] = useState<string>("");
  const [showStatus, setShowStatus] = useState(false);
  const [statusData, setStatusData] = useState<{
    status: string;
    totalAmount: number;
    recipientCount: number;
    statusCounts?: { completed: number; processing: number; submitted: number; failed: number };
    payments?: Array<{ toAddress: string; amount: number; status: string; errorMessage?: string }>;
  } | null>(null);

  // App wallet address (for displaying fund transfer information)
  const APP_WALLET_ADDRESS = "GCBQFF4M4MBP7QIJFP752BTREDM25VH7XZEEZMHYKSWXCLK4QLCNQMVV";

  const isAddrNonEmpty = (v: string) => v.trim().length > 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isAddrFormatValid = (_v: string) => true; // No format validation for UID yet
  const isAmtValid = (v: string) => {
    const t = v.trim();
    if (!t) return false;
    const n = Number(t);
    return Number.isFinite(n);
  };

  const total = useMemo(() => {
    return rows.reduce((sum, r) => {
      return isAmtValid(r.amount) ? sum + Number(r.amount) : sum;
    }, 0);
  }, [rows]);

  const tryAddRow = () => {
    // 若存在地址为空，不允许新增，并将其高亮
    let hasEmpty = false;
    setRows((prev) =>
      prev.map((r) => {
        const valid = isAddrNonEmpty(r.address);
        if (!valid) hasEmpty = true;
        return { ...r, touchedAddr: !valid || r.touchedAddr };
      })
    );
    if (hasEmpty) return;
    setRows((prev) => [...prev, { id: uid(), address: "", amount: "" }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const updateAddr = (id: string, value: string) => {
    // 仅更新值，不在输入过程中标记 touched（失焦时再标记）
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, address: value } : r))
    );
  };

  const updateAmt = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, amount: value, touchedAmt: true } : r))
    );
  };

  // 获取 access token（已由 AuthContext 管理登录）
  function getAccessToken(): string {
    const token = localStorage.getItem("pi_accessToken") || "";
    if (!token) throw new Error("Not authenticated");
    return token;
  }

  // 查询批量转账状态
  async function checkBatchStatus(bId: string) {
    try {
      const res = await fetch(`/api/v1/batch-transfer/status?batchId=${bId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Failed to check batch status:", error);
      return null;
    }
  }

  // 改为单笔支付：用户一次签名，支付总金额到应用账户
  async function sendSingle(items: { toAddress: string; amount: number }[]) {
    const w = window as unknown as {
      Pi?: {
        createPayment: (
          data: { amount: number; memo: string; metadata?: Record<string, unknown> },
          cbs: {
            onReadyForServerApproval: (paymentId: string) => void;
            onReadyForServerCompletion: (paymentId: string, txid: string) => void;
            onCancel: (paymentId: string) => void;
            onError: (error: Error) => void;
          }
        ) => void;
      };
    };
    if (!w.Pi) throw new Error("Please open this app in Pi Browser to use full features. ");

    getAccessToken(); // 验证已登录

    const batchId = `batch_${Date.now()}`;
    const totalAmount = items.reduce((s, it) => s + it.amount, 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error("Invalid total amount");

    await new Promise<void>((resolve, reject) => {
      w.Pi!.createPayment(
        {
          amount: totalAmount,
          memo: `1-to-N total:${totalAmount} batch:${batchId}`,
          metadata: { batchId, totalAmount, recipients: items },
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            try {
              const r = await fetch("/api/v1/payments/approve", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ paymentId }),
              });
              if (!r.ok) throw new Error("Server approval failed");
            } catch (e) {
              reject(e instanceof Error ? e : new Error("Server approval failed"));
            }
          },
          onReadyForServerCompletion: async (paymentId, txid) => {
            try {
              const r = await fetch("/api/v1/payments/complete", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ paymentId, txid }),
              });
              if (!r.ok) throw new Error("Server completion failed");
              resolve();
            } catch (e) {
              reject(e instanceof Error ? e : new Error("Server completion failed"));
            }
          },
          onCancel: () => reject(new Error("User cancelled payment")),
          onError: (error: Error) => reject(error),
        }
      );
    });
  }

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
      <div className="mx-auto max-w-md px-4 py-5 sm:px-6">
        {/* 顶部返回与标题 - 精致化 */}
        <div className="mb-5 relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* 渐变边框效果 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#a625fc]/20 via-transparent to-[#f89318]/20 opacity-50 pointer-events-none" />

          <div className="relative flex items-center gap-3">
            <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10 transition-all active:scale-95">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="text-base font-bold bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent truncate">
                One-to-many Transfer
              </div>
              <div className="text-[11px] text-white/50 mt-0.5">Send Pi to multiple recipients</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.03] border border-white/10 p-3.5 sm:p-4 grid gap-3.5 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="grid gap-2.5">
            {rows.map((r) => {
              const addrEmpty = r.touchedAddr && !isAddrNonEmpty(r.address);
              const addrFormatBad = r.touchedAddr && isAddrNonEmpty(r.address) && !isAddrFormatValid(r.address);
              const addrInvalid = addrEmpty || addrFormatBad;
              const amtInvalid = r.touchedAmt && !isAmtValid(r.amount);
              return (
                <div key={r.id} className="relative rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] border border-white/10 p-3 overflow-hidden backdrop-blur-sm shadow-lg">
                  {/* 渐变装饰 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/5 to-transparent opacity-50 pointer-events-none" />

                  <div className="relative">
                    {/* UID 输入框 - 独占一行 */}
                    <div className="mb-2">
                      <input
                        className={`w-full rounded-lg px-3 py-2.5 bg-white/10 placeholder-white/40 text-sm outline-none border transition-all focus:bg-white/15 ${addrInvalid ? "border-red-500/60 focus:border-red-500" : "border-white/15 focus:border-[#a625fc]/50"}`}
                        placeholder="Receiver Pi UID"
                        value={r.address}
                        onChange={(e) => updateAddr(r.id, e.target.value)}
                        onBlur={() => {
                          // Trigger validation on blur
                          setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, touchedAddr: true } : x));
                        }}
                      />
                      {/* 错误提示 */}
                      {(addrEmpty || addrFormatBad) && (
                        <div className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          {addrEmpty ? "Pi UID cannot be empty" : "Invalid Pi UID format"}
                        </div>
                      )}
                    </div>

                    {/* 金额输入框和删除按钮 - 同一行 */}
                    <div className="flex items-center gap-2">
                      <input
                        className={`flex-1 rounded-lg px-3 py-2.5 bg-white/10 placeholder-white/40 text-sm outline-none border text-right transition-all focus:bg-white/15 ${amtInvalid ? "border-red-500/60 focus:border-red-500" : "border-white/15 focus:border-[#f89318]/50"}`}
                        placeholder="Amount"
                        value={r.amount}
                        onChange={(e) => updateAmt(r.id, e.target.value)}
                      />
                      <button
                        className="shrink-0 px-3 py-2.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30 active:scale-95"
                        onClick={() => removeRow(r.id)}
                        disabled={rows.length <= 1}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add recipient button - 精致化 */}
            <button
              className="group relative rounded-xl border-2 border-dashed border-white/20 hover:border-[#a625fc]/40 hover:bg-white/5 px-4 py-2.5 flex items-center gap-2.5 overflow-hidden transition-all active:scale-[0.98]"
              onClick={tryAddRow}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#a625fc]/20 to-[#f89318]/20 group-hover:from-[#a625fc]/30 group-hover:to-[#f89318]/30 transition-all">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              <span className="text-sm font-medium">Add Recipient</span>
            </button>

            {/* Total - 精致化 */}
            <div className="relative rounded-xl px-4 py-3 overflow-hidden backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/10 via-[#f89318]/5 to-transparent opacity-50 pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <span className="text-sm font-bold bg-gradient-to-r from-[#a625fc] to-[#d66675] bg-clip-text text-transparent uppercase tracking-wide">Total Amount</span>
                <span className="text-base font-bold bg-gradient-to-r from-[#f89318] to-[#da6a6e] bg-clip-text text-transparent">{Number.isFinite(total) ? total.toFixed(6) : '0.000000'} Pi</span>
              </div>
            </div>

            {/* Submit button - 精致化 */}
            <button
              className="group relative rounded-xl overflow-hidden px-4 py-3 font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              disabled={submitting}
              onClick={async () => {
                setMsg("");
                setShowStatus(false);
                // Collect and validate form data
                const items = rows
                  .map((r) => ({ toAddress: r.address.trim(), amount: Number(r.amount) }))
                  .filter((it) => it.toAddress && Number.isFinite(it.amount) && it.amount > 0);
                if (!items.length) {
                  setMsg("Please fill in valid recipient UID and amount");
                  return;
                }
                setSubmitting(true);
                const currentBatchId = `batch_${Date.now()}`;
                setBatchId(currentBatchId);
                try {
                  await sendSingle(items);
                  setMsg("Payment submitted, distributing to recipients...");

                  // Start polling for batch transfer status
                  let attempts = 0;
                  const maxAttempts = 60; // Poll up to 60 times (3 minutes)
                  const checkInterval = setInterval(async () => {
                    attempts++;
                    const status = await checkBatchStatus(currentBatchId);

                    if (status) {
                      setStatusData(status);
                      setShowStatus(true);

                      if (status.status === 'completed') {
                        clearInterval(checkInterval);
                        setMsg("All transfers completed successfully!");
                        setSubmitting(false);
                      } else if (status.status === 'failed') {
                        clearInterval(checkInterval);
                        setMsg("Some transfers failed, please check details");
                        setSubmitting(false);
                      } else if (status.status === 'partial_completed') {
                        clearInterval(checkInterval);
                        setMsg("Batch transfer completed with some failures");
                        setSubmitting(false);
                      }
                    }

                    if (attempts >= maxAttempts) {
                      clearInterval(checkInterval);
                      setMsg("Transfer processing, please check transaction history later");
                      setSubmitting(false);
                    }
                  }, 3000); // Check every 3 seconds

                } catch (e) {
                  setMsg(e instanceof Error ? e.message : "Payment failed, please retry");
                  setSubmitting(false);
                }
              }}
            >
              {/* 渐变背景 */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#a625fc] to-[#f89318] opacity-100 group-hover:opacity-90 transition-opacity" />

              {/* 悬停光效 */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

              {/* 按钮内容 */}
              <span className="relative flex items-center justify-center gap-2 text-white">
                {submitting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {submitting ? "Sending..." : "Continue Transfer"}
              </span>
            </button>
          </div>

          {/* 消息提示 - 精致化 */}
          {msg && (
            <div className="text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-white/90 flex-1">{msg}</span>
              </div>
            </div>
          )}

          {/* Batch transfer status details - 精致化 */}
          {showStatus && statusData && (
            <div className="relative rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-4 overflow-hidden backdrop-blur-sm shadow-lg">
              {/* 渐变装饰 */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/5 via-transparent to-[#f89318]/5 opacity-50 pointer-events-none" />

              <div className="relative">
                <div className="text-base font-bold mb-3 bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">Transfer Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-70">Status:</span>
                    <span className={`font-medium ${statusData.status === 'completed' ? 'text-green-400' :
                      statusData.status === 'processing' ? 'text-yellow-400' :
                        statusData.status === 'failed' ? 'text-red-400' :
                          'text-orange-400'
                      }`}>
                      {statusData.status === 'completed' ? 'Completed' :
                        statusData.status === 'processing' ? 'Processing' :
                          statusData.status === 'failed' ? 'Failed' :
                            statusData.status === 'partial_completed' ? 'Partially Completed' : statusData.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Total Amount:</span>
                    <span>{statusData.totalAmount} Pi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Recipients:</span>
                    <span>{statusData.recipientCount}</span>
                  </div>
                  {statusData.statusCounts && (
                    <div className="pt-2 mt-2 border-t border-white/10">
                      <div className="opacity-70 mb-1">Status Summary:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {statusData.statusCounts.completed > 0 && (
                          <div className="text-green-400">✓ Completed: {statusData.statusCounts.completed}</div>
                        )}
                        {statusData.statusCounts.processing > 0 && (
                          <div className="text-yellow-400">⟳ Processing: {statusData.statusCounts.processing}</div>
                        )}
                        {statusData.statusCounts.submitted > 0 && (
                          <div className="text-blue-400">→ Submitted: {statusData.statusCounts.submitted}</div>
                        )}
                        {statusData.statusCounts.failed > 0 && (
                          <div className="text-red-400">✗ Failed: {statusData.statusCounts.failed}</div>
                        )}
                      </div>
                    </div>
                  )}
                  {statusData.payments && statusData.payments.length > 0 && (
                    <details className="pt-2 mt-2 border-t border-white/10">
                      <summary className="cursor-pointer opacity-70 hover:opacity-100">View Detailed Records</summary>
                      <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                        {statusData.payments.map((p: { toAddress: string; amount: number; status: string; errorMessage?: string }, idx: number) => (
                          <div key={idx} className="text-xs bg-white/5 rounded p-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="truncate" title={p.toAddress}>
                                  {p.toAddress.slice(0, 8)}...{p.toAddress.slice(-8)}
                                </div>
                                <div className="opacity-60">{p.amount} Pi</div>
                              </div>
                              <div className={`ml-2 shrink-0 ${p.status === 'completed' ? 'text-green-400' :
                                p.status === 'failed' ? 'text-red-400' :
                                  'text-yellow-400'
                                }`}>
                                {p.status === 'completed' ? '✓' :
                                  p.status === 'failed' ? '✗' : '⟳'}
                              </div>
                            </div>
                            {p.errorMessage && (
                              <div className="text-red-400 text-[10px] mt-1">{p.errorMessage}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 转账流程说明 - 精致化 */}
          <div className="relative rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 p-3.5 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-50 pointer-events-none" />
            <div className="relative text-xs text-white/80 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-blue-300 mb-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Transfer Process
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">1.</span>
                <span>Your payment will be sent to the app wallet</span>
              </div>
              <div className="font-mono text-[10px] pl-4 py-1 bg-white/5 rounded break-all text-white/60">{APP_WALLET_ADDRESS}</div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">2.</span>
                <span>The app wallet will automatically distribute to recipients</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">3.</span>
                <span>The entire process usually takes several seconds</span>
              </div>
            </div>
          </div>

          {/* 交易历史按钮 - 精致化 */}
          <Link
            className="group relative text-center rounded-xl overflow-hidden p-3 font-semibold transition-all active:scale-[0.98] shadow-lg block"
            href="/history"
          >
            {/* 渐变背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#a625fc] to-[#f89318] opacity-100 group-hover:opacity-90 transition-opacity" />

            {/* 悬停光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

            {/* 按钮内容 */}
            <span className="relative text-white flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Transaction History
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}


