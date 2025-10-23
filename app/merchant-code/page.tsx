"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRequireAuth } from "../contexts/AuthContext";

export default function MerchantCodePage() {
  const { isChecking, isAuthenticated, isPiBrowser } = useRequireAuth();
  const [stage, setStage] = useState<"checking" | "init" | "editing" | "generated" | "existing">("checking");
  const [merchantUid, setMerchantUid] = useState("");
  const [startPi, setStartPi] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [amountEntered, setAmountEntered] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [dividendPool, setDividendPool] = useState(0);
  const [copySuccess, setCopySuccess] = useState<"uid" | "dividend" | null>(null);
  const [distributingDividend, setDistributingDividend] = useState(false);
  const [dividendMsg, setDividendMsg] = useState("");
  const [showPendingPaymentHelp, setShowPendingPaymentHelp] = useState(false);
  const [tryingAutoFix, setTryingAutoFix] = useState(false);

  const canGenerate = useMemo(() => {
    const amt = Number(startPi);
    return merchantUid.length > 0 && Number.isFinite(amt) && amt > 0;
  }, [merchantUid, startPi]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        let sessionToken = localStorage.getItem("sessionToken") || "";
        const piAccessToken = localStorage.getItem("pi_accessToken") || "";
        const piUsername = localStorage.getItem("pi_username") || "";
        const piWallet = localStorage.getItem("pi_walletAddress") || "";
        const piUid = localStorage.getItem("pi_uid") || "";

        // 设置当前用户的 UID
        setMerchantUid(piUid);

        // 若无 sessionToken 但有 Pi accessToken，则尝试换取 sessionToken
        if (!sessionToken && piAccessToken && piUsername) {
          const res = await fetch("/api/v1/auth/pi-login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ piAccessToken, username: piUsername, walletAddress: piWallet || undefined, uid: piUid }),
          });
          const j = await res.json();
          if (!j?.error && j?.data?.sessionToken) {
            sessionToken = j.data.sessionToken;
            localStorage.setItem("sessionToken", sessionToken);
          }
        }

        if (!sessionToken) { setStage("init"); return; }

        // 检查是否有未完成的 U2A 支付需要处理
        const incompletePaymentStr = localStorage.getItem("pi_incomplete_payment");
        if (incompletePaymentStr) {
          try {
            const incompletePayment = JSON.parse(incompletePaymentStr);
            console.log("Checking incomplete payment:", incompletePayment);

            // 检查是否是商家注册支付
            if (incompletePayment?.metadata?.flow === "merchant-register") {
              // 如果有 transaction 和 txid，尝试完成它
              if (incompletePayment.identifier &&
                incompletePayment.transaction?.txid) {

                console.log("Attempting to complete incomplete merchant registration payment");
                setError("Completing previous incomplete payment...");

                const res = await fetch("/api/v1/merchant-code/complete-registration", {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                    Authorization: `Bearer ${sessionToken}`
                  },
                  body: JSON.stringify({
                    paymentId: incompletePayment.identifier,
                    txid: incompletePayment.transaction.txid,
                    startPi: incompletePayment.metadata.startPi || incompletePayment.amount
                  }),
                });

                if (res.ok) {
                  const result = await res.json();
                  setQrUrl(result.data.qrPngDataUrl);
                  setMerchantId(result.data.id);
                  setDividendPool(result.data.dividendPool);
                  setStage("existing");
                  setError("");

                  // 清除已处理的未完成支付
                  localStorage.removeItem("pi_incomplete_payment");
                  console.log("Successfully completed incomplete payment");
                  return;
                } else {
                  const errData = await res.json();
                  console.error("Failed to complete incomplete payment:", errData);
                  setError(`Failed to complete previous payment: ${errData.error || "Unknown error"}`);
                }
              }
            }
          } catch (error) {
            console.error("Error processing incomplete payment:", error);
          }
        }

        // 检查是否有未完成的 A2U 支付并处理（后台任务）
        await checkAndHandleIncompletePayments();

        const me = await fetch("/api/v1/merchant-code/me", { headers: { Authorization: `Bearer ${sessionToken}` } });
        const mj = await me.json();
        if (mj?.data) {
          setQrUrl(mj.data.qrPngDataUrl);
          setMerchantId(mj.data.id);
          const pool = mj.data.dividendPool ?? 0;
          setDividendPool(pool);
          setStage("existing");
        } else {
          setStage("init");
        }
      } catch {
        setStage("init");
      }
    };
    bootstrap();
  }, []);

  const handleAmountEnter = () => {
    setError("");
    const amt = Number(startPi.trim());
    if (!Number.isFinite(amt) || amt <= 0) {
      setStartPi("");
      setAmountEntered(false);
      setShowAmountInput(false);
      setError("Invalid starting amount: must be a positive number");
      return;
    }
    setAmountEntered(true);
    setShowAmountInput(false);
  };

  const copyToClipboard = async (text: string, type: "uid" | "dividend") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      setError("Failed to copy, please manually copy");
    }
  };

  // 检查并处理未完成的 A2U 支付
  const checkAndHandleIncompletePayments = async () => {
    try {
      const res = await fetch("/api/v1/payments/incomplete");
      if (!res.ok) return;

      const data = await res.json();
      const payments = data.data || [];

      if (payments.length > 0) {
        console.log("Found incomplete A2U payments:", payments);
        // A2U 支付不影响 U2A 支付，所以只记录日志
        // 这些是从 App 到用户的支付，与商家注册无关
      }
    } catch (error) {
      console.error("Failed to check incomplete payments:", error);
      // 忽略错误，不影响正常流程
    }
  };

  // 尝试自动修复未完成的支付
  const tryAutoFixIncompletePayment = async () => {
    setTryingAutoFix(true);
    setError("");

    try {
      const incompletePaymentStr = localStorage.getItem("pi_incomplete_payment");
      if (!incompletePaymentStr) {
        setError("No incomplete payment found. You can try to create a new payment now.");
        setShowPendingPaymentHelp(false);
        setTryingAutoFix(false);
        return;
      }

      const incompletePayment = JSON.parse(incompletePaymentStr);
      const sessionToken = localStorage.getItem("sessionToken") || "";

      if (!sessionToken) {
        setError("Not logged in. Please refresh the page and try again.");
        setTryingAutoFix(false);
        return;
      }

      // 检查是否是商家注册支付
      if (incompletePayment?.metadata?.flow === "merchant-register") {
        // 如果有 transaction 和 txid，尝试完成它
        if (incompletePayment.identifier && incompletePayment.transaction?.txid) {
          const res = await fetch("/api/v1/merchant-code/complete-registration", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
              paymentId: incompletePayment.identifier,
              txid: incompletePayment.transaction.txid,
              startPi: incompletePayment.metadata.startPi || incompletePayment.amount
            }),
          });

          if (res.ok) {
            const result = await res.json();
            setQrUrl(result.data.qrPngDataUrl);
            setMerchantId(result.data.id);
            setDividendPool(result.data.dividendPool);
            setStage("existing");
            setShowPendingPaymentHelp(false);
            setError("");

            // 清除已处理的未完成支付
            localStorage.removeItem("pi_incomplete_payment");

            alert("Successfully completed the incomplete payment! Your merchant QR code is now ready.");
          } else {
            const errData = await res.json();
            setError(`Auto-fix failed: ${errData.error || "Unknown error"}. Please wait 5-10 minutes and refresh the page.`);
          }
        } else {
          setError("The incomplete payment doesn't have transaction data. Please wait 5-10 minutes and refresh the page.");
        }
      } else {
        // 不是商家注册支付，可以清除
        localStorage.removeItem("pi_incomplete_payment");
        setError("Cleared unrelated incomplete payment. You can try to create a new payment now.");
        setShowPendingPaymentHelp(false);
      }
    } catch (error) {
      console.error("Auto-fix error:", error);
      setError(error instanceof Error ? error.message : "Auto-fix failed");
    } finally {
      setTryingAutoFix(false);
    }
  };

  const onGenerate = async () => {
    try {
      setError("");
      setGenerateSuccess(false);

      const sessionToken = localStorage.getItem("sessionToken") || "";
      if (!sessionToken) { setError("Not logged in or session expired"); return; }

      // 0. 先检查是否有未完成的支付
      const incompletePaymentStr = localStorage.getItem("pi_incomplete_payment");
      if (incompletePaymentStr) {
        try {
          const incompletePayment = JSON.parse(incompletePaymentStr);
          console.log("Found incomplete payment before creating new one:", incompletePayment);

          if (incompletePayment?.metadata?.flow === "merchant-register") {
            // 显示帮助对话框
            setShowPendingPaymentHelp(true);
            setError("You have an incomplete merchant registration payment that needs to be resolved first.");
            return;
          }
        } catch {
          // 解析失败，清除无效数据
          localStorage.removeItem("pi_incomplete_payment");
        }
      }

      // 1. 先调用准备接口
      const prepareRes = await fetch("/api/v1/merchant-code/generate", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${sessionToken}` },
      });
      const prepareData = await prepareRes.json();
      if (prepareData?.error) { setError(prepareData.error); return; }

      // 2. 发起 Pi 支付
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

      if (!w.Pi) {
        setError("Please use this feature in Pi Browser");
        return;
      }

      const amount = Number(startPi);

      await new Promise<void>((resolve, reject) => {
        w.Pi!.createPayment(
          {
            amount,
            memo: `Merchant registration fee ${amount} Pi`,
            metadata: {
              flow: "merchant-register",
              merchantUid,
              startPi: amount
            },
          },
          {
            onReadyForServerApproval: async (paymentId) => {
              try {
                const r = await fetch("/api/v1/payments/approve", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ paymentId }),
                });
                if (!r.ok) throw new Error("Failed to approve payment");
              } catch (e) {
                reject(e instanceof Error ? e : new Error("Failed to approve payment"));
              }
            },
            onReadyForServerCompletion: async (paymentId, txid) => {
              try {
                // 调用完成注册接口
                const r = await fetch("/api/v1/merchant-code/complete-registration", {
                  method: "POST",
                  headers: { "content-type": "application/json", Authorization: `Bearer ${sessionToken}` },
                  body: JSON.stringify({ paymentId, txid, startPi: amount }),
                });

                if (!r.ok) throw new Error("Failed to complete payment");

                const result = await r.json();
                if (result?.error) throw new Error(result.error);

                // 设置二维码和状态
                setQrUrl(result.data.qrPngDataUrl);
                setMerchantId(result.data.id);
                setDividendPool(result.data.dividendPool);
                setStage("generated");
                setGenerateSuccess(true);

                // 清除未完成支付标记（如果有）
                localStorage.removeItem("pi_incomplete_payment");

                resolve();
              } catch (e) {
                reject(e instanceof Error ? e : new Error("Failed to complete payment"));
              }
            },
            onCancel: () => reject(new Error("Payment cancelled")),
            onError: (error: Error) => reject(error),
          }
        );
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate, please try again";

      // 检查是否是 pending payment 错误
      if (errorMsg.toLowerCase().includes("pending payment") ||
        errorMsg.toLowerCase().includes("incomplete payment") ||
        errorMsg.toLowerCase().includes("needs an action")) {
        setShowPendingPaymentHelp(true);
        setError("You have an incomplete payment that needs to be resolved.");
      } else {
        setError(errorMsg);
      }
    }
  };

  const onDistributeDividends = async () => {
    try {
      setError("");
      setDividendMsg("");
      setDistributingDividend(true);

      const sessionToken = localStorage.getItem("sessionToken") || "";
      if (!sessionToken) {
        setError("Not logged in or session expired");
        setDistributingDividend(false);
        return;
      }

      if (!merchantId) {
        setError("Merchant information not found");
        setDistributingDividend(false);
        return;
      }

      const res = await fetch(`/api/v1/merchants/${merchantId}/dividend`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
      });

      const result = await res.json();

      if (result?.error) {
        setError(result.error);
        setDistributingDividend(false);
        return;
      }

      setDividendMsg(`Dividend distribution started, ${result.data.recipientCount} users will receive a total of ${result.data.totalDividend} Pi dividends`);

      // 分红成功后刷新数据
      setTimeout(async () => {
        const me = await fetch("/api/v1/merchant-code/me", {
          headers: { Authorization: `Bearer ${sessionToken}` }
        });
        const mj = await me.json();
        if (mj?.data) {
          setDividendPool(mj.data.dividendPool ?? 0);
        }
        setDistributingDividend(false);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to distribute dividends");
      setDistributingDividend(false);
    }
  };

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
    <div className="min-h-screen bg-[#090b0c] text-white flex flex-col">
      <div className="mx-auto max-w-md w-full px-4 py-5 flex-1 flex flex-col">
        {/* 顶部选项卡 - 精致化 */}
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-3.5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-5">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#a625fc]/20 via-transparent to-[#f89318]/20 opacity-50 pointer-events-none" />

          <div className="relative flex items-center justify-center">
            <Link href="/" className="absolute left-0 inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10 transition-all active:scale-95">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <div className="flex items-center gap-5">
              <button className="relative text-base font-bold text-[#a625fc]">
                Merchant
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#a625fc] rounded-full" />
              </button>
              <Link
                href="/scan-pay"
                className="text-base font-semibold transition-colors text-white/60 hover:text-white"
              >
                Payment
              </Link>
            </div>
          </div>
        </div>

        {/* 内容区域 - 垂直居中 + 收窄 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="mx-auto w-full" style={{ maxWidth: '340px' }}>
            {/* 二维码区域 - 紧凑化 */}
            <div className="mb-6 flex justify-center">
              {(stage === "generated" || stage === "existing") && qrUrl ? (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-2xl blur opacity-50 group-hover:opacity-75 transition duration-300"></div>
                  <div className="relative w-52 h-52 rounded-xl overflow-hidden border-2 border-[#a625fc]/50 bg-white p-2 shadow-2xl">
                    <Image src={qrUrl} alt="Merchant QR Code" width={208} height={208} className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : (
                <div className="w-52 h-52 rounded-xl border-2 border-dashed border-white/20 bg-gradient-to-br from-white/5 to-black/20 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center text-xs text-white/50 font-medium px-4">
                    {stage === "checking" ? "Loading..." : "QR code will be displayed after generation"}
                  </div>
                </div>
              )}
            </div>

            {/* 输入区域 - 紧凑化 */}
            <div className="flex flex-col gap-5 mb-6">
              {/* Your Pi UID (只读显示) - 精致化 */}
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/5 to-[#f89318]/5 opacity-50 pointer-events-none" />

                <div className="relative flex flex-col gap-1 flex-1 min-w-0">
                  <div className="text-xs text-white/70 font-bold uppercase tracking-wide">Your Pi UID</div>
                  <div className="text-sm font-semibold text-white break-all">
                    {merchantUid || "Not logged in"}
                  </div>
                </div>
                {merchantUid && (
                  <button
                    className="relative h-9 px-4 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-lg text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform ml-3 shadow-lg"
                    onClick={() => copyToClipboard(merchantUid, "uid")}
                  >
                    {copySuccess === "uid" ? "✓ Copied" : "Copy"}
                  </button>
                )}
              </div>

              {/* Starting Amount / Current Accumulated Dividends - 精致化 */}
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#f89318]/5 to-[#a625fc]/5 opacity-50 pointer-events-none" />

                {stage === "existing" || stage === "generated" ? (
                  <>
                    <div className="relative flex flex-col gap-1 flex-1">
                      <div className="text-xs text-white/70 font-bold uppercase tracking-wide">Accumulated Dividends</div>
                      <div className="text-sm font-bold text-white">{dividendPool.toFixed(6)} Pi</div>
                    </div>
                    <button
                      className="relative h-9 px-4 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-lg text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform shadow-lg"
                      onClick={() => copyToClipboard(String(dividendPool), "dividend")}
                    >
                      {copySuccess === "dividend" ? "✓ Copied" : "Copy"}
                    </button>
                  </>
                ) : showAmountInput ? (
                  <>
                    <input
                      type="text"
                      value={startPi}
                      onChange={(e) => setStartPi(e.target.value)}
                      placeholder="Enter Starting Amount"
                      className="relative flex-1 bg-transparent text-lg font-semibold text-white placeholder:text-[#7d7f88] outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAmountEnter();
                        }
                      }}
                      onBlur={() => {
                        handleAmountEnter();
                      }}
                      autoFocus
                    />
                  </>
                ) : (
                  <>
                    {amountEntered && startPi ? (
                      <div className="relative flex flex-col gap-1 flex-1">
                        <div className="text-xs text-white/70 font-bold uppercase tracking-wide">Starting Amount</div>
                        <div className="text-sm font-bold text-white">{startPi} Pi</div>
                      </div>
                    ) : (
                      <div className="relative text-base font-semibold text-white">Starting Amount</div>
                    )}
                    <button
                      className={`relative h-9 px-4 rounded-lg text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform shadow-lg ${amountEntered ? "bg-[#27ae75]" : "bg-gradient-to-r from-[#a625fc] to-[#f89318]"
                        }`}
                      onClick={() => {
                        setAmountEntered(false);
                        setShowAmountInput(true);
                      }}
                    >
                      {amountEntered ? "✓ Entered" : "Enter"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Generate 按钮 / Distribute Dividends 按钮 - 紧凑化 */}
            <div className="mb-4">
              {stage === "existing" || stage === "generated" ? (
                <button
                  className="group relative w-full h-12 rounded-xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
                  onClick={onDistributeDividends}
                  disabled={distributingDividend || dividendPool <= 0}
                >
                  <div className="absolute inset-0 bg-[#32363e] group-hover:bg-[#3a3f49] transition-colors" />
                  <span className="relative text-white text-base font-semibold">
                    {distributingDividend ? "Processing..." : dividendPool <= 0 ? "No Dividends Available" : "Distribute Dividends"}
                  </span>
                </button>
              ) : (
                <button
                  disabled={!canGenerate}
                  onClick={onGenerate}
                  className={`group relative w-full h-12 rounded-xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${amountEntered ? "" : ""
                    }`}
                >
                  {amountEntered ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-[#a625fc] to-[#f89318] opacity-100 group-hover:opacity-90 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[#32363e] group-hover:bg-[#3a3f49] transition-colors" />
                  )}
                  <span className="relative text-white text-base font-semibold">
                    {generateSuccess ? "✓ Success!" : "Generate"}
                  </span>
                </button>
              )}
            </div>

            {/* 消息提示 - 精致化 */}
            {error && (
              <div className="mb-3 text-xs bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 mt-0.5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-300 flex-1 font-medium">{error}</span>
                </div>
              </div>
            )}
            {dividendMsg && (
              <div className="mb-3 text-xs bg-green-900/30 border border-green-500/30 rounded-lg px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 mt-0.5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-300 flex-1 font-medium">{dividendMsg}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Pending Payment Help Dialog */}
      {showPendingPaymentHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1a1d24] rounded-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowPendingPaymentHelp(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <div className="text-xl font-semibold text-white mb-2">Incomplete Payment Detected</div>
              <div className="text-sm text-white/70">
                Pi Network has detected an incomplete payment from a previous attempt. This needs to be resolved before you can create a new payment.
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-[#252830] rounded-lg p-4 border-2 border-[#a625fc]/30">
                <div className="text-white font-medium mb-2">🔧 Solution 1: Try Auto-Fix (Recommended)</div>
                <div className="text-sm text-white/70 mb-3">
                  Click the button below to automatically complete your incomplete payment and generate your merchant QR code.
                </div>
                <button
                  onClick={tryAutoFixIncompletePayment}
                  disabled={tryingAutoFix}
                  className="w-full h-10 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {tryingAutoFix ? "Fixing..." : "Try Auto-Fix"}
                </button>
              </div>

              <div className="bg-[#252830] rounded-lg p-4">
                <div className="text-white font-medium mb-2">⏰ Solution 2: Wait and Retry</div>
                <div className="text-sm text-white/70">
                  If auto-fix doesn&apos;t work, wait 5-10 minutes, then refresh the page and try again.
                </div>
              </div>

              <div className="bg-[#252830] rounded-lg p-4">
                <div className="text-white font-medium mb-2">🔄 Solution 3: Refresh Now</div>
                <div className="text-sm text-white/70">
                  Sometimes a simple refresh can resolve the issue. The system will attempt to complete the payment automatically on page load.
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPendingPaymentHelp(false);
                  window.location.reload();
                }}
                className="flex-1 h-12 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white font-medium hover:opacity-90 transition-opacity"
              >
                Refresh Page
              </button>
              <button
                onClick={() => setShowPendingPaymentHelp(false)}
                className="flex-1 h-12 bg-[#32363e] rounded-full text-white font-medium hover:bg-[#3a3f49] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
