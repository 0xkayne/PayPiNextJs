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
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="mx-auto max-w-md px-6 py-8">
        {/* 顶部选项卡 */}
        <div className="relative flex items-center justify-center mb-14">
          <Link href="/" className="absolute left-0 inline-flex h-8 w-8 items-center justify-center rounded hover:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex items-center gap-7">
            <Link
              href="/merchant-code"
              className="text-xl font-medium transition-colors text-white/60 hover:text-white"
            >
              Merchant
            </Link>
            <button
              className="text-xl font-medium transition-colors relative text-[#a625fc]"
            >
              Payment
              <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-[#a625fc]" />
            </button>
          </div>
        </div>

        {/* 金额区域 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className="bg-transparent text-6xl font-medium text-white outline-none w-auto min-w-[80px] max-w-[200px]"
              placeholder="1"
            />
            <span className="text-6xl font-medium text-[#a625fc]">|</span>
            <span className="text-6xl font-medium text-[#7d7f88]">USD</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#a625fc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 10l5 5 5-5" />
              <path d="M7 14l5-5 5 5" />
            </svg>
            <span className="text-xl font-medium text-[#a625fc]">{piAmount.toFixed(4)} Pi</span>
            <span className="ml-2 text-xs text-[#7d7f88]">{
              loadingRate
                ? "(Exchange rate loading...)"
                : rateError
                  ? `(${rateError})`
                  : `(1 USD ≈ ${(usdPerPi && usdPerPi > 0 ? (1 / usdPerPi) : piPerUsd).toFixed(4)} Pi)`
            }</span>
          </div>
          <div className="mt-2 text-sm text-yellow-400">
            Actual payment: {Math.max(0, piAmount - 0.01).toFixed(6)} Pi (0.01 Pi processing fee deducted)
          </div>
        </div>

        {/* 分割线 */}
        <div className="w-full h-[1px] bg-[#35363c] mb-8" />

        {/* 商家信息显示区域 */}
        <div className="mb-12">
          <div className="relative bg-[#090b0c] border-2 border-[#35363c] rounded-lg p-5 flex items-center justify-between">
            <div className="flex-1">
              {receivingMerchantUid ? (
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-[#8d8f99]">Merchant UID</div>
                  <div className="text-base font-medium text-white break-all">
                    {receivingMerchantUid.slice(0, 12)}...{receivingMerchantUid.slice(-8)}
                  </div>
                </div>
              ) : (
                <div className="text-xl font-medium text-[#7d7f88]">
                  Scan Merchant QR Code
                </div>
              )}
            </div>
            <button
              className="w-12 h-12 flex items-center justify-center ml-4"
              onClick={() => { setScanError(null); setScanOpen(true); }}
              aria-label="Scan QR"
              title="Scan QR"
            >
              <svg className="w-8 h-8 text-[#a625fc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect x="8" y="8" width="8" height="8" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex flex-col gap-5">
          <button
            disabled={!canContinue || !canPayAmount || submitting || piAmount <= 0.01}
            onClick={sendPayment}
            className="w-full h-16 bg-[#32363e] border border-[#a625fc] rounded-full text-white text-xl font-medium hover:bg-[#3a3f49] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Processing..." : "Continue to Payment"}
          </button>
          <Link
            href="/merchant-payment-history"
            className="w-full h-16 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-xl font-medium flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            Payment History
          </Link>
        </div>
        {msg && <div className="mt-2 text-sm opacity-80">{msg}</div>}

      </div>
      {/* 扫码弹层 */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white/70">Align the QR code to scan</div>
              <button
                className="text-sm px-3 py-1 rounded border border-white/30 text-white/80 hover:bg-white/10"
                onClick={stopScan}
              >Close</button>
            </div>
            <div className="relative rounded-lg overflow-hidden border border-white/20">
              <video ref={videoRef} autoPlay playsInline muted className="block w-full aspect-[3/4] object-cover bg-black" />
              <div className="pointer-events-none absolute inset-0 border-2 border-[#a625fc]/70 rounded" />
            </div>
            {scanError && (
              <div className="mt-3 text-xs text-red-300">{scanError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
