"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useRequireAuth } from "../contexts/AuthContext";
import { useSessionToken } from "../hooks/useSessionToken";

async function api(path: string, method: string, body?: unknown, auth?: string) {
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

interface MyEnvelope {
  id: string;
  code: string;
  amountPi: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  claimedAt?: string;
  claimedBy?: { username: string; piUid?: string };
  canRefund: boolean;
  isExpired: boolean;
}

export default function RedEnvelopePage() {
  const { isChecking, isAuthenticated, isPiBrowser } = useRequireAuth();
  const router = useRouter();

  // 使用自定义hook获取sessionToken
  const { sessionToken: token, isLoading: tokenLoading, error: tokenError } = useSessionToken(isAuthenticated);
  const userUid = typeof window !== "undefined" ? localStorage.getItem("pi_uid") || "" : "";

  const [amountPi, setAmountPi] = useState<string>("");
  const [durationHours, setDurationHours] = useState<string>("24");
  const [code, setCode] = useState("");
  const [receiverUid, setReceiverUid] = useState<string>(userUid);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"menu" | "create-form" | "claim" | "my-envelopes">("menu");
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [myEnvelopes, setMyEnvelopes] = useState<MyEnvelope[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDurationDropdown(false);
      }
    }

    if (showDurationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showDurationDropdown]);

  // 加载我的红包
  const loadMyEnvelopes = useCallback(async () => {
    try {
      const res = await api("/api/v1/red-envelopes/my-envelopes", "GET", undefined, token);
      if (res.data) {
        setMyEnvelopes(res.data);
      }
    } catch (error) {
      console.error("Failed to load envelopes:", error);
    }
  }, [token]);

  // 当切换到我的红包页面时加载数据
  useEffect(() => {
    if (mode === "my-envelopes" && token) {
      loadMyEnvelopes();
    }
  }, [mode, token, loadMyEnvelopes]);

  // 格式化口令显示（长口令显示前后部分，中间省略号）
  const formatCode = (fullCode: string) => {
    if (fullCode.length <= 16) {
      return fullCode;
    }
    const start = fullCode.substring(0, 8);
    const end = fullCode.substring(fullCode.length - 8);
    return `${start}...${end}`;
  };

  // 复制口令到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // 降级方案：使用传统方法
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (e) {
        console.error("Failed to copy:", e);
      }
      document.body.removeChild(textArea);
    }
  };

  // 显示加载状态
  if (isChecking || tokenLoading) {
    return (
      <div className="min-h-screen bg-[#090b0c] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2">
            {isChecking ? "Checking login status..." : "Loading session..."}
          </div>
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

  // Token获取失败 - 显示错误
  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#090b0c] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg mb-4 text-red-400">Session Error</div>
          <div className="text-sm opacity-60 mb-4">{tokenError}</div>
          <Link href="/" className="text-[#a625fc] underline">
            Return to home page
          </Link>
        </div>
      </div>
    );
  }

  // 生成红包
  const handleGenerateEnvelope = async () => {
    setMsg("");
    setCode("");
    const parsedAmount = Number(amountPi);
    const parsedHours = Number(durationHours);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMsg("Please enter a valid amount");
      return;
    }

    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      setMsg("Please enter a valid duration");
      return;
    }

    if (parsedHours > 24) {
      setMsg("Duration cannot exceed 24 hours");
      return;
    }

    setIsLoading(true);

    try {
      const expiresAt = new Date(Date.now() + parsedHours * 60 * 60 * 1000).toISOString();

      // 1. 调用后端创建红包记录
      const createRes = await api("/api/v1/red-envelopes/create", "POST", { amountPi: parsedAmount, expiresAt }, token);

      if (!createRes?.data) {
        setMsg(createRes?.error || "Failed to create");
        setIsLoading(false);
        return;
      }

      const { envelopeId, code: envelopeCode, amountPi: amount } = createRes.data;

      // 2. 调用 Pi SDK 创建 U2A 支付
      const w = window as unknown as {
        Pi?: {
          createPayment: (
            paymentData: { amount: number; memo: string; metadata: Record<string, unknown> },
            callbacks: {
              onReadyForServerApproval: (paymentId: string) => void;
              onReadyForServerCompletion: (paymentId: string, txid: string) => void;
              onCancel: () => void;
              onError: (error: Error) => void;
            }
          ) => void;
        };
      };

      if (!w.Pi) {
        setMsg("Please open in Pi Browser");
        setIsLoading(false);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        w.Pi!.createPayment(
          {
            amount: parseFloat(amount),
            memo: `Password Gift - ${envelopeCode.substring(0, 8)}`,
            metadata: { type: "red-envelope", envelopeId, code: envelopeCode },
          },
          {
            onReadyForServerApproval: async (paymentId) => {
              try {
                // 3. 通知后端批准支付
                const approveRes = await fetch("/api/v1/red-envelopes/approve-u2a", {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ envelopeId, paymentId }),
                });

                if (!approveRes.ok) {
                  throw new Error("Failed to approve payment");
                }
              } catch (e) {
                reject(e instanceof Error ? e : new Error("Failed to approve payment"));
              }
            },
            onReadyForServerCompletion: async (paymentId, txid) => {
              try {
                // 4. 通知后端完成支付
                const completeRes = await fetch("/api/v1/red-envelopes/complete-u2a", {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ envelopeId, paymentId, txid }),
                });

                if (completeRes.ok) {
                  resolve();
                } else {
                  reject(new Error("Failed to complete payment"));
                }
              } catch (e) {
                reject(e instanceof Error ? e : new Error("Failed to complete payment"));
              }
            },
            onCancel: () => reject(new Error("Payment cancelled")),
            onError: (error) => reject(error),
          }
        );
      });

      // 5. 支付完成后显示口令
      setCode(envelopeCode);
      setMsg("Password gift created successfully!");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed to create, please try again");
    } finally {
      setIsLoading(false);
    }
  };

  // 领取红包
  const handleClaimEnvelope = async () => {
    setMsg("");
    if (!code.trim()) {
      setMsg("Please enter the password");
      return;
    }
    if (!receiverUid.trim()) {
      setMsg("Please enter the receiver's Pi UID");
      return;
    }

    setIsLoading(true);

    try {
      const r = await api("/api/v1/red-envelopes/claim", "POST", { code, receiverUid }, token);
      if (r?.error) {
        setMsg(r.error);
      } else {
        setMsg(`Claimed successfully! Received ${r?.data?.amountPi} Pi (txid: ${r?.data?.txid})`);
        setCode("");
      }
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed to claim");
    } finally {
      setIsLoading(false);
    }
  };

  // 退回红包
  const handleRefundEnvelope = async (envelopeId: string) => {
    if (!confirm("Are you sure you want to refund this expired envelope?")) {
      return;
    }

    setIsLoading(true);

    try {
      const r = await api("/api/v1/red-envelopes/refund", "POST", { envelopeId }, token);
      if (r?.error) {
        setMsg(r.error);
      } else {
        setMsg(`Refunded successfully! Refunded ${r?.data?.amountPi} Pi`);
        // 重新加载红包列表
        await loadMyEnvelopes();
      }
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed to refund");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-white flex flex-col">
      <div className="mx-auto max-w-md w-full px-4 py-5 flex-1 flex flex-col">
        {/* 顶部标题栏 - 精致化 */}
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-3.5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-5">
          {/* 渐变边框效果 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#a625fc]/20 via-transparent to-[#f89318]/20 opacity-50 pointer-events-none" />

          <div className="relative flex items-center gap-3">
            <button
              onClick={() => {
                if (mode === "menu") {
                  router.push("/");
                } else {
                  setMode("menu");
                  setMsg("");
                  setCode("");
                  setShowDurationDropdown(false);
                }
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10 transition-all active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="flex items-center gap-2 flex-1">
              <Image src="/red-envelope.svg" width={20} height={20} alt="Red envelope" className="flex-shrink-0" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">
                Password Gifts
              </h1>
            </div>
          </div>
        </div>

        {/* 内容区域 - 根据模式调整布局 */}
        <div className={`flex-1 flex flex-col ${mode === "my-envelopes" ? "justify-start pt-4" : "justify-center"}`}>

          {mode === "menu" && (
            <div className="flex flex-col gap-6">
              {/* 主卡片区域 - 精致化 */}
              <div className="relative bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-xl p-[1px] shadow-lg">
                <div className="relative bg-[#131519] rounded-xl p-5 overflow-hidden">
                  {/* 渐变装饰 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/5 to-[#f89318]/5 opacity-50 pointer-events-none" />

                  <div className="relative flex flex-col gap-5">
                    {/* Enter the Password 选项 */}
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 flex-shrink-0">
                        <Image src="/red-envelope.svg" width={20} height={20} alt="Red envelope" />
                      </div>
                      <input
                        className="bg-transparent text-white text-base font-normal outline-none border-b border-[#35363c] focus:border-[#a625fc] transition-colors flex-1 py-2"
                        placeholder="Enter the Password"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />
                    </div>

                    {/* Receive Pi Uid 选项 */}
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 flex-shrink-0">
                        <Image src="/wallet.svg" width={20} height={20} alt="Wallet" />
                      </div>
                      <div className="flex flex-col flex-1 gap-2">
                        <p className="text-white text-base font-medium">Receive Pi Uid</p>
                        <input
                          className="bg-transparent text-[#8d8f99] text-sm outline-none border-b border-[#35363c] focus:border-[#f89318] transition-colors py-1"
                          placeholder="Enter your Pi uid"
                          value={receiverUid}
                          onChange={(e) => setReceiverUid(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部按钮 - 紧凑化 */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (code.trim() && receiverUid.trim()) {
                      handleClaimEnvelope();
                    } else {
                      setMode("claim");
                    }
                  }}
                  className="group relative w-full h-12 rounded-xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
                  disabled={isLoading}
                >
                  <div className="absolute inset-0 bg-[#32363e] group-hover:bg-[#3a3e48] transition-colors" />
                  <div className="absolute inset-0 border border-[#a625fc]" />
                  <span className="relative text-white text-base font-semibold">
                    {isLoading ? "Processing..." : "Receive Password Gifts"}
                  </span>
                </button>

                <button
                  onClick={() => setMode("create-form")}
                  className="group relative w-full h-12 rounded-xl overflow-hidden transition-all active:scale-[0.98] shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#a625fc] to-[#f89318] opacity-100 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative text-white text-base font-semibold">
                    Send Password Gifts
                  </span>
                </button>

                <button
                  onClick={() => setMode("my-envelopes")}
                  className="group w-full h-12 bg-[#32363e] border border-[#35363c] rounded-xl text-white text-base font-semibold hover:bg-[#3a3e48] transition-all active:scale-[0.98]"
                >
                  My Password Gifts
                </button>
              </div>

              {/* 消息提示 - 精致化 */}
              {msg && (
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-3 rounded-xl text-center text-sm text-white/90 backdrop-blur-sm">
                  {msg}
                </div>
              )}
            </div>
          )}

          {mode === "create-form" && (
            <div className="flex flex-col gap-6">
              {/* 表单区域 - 紧凑化 */}
              <div className="flex flex-col gap-4">
                {/* Total Amount */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-base font-semibold">Total Amount</label>
                  <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl h-12 px-4 flex items-center justify-between overflow-hidden backdrop-blur-sm shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/5 to-[#f89318]/5 opacity-50 pointer-events-none" />
                    <input
                      className="relative bg-transparent text-white text-lg font-semibold outline-none flex-1"
                      type="number"
                      placeholder="1000"
                      value={amountPi}
                      onChange={(e) => setAmountPi(e.target.value)}
                    />
                    <span className="relative text-white text-lg font-semibold">Pi</span>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-base font-semibold">Duration</label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                      className="w-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl h-12 px-4 flex items-center justify-between hover:border-[#a625fc] transition-colors backdrop-blur-sm shadow-lg overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/5 to-[#f89318]/5 opacity-50 pointer-events-none" />
                      <span className="relative text-white text-lg font-semibold">{durationHours} Hours</span>
                      <svg className="relative w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showDurationDropdown && (
                      <div className="absolute top-full mt-2 w-full bg-[#131519] border border-[#35363c] rounded-xl overflow-hidden z-10 shadow-2xl backdrop-blur-sm">
                        {[1, 2, 3, 6, 12, 24].map((hours) => (
                          <button
                            key={hours}
                            onClick={() => {
                              setDurationHours(hours.toString());
                              setShowDurationDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 text-white text-base hover:bg-[#a625fc]/20 transition-colors text-left font-medium"
                          >
                            {hours} Hours
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generate Button - 精致化 */}
              <button
                className="group relative w-full h-12 rounded-xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
                onClick={handleGenerateEnvelope}
                disabled={isLoading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#a625fc] to-[#f89318] opacity-100 group-hover:opacity-90 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative text-white text-base font-semibold flex items-center justify-center gap-2">
                  {isLoading && (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {isLoading ? "Processing..." : "Generate Password Gift"}
                </span>
              </button>

              {/* Success/Error Messages - 精致化 */}
              {code && (
                <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-[#a625fc] rounded-xl p-4 overflow-hidden backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/10 to-[#f89318]/10 opacity-50 pointer-events-none" />

                  <div className="relative">
                    <p className="text-white/70 text-sm mb-3 text-center font-semibold">Password:</p>

                    {/* 口令显示区域 */}
                    <div className="bg-[#1e2126]/50 border border-[#32363e] rounded-lg p-3 mb-3 backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-2">
                        {/* 口令文本 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-mono text-sm break-all" title={code}>
                            {formatCode(code)}
                          </p>
                        </div>

                        {/* Copy按钮 */}
                        <button
                          onClick={() => copyToClipboard(code)}
                          className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-lg text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                        >
                          {copySuccess ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-white/70 text-xs text-center leading-relaxed">
                      Please share this password with your friends, they can use this password to claim the envelope
                    </p>
                  </div>
                </div>
              )}
              {msg && !code && (
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-3 rounded-xl text-center text-sm text-white/90 backdrop-blur-sm">
                  {msg}
                </div>
              )}
            </div>
          )}

          {mode === "claim" && (
            <div className="flex flex-col gap-4">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-[#a625fc] rounded-xl p-4 overflow-hidden backdrop-blur-sm shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/10 to-[#f89318]/10 opacity-50 pointer-events-none" />

                <div className="relative">
                  <h3 className="text-lg font-bold mb-4 text-white">Claim Password Gift</h3>
                  <div className="flex flex-col gap-3">
                    <input
                      className="bg-[#1e2126]/50 border border-[#32363e] text-white text-sm p-2.5 rounded-lg placeholder:text-[#8d8f99] focus:outline-none focus:border-[#a625fc] transition-colors"
                      placeholder="Enter password code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                    <input
                      className="bg-[#1e2126]/50 border border-[#32363e] text-white text-sm p-2.5 rounded-lg placeholder:text-[#8d8f99] focus:outline-none focus:border-[#f89318] transition-colors"
                      placeholder="Enter your Pi UID"
                      value={receiverUid}
                      onChange={(e) => setReceiverUid(e.target.value)}
                    />
                    <button
                      className="group relative w-full h-11 rounded-xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg mt-1"
                      onClick={handleClaimEnvelope}
                      disabled={isLoading}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#a625fc] to-[#f89318] opacity-100 group-hover:opacity-90 transition-opacity" />
                      <span className="relative text-white text-base font-semibold">
                        {isLoading ? "Processing..." : "Claim Gift"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              {msg && (
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-3 rounded-xl text-sm text-white/90 backdrop-blur-sm">
                  {msg}
                </div>
              )}
            </div>
          )}

          {mode === "my-envelopes" && (
            <div className="mx-auto w-full" style={{ maxWidth: '300px' }}>
              <div className="flex flex-col gap-4">
                {/* 标题 - 带装饰 */}
                <div className="text-center relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[#a625fc] to-transparent"></div>
                  </div>
                  <h3 className="relative inline-block px-4 text-lg font-extrabold bg-gradient-to-r from-[#a625fc] via-[#d66675] to-[#f89318] bg-clip-text text-transparent">
                    My Password Gifts
                  </h3>
                </div>

                {myEnvelopes.length === 0 ? (
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    <div className="relative bg-[#131519] rounded-2xl p-6 text-center">
                      <p className="text-white/70 text-sm font-semibold">No password gifts created yet</p>
                    </div>
                  </div>
                ) : (
                  myEnvelopes.map((env) => (
                    <div key={env.id} className="relative group">
                      {/* 发光边框效果 */}
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#a625fc] via-[#d66675] to-[#f89318] rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-300"></div>

                      {/* 主卡片 */}
                      <div className="relative bg-gradient-to-br from-[#1a1d24] to-[#131519] rounded-2xl overflow-hidden border border-[#a625fc]/30">
                        {/* 顶部装饰条 */}
                        <div className="h-1 bg-gradient-to-r from-[#a625fc] via-[#d66675] to-[#f89318]"></div>

                        {/* 背景装饰 */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#a625fc]/10 to-transparent rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#f89318]/10 to-transparent rounded-full blur-2xl"></div>

                        {/* 内容区域 */}
                        <div className="relative p-4">
                          {/* 金额和状态 */}
                          <div className="mb-3">
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="text-2xl font-black bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">
                                {env.amountPi}
                              </span>
                              <span className="text-sm font-bold text-white/60">Pi</span>
                            </div>

                            {/* 状态徽章 */}
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${env.status === 'claimed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              env.status === 'expired' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                env.status === 'refunded' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                  env.status === 'active' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                              {env.status === 'claimed' ? 'Claimed' :
                                env.status === 'expired' ? 'Expired' :
                                  env.status === 'refunded' ? 'Refunded' :
                                    env.status === 'active' ? 'Claimable' : 'Processing'}
                            </div>
                          </div>

                          {/* 详细信息 */}
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-center gap-2 text-[10px]">
                              <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-white/60 font-medium">{new Date(env.expiresAt).toLocaleString()}</span>
                            </div>
                            {env.claimedBy && (
                              <div className="flex items-center gap-2 text-[10px]">
                                <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-white/60 font-medium">{env.claimedBy.username}</span>
                              </div>
                            )}
                          </div>

                          {/* 口令区域 */}
                          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-3.5 h-3.5 text-[#a625fc]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Password</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs font-bold font-mono text-white/90 break-all" title={env.code}>
                                {formatCode(env.code)}
                              </code>
                              <button
                                onClick={() => copyToClipboard(env.code)}
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#a625fc] to-[#f89318] hover:scale-110 active:scale-95 transition-transform shadow-lg"
                              >
                                {copySuccess ? (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Refund按钮 */}
                          {env.canRefund && (
                            <button
                              onClick={() => handleRefundEnvelope(env.id)}
                              className="mt-3 w-full h-9 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-xl text-white text-xs font-bold hover:shadow-lg hover:shadow-[#a625fc]/50 active:scale-95 transition-all disabled:opacity-50"
                              disabled={isLoading}
                            >
                              <span className="flex items-center justify-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                Claim Back
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {msg && (
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    <div className="relative bg-[#131519] rounded-xl p-3 text-center border border-blue-500/30">
                      <p className="text-sm font-semibold text-white/90">{msg}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
