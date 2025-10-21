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
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="mx-auto max-w-md p-6">
        {/* 顶部标题栏 */}
        <div className="flex items-center gap-4 mb-12 mt-4">
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
            className="flex items-center justify-center w-5 h-5"
          >
            <svg
              width="20"
              height="15"
              viewBox="0 0 20 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <path
                d="M8 1L2 7.5L8 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 7.5H18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">
            Password Gifts
          </h1>
        </div>

        {mode === "menu" && (
          <div className="flex flex-col gap-12">
            {/* 主卡片区域 */}
            <div className="bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-[10px] p-[1px]">
              <div className="bg-[#131519] rounded-[10px] p-8">
                <div className="flex flex-col gap-6">
                  {/* Enter the Password 选项 */}
                  <div className="flex items-center gap-7">
                    <div className="w-5 h-5 flex-shrink-0">
                      <Image src="/red-envelope.svg" width={21} height={20} alt="Red envelope" />
                    </div>
                    <input
                      className="bg-transparent text-white text-xl font-normal outline-none border-b border-[#35363c] focus:border-[#a625fc] transition-colors flex-1 py-2"
                      placeholder="Enter the Password"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>

                  {/* Receive Pi Uid 选项 */}
                  <div className="flex items-center gap-7">
                    <div className="w-5 h-5 flex-shrink-0">
                      <Image src="/wallet.svg" width={20} height={20} alt="Wallet" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <p className="text-white text-xl font-normal mb-2">Receive Pi Uid</p>
                      <input
                        className="bg-transparent text-[#8d8f99] text-base outline-none border-b border-[#35363c] focus:border-[#a625fc] transition-colors py-1"
                        placeholder="Enter your Pi uid"
                        value={receiverUid}
                        onChange={(e) => setReceiverUid(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex flex-col gap-5">
              <button
                onClick={() => {
                  if (code.trim() && receiverUid.trim()) {
                    handleClaimEnvelope();
                  } else {
                    setMode("claim");
                  }
                }}
                className="w-full h-16 bg-[#32363e] border border-[#a625fc] rounded-full text-white text-xl font-medium hover:bg-[#3a3e48] transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Receive Password Gifts"}
              </button>
              <button
                onClick={() => setMode("create-form")}
                className="w-full h-16 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-xl font-medium hover:opacity-90 transition-opacity"
              >
                Send Password Gifts
              </button>
              <button
                onClick={() => setMode("my-envelopes")}
                className="w-full h-16 bg-[#32363e] border border-[#35363c] rounded-full text-white text-xl font-medium hover:bg-[#3a3e48] transition-colors"
              >
                My Password Gifts
              </button>
            </div>

            {/* 消息提示 */}
            {msg && (
              <div className="bg-[#131519] border border-[#35363c] p-4 rounded-[10px] text-center text-[#8d8f99]">
                {msg}
              </div>
            )}
          </div>
        )}

        {mode === "create-form" && (
          <div className="flex flex-col gap-[60px] mt-8">
            {/* 表单区域 */}
            <div className="flex flex-col gap-[15px]">
              {/* Total Amount */}
              <div className="flex flex-col gap-3">
                <label className="text-white text-xl font-normal">Total Amount</label>
                <div className="bg-[#090b0c] border border-[#35363c] rounded-[9px] h-[60px] px-5 flex items-center justify-between">
                  <input
                    className="bg-transparent text-white text-2xl font-medium outline-none flex-1"
                    type="number"
                    placeholder="1000"
                    value={amountPi}
                    onChange={(e) => setAmountPi(e.target.value)}
                  />
                  <span className="text-white text-2xl font-medium">Pi</span>
                </div>
              </div>

              {/* Duration */}
              <div className="flex flex-col gap-3">
                <label className="text-white text-xl font-normal">Duration</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                    className="w-full bg-[#090b0c] border border-[#35363c] rounded-[9px] h-[60px] px-5 flex items-center justify-between hover:border-[#a625fc] transition-colors"
                  >
                    <span className="text-white text-2xl font-medium">{durationHours} Hours</span>
                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 10L13 16L19 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {showDurationDropdown && (
                    <div className="absolute top-full mt-2 w-full bg-[#131519] border border-[#35363c] rounded-[9px] overflow-hidden z-10">
                      {[1, 2, 3, 6, 12, 24].map((hours) => (
                        <button
                          key={hours}
                          onClick={() => {
                            setDurationHours(hours.toString());
                            setShowDurationDropdown(false);
                          }}
                          className="w-full px-5 py-3 text-white text-xl hover:bg-[#a625fc]/20 transition-colors text-left"
                        >
                          {hours} Hours
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              className="w-full h-[63px] bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              onClick={handleGenerateEnvelope}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Generate Password Gift"}
            </button>

            {/* Success/Error Messages */}
            {code && (
              <div className="bg-[#131519] border border-[#a625fc] rounded-[10px] p-6">
                <p className="text-[#8d8f99] text-base mb-4 text-center">Password:</p>

                {/* 口令显示区域 */}
                <div className="bg-[#1e2126] border border-[#32363e] rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between gap-3">
                    {/* 口令文本 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-mono text-base break-all" title={code}>
                        {formatCode(code)}
                      </p>
                    </div>

                    {/* Copy按钮 */}
                    <button
                      onClick={() => copyToClipboard(code)}
                      className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      {copySuccess ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[#8d8f99] text-sm text-center">
                  Please share this password with your friends, they can use this password to claim the envelope
                </p>
              </div>
            )}
            {msg && !code && (
              <div className="bg-[#131519] border border-[#35363c] p-4 rounded-[10px] text-center text-[#8d8f99]">
                {msg}
              </div>
            )}
          </div>
        )}

        {mode === "claim" && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#131519] border border-[#a625fc] rounded-[10px] p-6">
              <h3 className="text-xl font-medium mb-4 text-white">Claim Password Gift</h3>
              <div className="flex flex-col gap-4">
                <input
                  className="bg-[#1e2126] border border-[#32363e] text-white p-3 rounded-lg placeholder:text-[#8d8f99] focus:outline-none focus:border-[#a625fc]"
                  placeholder="Enter password code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <input
                  className="bg-[#1e2126] border border-[#32363e] text-white p-3 rounded-lg placeholder:text-[#8d8f99] focus:outline-none focus:border-[#a625fc]"
                  placeholder="Enter your Pi UID"
                  value={receiverUid}
                  onChange={(e) => setReceiverUid(e.target.value)}
                />
                <button
                  className="w-full h-12 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  onClick={handleClaimEnvelope}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Claim Gift"}
                </button>
              </div>
            </div>
            {msg && (
              <div className="bg-[#1e2126] border border-[#32363e] p-4 rounded-lg text-sm text-[#8d8f99]">
                {msg}
              </div>
            )}
          </div>
        )}

        {mode === "my-envelopes" && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-medium text-white mb-2">My Password Gifts</h3>

            {myEnvelopes.length === 0 ? (
              <div className="bg-[#131519] border border-[#35363c] rounded-[10px] p-8 text-center">
                <p className="text-[#8d8f99]">No password gifts created yet</p>
              </div>
            ) : (
              myEnvelopes.map((env) => (
                <div key={env.id} className="bg-[#131519] border border-[#35363c] rounded-[10px] p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="text-white text-lg font-medium">{env.amountPi} Pi</p>
                      <p className="text-[#8d8f99] text-sm mt-1">
                        Status: {
                          env.status === 'claimed' ? '✅ Claimed' :
                            env.status === 'expired' ? '⏰ Expired' :
                              env.status === 'refunded' ? '↩️ Refunded' :
                                env.status === 'active' ? '🎁 Claimable' : '⏳ Processing'
                        }
                      </p>
                      <p className="text-[#8d8f99] text-xs mt-1">
                        Expiration time: {new Date(env.expiresAt).toLocaleString()}
                      </p>
                      {env.claimedBy && (
                        <p className="text-[#8d8f99] text-xs mt-1">
                          Claimed by: {env.claimedBy.username}
                        </p>
                      )}
                    </div>
                    {env.canRefund && (
                      <button
                        onClick={() => handleRefundEnvelope(env.id)}
                        className="px-4 py-2 bg-[#a625fc] rounded-lg text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        disabled={isLoading}
                      >
                        Claim Back
                      </button>
                    )}
                  </div>
                  <div className="pt-3 border-t border-[#35363c]">
                    <p className="text-[#8d8f99] text-xs mb-2">Password:</p>
                    <div className="bg-[#1e2126] border border-[#32363e] rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-xs font-mono break-all flex-1" title={env.code}>
                          {formatCode(env.code)}
                        </p>
                        <button
                          onClick={() => copyToClipboard(env.code)}
                          className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded text-white text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          {copySuccess ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {msg && (
              <div className="bg-[#1e2126] border border-[#32363e] p-4 rounded-lg text-sm text-[#8d8f99]">
                {msg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
