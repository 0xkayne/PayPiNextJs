"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

export default function ScanPayPage() {
  const [activeTab, setActiveTab] = useState<"merchant" | "payment">("payment");
  const [amount, setAmount] = useState("1");
  const [yourAddress, setYourAddress] = useState("");
  const [receivingAddress, setReceivingAddress] = useState("");
  const [piPerUsd, setPiPerUsd] = useState<number>(100); // 1 USD ≈ X Pi
  const [usdPerPi, setUsdPerPi] = useState<number | null>(null); // 1 Pi ≈ X USD
  const [loadingRate, setLoadingRate] = useState<boolean>(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimerRef = useRef<number | null>(null);

  // Pi 地址正则（56 位大写字母或数字）
  const PI_ADDR_RE = useMemo(() => /^[A-Z0-9]{56}$/, []);
  const yourValid = PI_ADDR_RE.test(yourAddress.trim());
  const receivingValid = PI_ADDR_RE.test(receivingAddress.trim());
  const canContinue = yourValid && receivingValid;

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
        if (!cancelled) setRateError("汇率获取失败，已使用本地/默认汇率");
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

  // 确保 SDK 初始化（Testnet/Sandbox 优先）
  useEffect(() => {
    const w = window as unknown as { Pi?: { init?: (cfg: { version: string; sandbox?: boolean; appName: string }) => void } };
    try { w.Pi?.init?.({ version: "2.0", sandbox: true, appName: "PayPi" }); } catch { }
  }, []);

  async function ensureAuthenticated(): Promise<string> {
    const w = window as unknown as {
      Pi?: {
        authenticate: (
          scopes: string[],
          onIncompletePaymentFound: (payment: unknown) => void
        ) => Promise<{ accessToken: string; user?: { username?: string } }>;
      };
    };
    if (!w.Pi) throw new Error("请在 Pi Browser 中使用此功能");

    const resolveIncomplete = async (payment: unknown) => {
      const p = payment as { identifier?: string; paymentId?: string; id?: string; transaction?: { txid?: string; id?: string } } | null;
      try {
        const paymentId = p?.identifier || p?.paymentId || p?.id;
        const txid = p?.transaction?.txid || p?.transaction?.id;
        if (paymentId && txid) {
          await fetch("/api/v1/payments/complete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });
        }
      } catch {
        // ignore; 用户稍后可重试
      }
    };

    // 关键修正：每次支付前都显式申请 payments 权限，避免 scope 缺失
    const auth = await (w.Pi as Required<typeof w.Pi>).authenticate(["payments", "username", "wallet_address"], resolveIncomplete);
    const token = auth.accessToken;
    localStorage.setItem("pi_accessToken", token);
    if (auth.user?.username) localStorage.setItem("pi_username", auth.user.username);
    localStorage.setItem("pi_has_payments", "1");
    return token;
  }

  async function sendPayment() {
    setMsg("");
    if (!canContinue) { setMsg("地址不合法"); return; }
    if (!canPayAmount) { setMsg("金额无效"); return; }

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
    if (!w.Pi) { setMsg("请在 Pi Browser 中使用此功能"); return; }

    await ensureAuthenticated();

    const amountPi = Number(piAmount.toFixed(6));
    const memo = `ScanPay to ${receivingAddress}`;

    setSubmitting(true);
    try {
      await new Promise<void>((resolve, reject) => {
        w.Pi!.createPayment(
          {
            amount: amountPi,
            memo,
            metadata: { flow: "scan-pay", receivingAddress: receivingAddress.trim(), yourAddress: yourAddress.trim(), usdAmount },
          },
          {
            onReadyForServerApproval: async (paymentId) => {
              try {
                const r = await fetch("/api/v1/payments/approve", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ paymentId }),
                });
                if (!r.ok) throw new Error("服务器审批失败");
              } catch (e) {
                reject(e instanceof Error ? e : new Error("服务器审批失败"));
              }
            },
            onReadyForServerCompletion: async (paymentId, txid) => {
              try {
                const r = await fetch("/api/v1/payments/complete", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ paymentId, txid }),
                });
                if (!r.ok) throw new Error("服务器完成失败");
                resolve();
              } catch (e) {
                reject(e instanceof Error ? e : new Error("服务器完成失败"));
              }
            },
            onCancel: () => reject(new Error("用户取消支付")),
            onError: (error: Error) => reject(error),
          }
        );
      });
      setMsg("支付已完成");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "支付失败，请重试");
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
          setScanError("当前浏览器不支持扫码，请尝试 Pi Browser 或更新浏览器");
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
        setScanError("无法访问摄像头，请检查权限设置");
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
      const json = await res.json().catch(() => null) as { data?: { piAddress?: string; startPi?: number }; error?: string } | null;
      if (!res.ok || !json || json.error) {
        setScanError(json?.error || "二维码解析失败");
        return;
      }
      const addr = json?.data?.piAddress;
      if (addr) setReceivingAddress(addr);
    } catch {
      setScanError("网络错误，二维码解析失败");
    }
  }

  return (
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="mx-auto max-w-md px-6 py-8">
        {/* 顶部选项卡 */}
        <div className="flex items-center justify-center gap-7 mb-14">
          <button
            onClick={() => setActiveTab("merchant")}
            className={`text-xl font-medium transition-colors ${activeTab === "merchant" ? "text-white" : "text-white/60"
              }`}
          >
            Merchant
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`text-xl font-medium transition-colors relative ${activeTab === "payment" ? "text-[#a625fc]" : "text-white/60"
              }`}
          >
            Payment
            {activeTab === "payment" && (
              <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-[#a625fc]" />
            )}
          </button>
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
                ? "(汇率加载中...)"
                : rateError
                  ? `(${rateError})`
                  : `(1 USD ≈ ${(usdPerPi && usdPerPi > 0 ? (1 / usdPerPi) : piPerUsd).toFixed(4)} Pi)`
            }</span>
          </div>
        </div>

        {/* 分割线 */}
        <div className="w-full h-[1px] bg-[#35363c] mb-8" />

        {/* 地址输入区域 */}
        <div className="flex flex-col gap-2.5 mb-12">
          {/* Your Pi Address */}
          <div className="relative bg-[#090b0c] border-2 border-[#35363c] rounded-lg p-5 flex items-center justify-between">
            <div className="w-12 h-12 flex items-center justify-center">
              <Image src="/Pi symbol.svg" alt="Pi" width={40} height={40} />
            </div>
            <input
              type="text"
              value={yourAddress}
              onChange={(e) => setYourAddress(e.target.value)}
              placeholder="Enter Your Pi Address"
              className="flex-1 bg-transparent text-xl font-medium text-[#7d7f88] placeholder:text-[#7d7f88] outline-none mx-4"
            />

          </div>
          {!yourValid && (
            <div className="mt-1 text-xs text-red-400">请输入合法 Pi 地址（56 位大写字母或数字）。</div>
          )}

          {/* 分隔符 */}
          <div className="w-[1px] h-5 bg-[#35363c] mx-auto" />

          {/* Receiving Address */}
          <div className="relative bg-[#090b0c] border-2 border-[#35363c] rounded-lg p-5 flex items-center justify-between">
            <div className="w-12 h-12 flex items-center justify-center">
              <Image src="/Pi symbol.svg" alt="Pi" width={40} height={40} />
            </div>
            <input
              type="text"
              value={receivingAddress}
              onChange={(e) => setReceivingAddress(e.target.value)}
              placeholder="Enter Receiving Address"
              className="flex-1 bg-transparent text-xl font-medium text-[#7d7f88] placeholder:text-[#7d7f88] outline-none mx-4"
            />
            <button
              className="w-8 h-8 flex items-center justify-center"
              onClick={() => { setScanError(null); setScanOpen(true); }}
              aria-label="Scan QR"
              title="扫描二维码"
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
          {!receivingValid && (
            <div className="mt-1 text-xs text-red-400">请输入合法 Pi 地址（56 位大写字母或数字）。</div>
          )}
        </div>

        {/* 按钮区域 */}
        <div className="flex flex-col gap-5">
          <button
            disabled={!canContinue || !canPayAmount || submitting}
            onClick={sendPayment}
            className="w-full h-16 bg-[#32363e] border border-[#a625fc] rounded-full text-white text-xl font-medium hover:bg-[#3a3f49] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Processing..." : "Continue to Payment"}
          </button>
          <Link
            href="/history"
            className="w-full h-16 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-xl font-medium flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            Payment History
          </Link>
        </div>
        {msg && <div className="mt-2 text-sm opacity-80">{msg}</div>}

        {/* 返回主页链接 */}
        <Link
          href="/"
          className="mt-8 block text-center text-[#7d7f88] hover:text-white transition-colors"
        >
          返回主界面
        </Link>
      </div>
      {/* 扫码弹层 */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white/70">对准二维码扫描</div>
              <button
                className="text-sm px-3 py-1 rounded border border-white/30 text-white/80 hover:bg-white/10"
                onClick={stopScan}
              >关闭</button>
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

