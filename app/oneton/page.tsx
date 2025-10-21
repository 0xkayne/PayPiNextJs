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
      <div className="mx-auto max-w-md p-6 sm:p-8">
        {/* 顶部返回与标题 */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/" className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="text-lg font-semibold">
            <span className="bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">One-to-many Transfer</span>
          </div>
        </div>
        <div className="text-sm opacity-70 mb-3">Send Pi to</div>
        <div className="rounded-2xl bg-[#111317] border border-white/10 p-4 sm:p-5 grid gap-4 overflow-hidden">
          <div className="grid gap-3">
            {rows.map((r) => {
              const addrEmpty = r.touchedAddr && !isAddrNonEmpty(r.address);
              const addrFormatBad = r.touchedAddr && isAddrNonEmpty(r.address) && !isAddrFormatValid(r.address);
              const addrInvalid = addrEmpty || addrFormatBad;
              const amtInvalid = r.touchedAmt && !isAmtValid(r.amount);
              return (
                <div key={r.id} className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                    <span className="hidden sm:inline-flex h-5 w-5 rounded-full bg-white/20 mr-1" />
                    <input
                      className={`flex-1 min-w-0 max-w-full rounded-lg px-3 py-2 bg-white/10 placeholder-white/40 outline-none border ${addrInvalid ? "border-red-500" : "border-white/15"}`}
                      placeholder="Receiver Pi UID"
                      value={r.address}
                      onChange={(e) => updateAddr(r.id, e.target.value)}
                      onBlur={() => {
                        // Trigger validation on blur
                        setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, touchedAddr: true } : x));
                      }}
                    />
                    {(addrEmpty || addrFormatBad) && (
                      <div className="sm:hidden text-xs text-red-500 mt-1">{addrEmpty ? "Pi UID cannot be empty" : "Invalid Pi UID format"}</div>
                    )}
                    <input
                      className={`rounded-lg w-full sm:w-28 max-w-[8rem] px-3 py-2 bg-white/10 placeholder-white/40 outline-none border text-right ${amtInvalid ? "border-red-500" : "border-white/15"}`}
                      placeholder="Amount"
                      value={r.amount}
                      onChange={(e) => updateAmt(r.id, e.target.value)}
                    />
                    <button
                      className="shrink-0 px-2 py-1 text-xs text-white/70 hover:text-white rounded"
                      onClick={() => removeRow(r.id)}
                      disabled={rows.length <= 1}
                    >
                      Delete
                    </button>
                  </div>
                  {/* Desktop error messages displayed below input */}
                  {(addrEmpty || addrFormatBad) && (
                    <div className="hidden sm:block text-xs text-red-500 mt-1">{addrEmpty ? "Pi UID cannot be empty" : "Invalid Pi UID format"}</div>
                  )}
                </div>
              );
            })}

            {/* Add recipient button */}
            <button className="rounded-xl border border-dashed border-white/25 hover:bg-white/5 px-4 py-3 flex items-center gap-3 overflow-hidden" onClick={tryAddRow}>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">+</span>
              <span>Add Recipient</span>
            </button>

            <div className="rounded-xl px-4 py-3 overflow-hidden">
              <div className="flex items-center justify-between text-base">
                <span className="bg-gradient-to-l from-[#d66675] to-[#a625fc] bg-clip-text text-transparent font-semibold">TOTAL</span>
                <span className="bg-gradient-to-l from-[#f89318] to-[#da6a6e] bg-clip-text text-transparent font-semibold">${Number.isFinite(total) ? total : 0} Pi</span>
              </div>
              <div className="mt-2 h-px bg-white/10" />
            </div>

            {/* Submit button */}
            <button
              className="rounded-full bg-[#32363e] border border-[#a625fc] px-4 py-3 font-medium hover:bg-[#3a3e46] disabled:opacity-60"
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
              {submitting ? "Sending..." : "Continue Transfer"}
            </button>
          </div>

          {msg && <div className="text-sm opacity-80">{msg}</div>}

          {/* Batch transfer status details */}
          {showStatus && statusData && (
            <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-base font-semibold mb-3">Transfer Details</div>
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
          )}

          <div className="mt-4 text-xs opacity-60 bg-white/5 rounded-lg p-3">
            <div className="font-medium mb-1">💡 Transfer Process:</div>
            <div>1. Your payment will be sent to the app wallet</div>
            <div className="font-mono text-[10px] my-1 break-all opacity-80">{APP_WALLET_ADDRESS}</div>
            <div>2. The app wallet will automatically distribute to recipients</div>
            <div>3. The entire process usually takes several seconds</div>
          </div>

          <Link className="text-center rounded-full bg-gradient-to-r from-[#a625fc] to-[#f89318] p-3 font-medium" href="/history">Transaction History</Link>
        </div>
      </div>
    </div>
  );
}


