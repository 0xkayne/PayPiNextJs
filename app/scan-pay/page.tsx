"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRequireAuth } from "../contexts/AuthContext";

export default function ScanPayPage() {
  const { isChecking, isAuthenticated, isPiBrowser } = useRequireAuth();
  const [amount, setAmount] = useState("1");
  const [receivingMerchantUid, setReceivingMerchantUid] = useState("");
  const [piPerUsd, setPiPerUsd] = useState<number>(100); // 1 USD ≈ X Pi
  const [usdPerPi, setUsdPerPi] = useState<number | null>(null); // 1 Pi ≈ X USD
  const [loadingRate, setLoadingRate] = useState<boolean>(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimerRef = useRef<number | null>(null);

  const canContinue = receivingMerchantUid.length > 0;

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // 加载实时汇率（带本地缓存与兜底）
  useEffect(() => {
    let cancelled = false;
    const cachedPiPerUsd = localStorage.getItem("pi_usd_rate");
    if (cachedPiPerUsd) {
      const n = parseFloat(cachedPiPerUsd);
      if (Number.isFinite(n) && n > 0) setPiPerUsd(n);
    }
    const cachedUsdPerPi = localStorage.getItem("usd_per_pi");
    if (cachedUsdPerPi) {
      const n = parseFloat(cachedUsdPerPi);
      if (Number.isFinite(n) && n > 0) setUsdPerPi(n);
    }

    const load = async () => {
      setLoadingRate(true);
      setRateError(null);
      try {
        const res = await fetch("/api/v1/rates/pi-usd", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        const ratePiPerUsd = data?.data?.piPerUsd as number | undefined;
        const rateUsdPerPi = data?.data?.usdPerPi as number | undefined;
        if (!cancelled) {
          if (typeof ratePiPerUsd === "number" && ratePiPerUsd > 0) {
            setPiPerUsd(ratePiPerUsd);
            localStorage.setItem("pi_usd_rate", String(ratePiPerUsd));
          }
          if (typeof rateUsdPerPi === "number" && rateUsdPerPi > 0) {
            setUsdPerPi(rateUsdPerPi);
            localStorage.setItem("usd_per_pi", String(rateUsdPerPi));
          }
        }
      } catch {
        if (!cancelled) setRateError("Exchange rate retrieval failed, using local/default rate");
      } finally {
        if (!cancelled) setLoadingRate(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // USD -> Pi 实时换算（优先使用 1 Pi 的 USD 价：Pi = USD / usdPerPi）
  const usdAmount = parseFloat(amount || "0");
  const piAmount = usdPerPi && usdPerPi > 0
    ? usdAmount / usdPerPi
    : usdAmount * (piPerUsd || 100);
  const canPayAmount = Number.isFinite(piAmount) && piAmount > 0;

  // 获取 access token（已由 AuthContext 管理登录）
  function getAccessToken(): string {
    const token = localStorage.getItem("pi_accessToken") || "";
    if (!token) throw new Error("Not authenticated");
    return token;
  }

  async function sendPayment() {
    setMsg("");
    if (!canContinue) { setMsg("请先扫描商家二维码"); return; }
    if (!canPayAmount) { setMsg("Invalid amount"); return; }

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
    if (!w.Pi) { setMsg("Please use this feature in Pi Browser"); return; }

    getAccessToken(); // 验证已登录

    // 计算实际支付金额（扣除 0.01 Pi）
    const actualAmount = Number((piAmount - 0.01).toFixed(6));
    if (actualAmount <= 0) {
      setMsg("Payment amount must be greater than 0.01 Pi");
      return;
    }

    const memo = `Paying to merchant ${actualAmount.toFixed(6)} Pi`;

    setSubmitting(true);
    try {
      await new Promise<void>((resolve, reject) => {
        w.Pi!.createPayment(
          {
            amount: actualAmount,
            memo,
            metadata: {
              flow: "merchant-payment",
              merchantUid: receivingMerchantUid,
              originalAmount: piAmount,
              usdAmount
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
                if (!r.ok) throw new Error("Server approval failed");
              } catch (e) {
                reject(e instanceof Error ? e : new Error("Failed to approve payment"));
              }
            },
            onReadyForServerCompletion: async (paymentId, txid) => {
              try {
                // 调用商家收款完成接口
                const r = await fetch("/api/v1/payments/merchant-payment", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ paymentId, txid, merchantUid: receivingMerchantUid }),
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
      setMsg("Payment completed successfully!");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Payment failed, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  // 扫码：打开/关闭时机
  useEffect(() => {
    if (!scanOpen) return;

    let cancelled = false;
    (async () => {
      try {
        setScanError(null);
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) {
          media.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play().catch(() => { });
        }

        // Prefer BarcodeDetector
        const AnyWin = window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue?: string; rawValueAsString?: string }>> } };
        if (!AnyWin.BarcodeDetector) {
          setScanError("Current browser does not support scanning, please try Pi Browser or update browser");
          return;
        }

        const detector = new AnyWin.BarcodeDetector({ formats: ["qr_code"] as unknown as string[] });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current as unknown as CanvasImageSource);
            const text = results?.[0]?.rawValue || (results?.[0] as unknown as { rawValueAsString?: string })?.rawValueAsString;
            if (text && text.length > 0) {
              await handleQrDetected(text);
              stopScan();
              return;
            }
          } catch { }
          detectTimerRef.current = window.setTimeout(tick, 300);
        };
        tick();
      } catch {
        setScanError("Cannot access camera, please check permission settings");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scanOpen]);

  function stopScan() {
    if (detectTimerRef.current) {
      window.clearTimeout(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanOpen(false);
  }

  async function handleQrDetected(qrData: string) {
    try {
      const res = await fetch("/api/v1/merchant-code/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData }),
      });
      const json = await res.json().catch(() => null) as { data?: { merchantUid?: string; piAddress?: string; version?: number }; error?: string } | null;
      if (!res.ok || !json || json.error) {
        setScanError(json?.error || "QR code parsing failed");
        return;
      }

      // 支持新版本（merchantUid）和旧版本（piAddress）
      const merchantUid = json?.data?.merchantUid;
      const piAddress = json?.data?.piAddress;

      if (merchantUid) {
        setReceivingMerchantUid(merchantUid);
        setMsg(`Scanned merchant: ${merchantUid.slice(0, 8)}...`);
      } else if (piAddress) {
        // 兼容旧版二维码
        setReceivingMerchantUid(piAddress);
        setMsg(`Scanned merchant (old version): ${piAddress.slice(0, 8)}...`);
      } else {
        setScanError("Cannot parse merchant information");
      }
    } catch {
      setScanError("Network error, QR code parsing failed");
    }
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
              <Link
                href="/merchant-code"
                className="text-base font-semibold transition-colors text-white/60 hover:text-white"
              >
                Merchant
              </Link>
              <button className="relative text-base font-bold text-[#a625fc]">
                Payment
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#a625fc] rounded-full" />
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 - 垂直居中 + 收窄 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="mx-auto w-full" style={{ maxWidth: '340px' }}>
            {/* 金额区域 - 优化尺寸 */}
            <div className="mb-5">
              <div className="flex items-center justify-center gap-2.5 mb-4">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  className="bg-transparent text-5xl font-bold text-white outline-none w-auto min-w-[80px] max-w-[180px] text-center"
                  placeholder="1"
                />
                <span className="text-5xl font-bold text-[#a625fc]">|</span>
                <span className="text-5xl font-bold text-[#7d7f88]">USD</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <svg className="w-5 h-5 text-[#a625fc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 10l5 5 5-5" />
                  <path d="M7 14l5-5 5 5" />
                </svg>
                <span className="text-lg font-bold text-[#a625fc]">{piAmount.toFixed(4)} Pi</span>
              </div>
              <div className="text-xs text-center text-white/70 font-bold mb-2">
                {loadingRate
                  ? "(Exchange rate loading...)"
                  : rateError
                    ? `(${rateError})`
                    : `(1 USD ≈ ${(usdPerPi && usdPerPi > 0 ? (1 / usdPerPi) : piPerUsd).toFixed(4)} Pi)`}
              </div>
              <div className="text-xs text-center text-yellow-400 font-semibold">
                Actual payment: {Math.max(0, piAmount - 0.01).toFixed(6)} Pi (0.01 Pi fee)
              </div>
            </div>

            {/* 分割线 */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-5" />

            {/* 商家信息显示区域 - 精致化 */}
            <div className="mb-6">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#a625fc]/5 to-[#f89318]/5 opacity-50 pointer-events-none" />

                <div className="relative flex-1 min-w-0">
                  {receivingMerchantUid ? (
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-white/70 font-bold uppercase tracking-wide">Merchant UID</div>
                      <div className="text-sm font-semibold text-white break-all">
                        {receivingMerchantUid.slice(0, 12)}...{receivingMerchantUid.slice(-8)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-base font-semibold text-white/60">
                      Scan Merchant QR Code
                    </div>
                  )}
                </div>
                <button
                  className="relative w-10 h-10 flex items-center justify-center ml-3 rounded-xl bg-gradient-to-br from-[#a625fc]/20 to-[#f89318]/20 hover:from-[#a625fc]/30 hover:to-[#f89318]/30 transition-all active:scale-95"
                  onClick={() => { setScanError(null); setScanOpen(true); }}
                  aria-label="Scan QR"
                  title="Scan QR"
                >
                  <svg className="w-6 h-6 text-[#a625fc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <rect x="8" y="8" width="8" height="8" rx="1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 按钮区域 - 紧凑化 */}
            <div className="flex flex-col gap-3">
              <button
                disabled={!canContinue || !canPayAmount || submitting || piAmount <= 0.01}
                onClick={sendPayment}
                className="group relative w-full h-12 rounded-xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <div className="absolute inset-0 bg-[#32363e] group-hover:bg-[#3a3f49] transition-colors" />
                <div className="absolute inset-0 border border-[#a625fc]" />
                <span className="relative text-white text-base font-semibold">
                  {submitting ? "Processing..." : "Continue to Payment"}
                </span>
              </button>

              <Link
                href="/merchant-payment-history"
                className="group relative w-full h-12 rounded-xl overflow-hidden transition-all active:scale-[0.98] shadow-lg flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#a625fc] to-[#f89318] opacity-100 group-hover:opacity-90 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative text-white text-base font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Payment History
                </span>
              </Link>
            </div>

            {/* 消息提示 - 精致化 */}
            {msg && (
              <div className="mt-3 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white/90 flex-1 font-medium">{msg}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 扫码弹层 - 精美动画效果 */}
      {scanOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
          style={{
            background: 'radial-gradient(circle at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from {
                opacity: 0;
                transform: scale(0.3);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            @keyframes scanLine {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(100%); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>

          <div
            className="w-full max-w-sm"
            style={{ animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {/* 顶部控制栏 */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#a625fc] animate-pulse"></div>
                <span className="text-sm font-semibold text-white">Scanning QR Code</span>
              </div>
              <button
                className="group relative px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 transition-all active:scale-95"
                onClick={stopScan}
              >
                <span className="text-sm font-semibold text-white">Close</span>
              </button>
            </div>

            {/* 扫描框容器 */}
            <div className="relative">
              {/* 发光边框效果 */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#a625fc] via-[#d66675] to-[#f89318] rounded-3xl blur-lg opacity-60"></div>

              {/* 主扫描框 */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#a625fc]/50 shadow-2xl">
                {/* 视频流 */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="block w-full aspect-[3/4] object-cover bg-black"
                />

                {/* 扫描框叠加层 */}
                <div className="pointer-events-none absolute inset-0">
                  {/* 四角扫描框 */}
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="relative w-full max-w-[240px] aspect-square">
                      {/* 左上角 */}
                      <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-[#a625fc] rounded-tl-xl" style={{ animation: 'pulse 2s ease-in-out infinite' }}></div>
                      {/* 右上角 */}
                      <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-[#f89318] rounded-tr-xl" style={{ animation: 'pulse 2s ease-in-out infinite 0.5s' }}></div>
                      {/* 左下角 */}
                      <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-[#f89318] rounded-bl-xl" style={{ animation: 'pulse 2s ease-in-out infinite 1s' }}></div>
                      {/* 右下角 */}
                      <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-[#a625fc] rounded-br-xl" style={{ animation: 'pulse 2s ease-in-out infinite 1.5s' }}></div>

                      {/* 扫描线 */}
                      <div
                        className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#a625fc] to-transparent opacity-75"
                        style={{ animation: 'scanLine 2s ease-in-out infinite' }}
                      ></div>
                    </div>
                  </div>

                  {/* 中心提示文字 */}
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                    <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                      <p className="text-xs font-semibold text-white">Align QR code within frame</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {scanError && (
              <div className="mt-4 relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl blur opacity-30"></div>
                <div className="relative bg-red-900/30 border border-red-500/30 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-red-300 font-semibold flex-1">{scanError}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
