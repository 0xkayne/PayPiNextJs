"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [piReady, setPiReady] = useState(false);
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [username, setUsername] = useState<string | null>(null);


  // 能力检测：优先通过 ReactNativeWebView 特征判定，再回退到 SDK 能力检测
  const detectPiEnv = async (timeoutMs = 2000): Promise<boolean> => {
    const inRNWebView = typeof (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView !== "undefined";
    if (inRNWebView) return true;

    const w = window as unknown as {
      Pi?: {
        nativeFeaturesList?: () => Promise<string[]>;
        init?: (cfg: { version: string; sandbox?: boolean; appName: string }) => void;
      };
    };
    if (!w.Pi || !w.Pi.nativeFeaturesList) return false;

    const probe = w.Pi.nativeFeaturesList().then(() => true).catch(() => false);
    const to = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
    return Promise.race([probe, to]);
  };

  useEffect(() => {
    let cancelled = false;
    const w = window as unknown as {
      Pi?: { init?: (cfg: { version: string; sandbox?: boolean; appName: string }) => void };
    };

    // 始终先尝试初始化（不依赖是否 Pi Browser）
    if (w.Pi?.init) {
      try {
        w.Pi.init({ version: "2.0", sandbox: process.env.NODE_ENV !== "production", appName: "PayPi" });
        //w.Pi.init({ version: "2.0", sandbox: true, appName: "PayPi" });
      } catch { }
    }

    (async () => {
      const ok = await detectPiEnv(2000);
      if (cancelled) return;
      setIsPiBrowser(ok);

      if (!ok) return;

      // Pi 环境下，等待 SDK 就绪
      const tryReady = () => {
        if ((window as unknown as { Pi?: unknown }).Pi) {
          setPiReady(true);
          return true;
        }
        return false;
      };
      if (!tryReady()) {
        const timer = setInterval(() => {
          if (tryReady()) clearInterval(timer);
        }, 200);
        setTimeout(() => clearInterval(timer), 4000);
      }

      // 恢复本地缓存的登录展示信息（仅用户名在首页展示）
      const saved = localStorage.getItem("pi_username");
      if (saved) setUsername(saved);
    })();

    return () => { cancelled = true; };
  }, []);

  const loginWithPi = async () => {
    if (!isPiBrowser) {
      alert("请在 Pi Browser 中打开本应用");
      return;
    }

    const w = window as unknown as {
      Pi?: {
        init?: (cfg: { version: string; appName: string }) => void;
        authenticate: (
          scopes: string[],
          onIncompletePaymentFound: (payment: unknown) => void
        ) => Promise<{
          accessToken: string;
          user?: {
            username?: string;
            uid?: string;
            walletAddress?: string;
            wallet_address?: string;
            [key: string]: unknown;
          }
        }>;
        createPayment: (paymentData: {
          amount: number;
          memo: string;
          metadata?: Record<string, unknown>;
        }, callbacks: {
          onReadyForServerApproval: (paymentId: string) => void;
          onReadyForServerCompletion: (paymentId: string, txid: string) => void;
          onCancel: (paymentId: string) => void;
          onError: (error: Error, payment: unknown) => void;
        }) => unknown;
      };
    };

    if (!w.Pi) {
      alert("Pi SDK 未加载，请刷新页面重试");
      return;
    }
    try {
      const auth = await w.Pi.authenticate([
        "username",
        "wallet_address",
        "payments",
      ], () => { });

      console.log("Pi 认证结果:", auth); // 调试信息

      localStorage.setItem("pi_accessToken", auth.accessToken);
      localStorage.setItem("pi_username", auth.user?.username || "");
      // 记录已授予 payments 权限，避免后续重复权限授权弹窗
      localStorage.setItem("pi_has_payments", "1");
      setUsername(auth.user?.username || "");

      // 尝试获取钱包地址 - 仅保存到本地，不在首页展示
      const possibleWalletAddress = auth.user?.uid || auth.user?.walletAddress || auth.user?.wallet_address;
      if (possibleWalletAddress) {
        localStorage.setItem("pi_walletAddress", possibleWalletAddress);
      }
    } catch {
      alert("登录失败，请重试");
    }
  };

  const logout = () => {
    localStorage.removeItem("pi_accessToken");
    localStorage.removeItem("pi_username");
    localStorage.removeItem("pi_walletAddress");
    localStorage.removeItem("pi_has_payments");
    setUsername(null);
  };

  // 获取环境状态显示文本
  const getEnvironmentStatus = () => {
    if (!isPiBrowser) {
      return "请在 Pi Browser 中打开";
    }
    if (piReady) {
      return username ? `已登录：${username}` : "未登录";
    }
    return "Pi SDK 加载中...";
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="mx-auto max-w-md p-8 sm:p-10">
        {/* 顶部状态与登录区 */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-80">{getEnvironmentStatus()}</div>
            {isPiBrowser && username ? (
              <button className="border border-white/20 rounded px-3 py-1 hover:bg-white/10" onClick={logout}>退出</button>
            ) : (
              <button
                className="border border-white/20 rounded px-3 py-1 hover:bg-white/10 disabled:opacity-50"
                onClick={loginWithPi}
                disabled={!isPiBrowser || !piReady}
              >
                使用 Pi 登录
              </button>
            )}
          </div>

          {/* 非 Pi Browser 环境的提示 */}
          {!isPiBrowser && (
            <div className="text-xs p-2 mt-2 bg-yellow-900/20 border border-yellow-800 rounded">
              <p className="text-yellow-200">⚠️ 检测到您不在 Pi Browser 环境中。请在 Pi Browser 中打开本应用以使用完整功能。</p>
            </div>
          )}

          {isPiBrowser && !piReady && (
            <div className="text-xs p-2 mt-2 bg-blue-900/20 border border-blue-800 rounded">
              <p className="text-blue-200">🔄 Pi SDK 正在加载中，请稍候...</p>
            </div>
          )}
        </div>

        {/* Logo 图片（替换文字） */}
        <div className="mt-6 mb-10 flex items-center justify-center">
          <Image
            src="/PayPi.svg"
            width={264}
            height={110}
            alt="PayPi logo"
            priority
            className="mx-auto select-none"
          />
        </div>

        {/* 主功能卡片（与 Figma 对齐） */}
        <div className="grid gap-5">
          <Link href="/oneton" className="rounded-2xl bg-[#8b22f4] hover:bg-[#a625fc] transition-colors p-5 flex items-center shadow-[0_8px_24px_rgba(166,37,252,0.25)]">
            <span className="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h11" />
                <path d="M10 11h11" />
                <path d="M4 15h11" />
                <path d="M14 5l3 2-3 2" />
                <path d="M18 13l3 2-3 2" />
              </svg>
            </span>
            <span className="font-semibold text-lg">One-to-many Transfer</span>
          </Link>

          <Link href="/red-envelope" className="rounded-2xl bg-[#8b22f4] hover:bg-[#a625fc] transition-colors p-5 flex items-center shadow-[0_8px_24px_rgba(166,37,252,0.25)]">
            <span className="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M4 8h16" />
                <circle cx="12" cy="13" r="2.5" />
              </svg>
            </span>
            <span className="font-semibold text-lg">Password Gifts</span>
          </Link>
        </div>

        {/* 其他功能入口，保持功能不变但样式与主卡片一致 */}
        <div className="mt-8 grid gap-5">
          <Link href="/merchant-code" className="rounded-2xl bg-[#8b22f4] hover:bg-[#a625fc] transition-colors p-5 flex items-center shadow-[0_8px_24px_rgba(166,37,252,0.25)]">
            <span className="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              {/* 店铺/二维码图标 */}
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16" />
                <path d="M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
                <rect x="7" y="10" width="4" height="4" rx="1" />
                <path d="M15 10h2M17 12h-2M15 14h2" />
              </svg>
            </span>
            <span className="font-semibold text-lg">注册商家收款码 / 查看我的收款码</span>
          </Link>

          <Link href="/scan-pay" className="rounded-2xl bg-[#8b22f4] hover:bg-[#a625fc] transition-colors p-5 flex items-center shadow-[0_8px_24px_rgba(166,37,252,0.25)]">
            <span className="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              {/* 扫码图标 */}
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect x="8" y="8" width="8" height="8" rx="1" />
              </svg>
            </span>
            <span className="font-semibold text-lg">扫码付款</span>
          </Link>

          <Link href="/me" className="rounded-2xl bg-[#8b22f4] hover:bg-[#a625fc] transition-colors p-5 flex items-center shadow-[0_8px_24px_rgba(166,37,252,0.25)]">
            <span className="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              {/* 用户头像图标 */}
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7.5" r="3" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
            </span>
            <span className="font-semibold text-lg">查看我的信息</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
