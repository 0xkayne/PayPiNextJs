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
  type PayPayload = { type: "paypi"; version: 1; piAddress: string; startPi: number };
  const [payload, setPayload] = useState<PayPayload | null>(null);

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
          setPayload(mj.data.payload);
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

  const onEnter = () => {
    setError("");
    setStage("editing");
  };

  const onGenerate = async () => {
    try {
      setError("");
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
      setPayload(j.data.payload);
      setStage("generated");
    } catch {
      setError("生成失败，请重试");
    }
  };

  return (
    <div className="min-h-screen text-white" style={{
      background: "radial-gradient(1200px 600px at 50% -200px, rgba(78, 82, 255, 0.18), transparent 60%), #0a0c0f"
    }}>
      <div className="max-w-md mx-auto px-6 py-9">
        <div className="mb-6">
          <h1 className="text-[28px] leading-8 font-semibold tracking-tight">商家收款码</h1>
          <p className="text-[13px] opacity-70 mt-1">一键生成并保存与您的 Pi 地址绑定的收款二维码</p>
        </div>

        {/* 步骤指示 */}
        <div className="flex items-center gap-3 mb-6 select-none">
          {(["初始", "输入", "完成"] as const).map((label, i) => {
            const active =
              (stage === "init" && i === 0) ||
              (stage === "editing" && i === 1) ||
              ((stage === "generated" || stage === "existing") && i === 2);
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium ${active ? "bg-white text-black" : "bg-white/10 text-white/70"}`}>{i + 1}</div>
                <span className={`text-[12px] ${active ? "opacity-100" : "opacity-60"}`}>{label}</span>
                {i < 2 && <div className="w-8 h-[1px] bg-white/15 mx-1" />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_10px_40px_rgba(0,0,0,0.4)] grid gap-4 backdrop-blur-[2px]">
          {stage === "checking" && (
            <div className="text-[13px] opacity-80">加载中...</div>
          )}

          {stage === "init" && (
            <div className="grid gap-3">
              <div className="text-sm opacity-80">未检测到已注册的商家收款码。点击下方 Enter 以开始。</div>
              <button
                className="h-11 rounded-xl bg-white text-black font-medium hover:bg-white/90 active:scale-[0.99] transition focus:outline-none focus:ring-2 focus:ring-white/40"
                onClick={onEnter}
              >
                Enter
              </button>
              <div className="text-[11px] opacity-60">提示：请先在首页通过 Pi SDK 登录，系统会自动为您创建会话。</div>
            </div>
          )}

          {stage === "editing" && (
            <div className="grid gap-4">
              <div className="grid gap-1">
                <label className="text-sm opacity-80">Pi Address</label>
                <input
                  className="h-11 rounded-xl bg-white/5 border border-white/12 px-3 outline-none ring-0 focus:border-white/40 placeholder-white/30 tracking-wide"
                  placeholder="请输入 56 位大写字母或数字"
                  value={piAddress}
                  onChange={(e) => setPiAddress(e.target.value.trim())}
                  aria-label="Pi Address"
                />
                <div className="text-[11px] opacity-60">格式：长度 56，字符集 A-Z / 0-9</div>
              </div>

              <div className="grid gap-1">
                <label className="text-sm opacity-80">Start money</label>
                <input
                  className="h-11 rounded-xl bg-white/5 border border-white/12 px-3 outline-none ring-0 focus:border-white/40 placeholder-white/30"
                  placeholder="请输入起始金额，例如 12.34"
                  inputMode="decimal"
                  value={startPi}
                  onChange={(e) => setStartPi(e.target.value)}
                  aria-label="Start money"
                />
                <div className="text-[11px] opacity-60">必须为非负数，最多保留 6 位小数</div>
              </div>

              <button
                className={`h-11 rounded-xl font-medium transition focus:outline-none ${canGenerate ? "bg-white text-black hover:bg-white/90 active:scale-[0.99] focus:ring-2 focus:ring-white/40" : "bg-white/10 text-white/50 cursor-not-allowed"}`}
                onClick={onGenerate}
                disabled={!canGenerate}
              >
                Generate
              </button>

              <div className="text-[11px] opacity-60">生成后系统会将二维码与绑定信息保存到数据库。</div>
            </div>
          )}

          {(stage === "generated" || stage === "existing") && (
            <div className="grid gap-4">
              <div className="text-sm opacity-80">
                {stage === "existing" ? "已为您找到已注册的收款码" : "收款码生成成功"}
              </div>
              <div className="rounded-xl bg-black/40 border border-white/12 p-3 flex items-center justify-center">
                {qrUrl ? (
                  <div className="w-full">
                    <div className="w-full aspect-square overflow-hidden rounded-lg relative">
                      <Image src={qrUrl} alt="merchant paycode" fill sizes="(max-width: 768px) 100vw, 400px" className="object-contain" />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm opacity-80">二维码加载中...</div>
                )}
              </div>
              {payload && (
                <div className="grid gap-1 text-sm">
                  <div className="opacity-70">绑定信息</div>
                  <div className="rounded-xl bg-white/5 border border-white/12 p-3 text-[11px] leading-[1.2] break-all">
                    {JSON.stringify(payload)}
                  </div>
                </div>
              )}
              <div className="text-[11px] opacity-60">请妥善保存二维码，用户扫码即可向该地址发起支付。</div>
            </div>
          )}

          {error && <div className="text-red-400 text-[13px]">{error}</div>}

          <Link className="text-center h-10 rounded-xl bg-white/6 border border-white/12 hover:bg-white/10 transition flex items-center justify-center" href="/">返回主界面</Link>
        </div>

        {/* 版权/提示 */}
        <div className="mt-5 text-center text-[11px] opacity-50">
          设计参考：未注册态、输入态、生成态与已注册态（详见 Figma）
        </div>
      </div>
    </div>
  );
}


