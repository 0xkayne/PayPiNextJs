"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export default function MerchantCodePage() {
  const [stage, setStage] = useState<"checking" | "init" | "editing" | "generated" | "existing">("checking");
  const [piAddress, setPiAddress] = useState("");
  const [startPi, setStartPi] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [addressEntered, setAddressEntered] = useState(false);
  const [amountEntered, setAmountEntered] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [existingMerchantAddress, setExistingMerchantAddress] = useState("");
  const [dividendPool, setDividendPool] = useState(0);
  const [copySuccess, setCopySuccess] = useState<"address" | "dividend" | null>(null);

  const PI_ADDR_RE = useMemo(() => /^[A-Z0-9]{56}$/, []);
  const canGenerate = useMemo(() => {
    const amt = Number(startPi);
    return PI_ADDR_RE.test(piAddress) && Number.isFinite(amt) && amt >= 0;
  }, [PI_ADDR_RE, piAddress, startPi]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        let sessionToken = localStorage.getItem("sessionToken") || "";
        const piAccessToken = localStorage.getItem("pi_accessToken") || "";
        const piUsername = localStorage.getItem("pi_username") || "";
        const piWallet = localStorage.getItem("pi_walletAddress") || "";

        // 若无 sessionToken 但有 Pi accessToken，则尝试换取 sessionToken
        if (!sessionToken && piAccessToken && piUsername) {
          const res = await fetch("/api/v1/auth/pi-login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ piAccessToken, username: piUsername, walletAddress: piWallet || undefined }),
          });
          const j = await res.json();
          if (!j?.error && j?.data?.sessionToken) {
            sessionToken = j.data.sessionToken;
            localStorage.setItem("sessionToken", sessionToken);
          }
        }

        if (!sessionToken) { setStage("init"); return; }

        const me = await fetch("/api/v1/merchant-code/me", { headers: { Authorization: `Bearer ${sessionToken}` } });
        const mj = await me.json();
        if (mj?.data) {
          setQrUrl(mj.data.qrPngDataUrl);
          const addr = mj.data.payload?.piAddress || "";
          setExistingMerchantAddress(addr);
          // 尝试获取分红池信息（若后端返回）
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


  const handleAddressEnter = () => {
    setError("");
    const trimmed = piAddress.trim();
    if (!PI_ADDR_RE.test(trimmed)) {
      setPiAddress("");
      setAddressEntered(false);
      setShowAddressInput(false);
      setError("Pi 地址格式错误：需为 56 位大写字母或数字");
      return;
    }
    setAddressEntered(true);
    setShowAddressInput(false);
  };

  const handleAmountEnter = () => {
    setError("");
    const amt = Number(startPi.trim());
    if (!Number.isFinite(amt) || amt < 0) {
      setStartPi("");
      setAmountEntered(false);
      setShowAmountInput(false);
      setError("起始金额格式错误：需为非负数");
      return;
    }
    setAmountEntered(true);
    setShowAmountInput(false);
  };

  const copyToClipboard = async (text: string, type: "address" | "dividend") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      setError("复制失败，请手动复制");
    }
  };

  const onGenerate = async () => {
    try {
      setError("");
      setGenerateSuccess(false);
      const sessionToken = localStorage.getItem("sessionToken") || "";
      if (!sessionToken) { setError("未登录或会话失效"); return; }
      const res = await fetch("/api/v1/merchant-code/generate", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ piAddress, startPi: Number(startPi) }),
      });
      const j = await res.json();
      if (j?.error) { setError(j.error); return; }
      setQrUrl(j.data.qrPngDataUrl);
      setExistingMerchantAddress(piAddress);
      setStage("generated");
      setGenerateSuccess(true);
    } catch {
      setError("生成失败，请重试");
    }
  };

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
            <button
              className="text-xl font-medium transition-colors relative text-[#a625fc]"
            >
              Merchant
              <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-[#a625fc]" />
            </button>
            <Link
              href="/scan-pay"
              className="text-xl font-medium transition-colors text-white/60 hover:text-white"
            >
              Payment
            </Link>
          </div>
        </div>

        {/* 二维码区域 */}
        <div className="mb-12 flex justify-center">
          {(stage === "generated" || stage === "existing") && qrUrl ? (
            <div className="w-64 h-64 rounded-lg overflow-hidden border-2 border-white/20 bg-white p-2">
              <Image src={qrUrl} alt="Merchant QR Code" width={256} height={256} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-64 h-64 rounded-lg border-2 border-dashed border-white/20 bg-black/20 flex items-center justify-center">
              <div className="text-center text-sm text-white/50">
                {stage === "checking" ? "加载中..." : "二维码将在生成后显示"}
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="flex flex-col gap-12 mb-12">
          {/* Your Pi Address */}
          <div className="relative bg-[#090b0c] border border-[#35363c] rounded-lg p-5 flex items-center justify-between">
            {stage === "existing" && existingMerchantAddress ? (
              <>
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-[#8d8f99]">Your Pi Address</div>
                  <div className="text-base font-medium text-white">
                    {existingMerchantAddress.slice(0, 7)}...{existingMerchantAddress.slice(-8)}
                  </div>
                </div>
                <button
                  className="h-12 px-6 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-base font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => copyToClipboard(existingMerchantAddress, "address")}
                >
                  {copySuccess === "address" ? "Copied!" : "Copy"}
                </button>
              </>
            ) : showAddressInput ? (
              <>
                <input
                  type="text"
                  value={piAddress}
                  onChange={(e) => setPiAddress(e.target.value.trim())}
                  placeholder="输入 Pi 地址"
                  className="flex-1 bg-transparent text-xl font-medium text-white placeholder:text-[#7d7f88] outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddressEnter();
                    }
                  }}
                  onBlur={() => setShowAddressInput(false)}
                  autoFocus
                />
              </>
            ) : (
              <>
                {addressEntered && piAddress ? (
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-[#8d8f99]">Your Pi Address</div>
                    <div className="text-base font-medium text-white">
                      {piAddress.slice(0, 7)}...{piAddress.slice(-8)}
                    </div>
                  </div>
                ) : (
                  <div className="text-xl font-medium text-white">Your Pi Address</div>
                )}
                <button
                  className={`h-12 px-6 rounded-full text-white text-base font-semibold hover:opacity-90 transition-opacity ${addressEntered ? "bg-[#27ae75]" : "bg-gradient-to-r from-[#a625fc] to-[#f89318]"
                    }`}
                  onClick={() => {
                    setAddressEntered(false);
                    setShowAddressInput(true);
                  }}
                >
                  {addressEntered ? "Entered" : "Enter"}
                </button>
              </>
            )}
          </div>

          {/* Starting Amount / Current Accumulated Dividends */}
          <div className="relative bg-[#090b0c] border border-[#35363c] rounded-lg p-5 flex items-center justify-between">
            {stage === "existing" ? (
              <>
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-[#8d8f99]">Current Accumulated Dividends</div>
                  <div className="text-base font-medium text-white">¥{dividendPool.toFixed(2)}</div>
                </div>
                <button
                  className="h-12 px-6 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-base font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => copyToClipboard(String(dividendPool), "dividend")}
                >
                  {copySuccess === "dividend" ? "Copied!" : "Copy"}
                </button>
              </>
            ) : showAmountInput ? (
              <>
                <input
                  type="text"
                  value={startPi}
                  onChange={(e) => setStartPi(e.target.value)}
                  placeholder="输入起始金额"
                  className="flex-1 bg-transparent text-xl font-medium text-white placeholder:text-[#7d7f88] outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAmountEnter();
                    }
                  }}
                  onBlur={() => setShowAmountInput(false)}
                  autoFocus
                />
              </>
            ) : (
              <>
                {amountEntered && startPi ? (
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-[#8d8f99]">Starting Amount</div>
                    <div className="text-base font-medium text-white">${startPi}</div>
                  </div>
                ) : (
                  <div className="text-xl font-medium text-white">Starting Amount</div>
                )}
                <button
                  className={`h-12 px-6 rounded-full text-white text-base font-semibold hover:opacity-90 transition-opacity ${amountEntered ? "bg-[#27ae75]" : "bg-gradient-to-r from-[#a625fc] to-[#f89318]"
                    }`}
                  onClick={() => {
                    setAmountEntered(false);
                    setShowAmountInput(true);
                  }}
                >
                  {amountEntered ? "Entered" : "Enter"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Generate 按钮 / Distribute Dividends 按钮 */}
        <div className="mb-6">
          {stage === "existing" ? (
            <button
              className="w-full h-16 bg-[#32363e] rounded-full text-white text-xl font-medium hover:bg-[#3a3f49] transition-colors"
              onClick={() => {
                // TODO: 实现分红分配逻辑
                alert("分红分配功能开发中");
              }}
            >
              Distribute Dividends
            </button>
          ) : (
            <button
              disabled={!canGenerate}
              onClick={onGenerate}
              className={`w-full h-16 rounded-full text-white text-xl font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${addressEntered && amountEntered
                ? "bg-gradient-to-r from-[#a625fc] to-[#f89318] hover:opacity-90"
                : "bg-[#32363e] hover:bg-[#3a3f49]"
                }`}
            >
              {generateSuccess ? "Success!" : "Generate"}
            </button>
          )}
        </div>

        {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      </div>
    </div>
  );
}


