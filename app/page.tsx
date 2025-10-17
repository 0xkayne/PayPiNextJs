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
      alert("Please open this app in Pi Browser");
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
      alert("Pi SDK not loaded, please refresh the page and try again");
      return;
    }
    try {
      const auth = await w.Pi.authenticate([
        "username",
        "wallet_address",
        "payments",
      ], () => { });

      console.log("Pi authentication result:", auth); // 调试信息

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
      alert("Login failed, please try again");
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
      return "Please open in Pi Browser";
    }
    if (piReady) {
      return username ? `Logged in: ${username}` : "Not logged in";
    }
    return "Pi SDK loading...";
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-white flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col px-5 sm:px-6 pt-4 pb-6">
        {/* 顶部状态与登录区 */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-80">{getEnvironmentStatus()}</div>
            {isPiBrowser && username ? (
              <button className="border border-white/20 rounded px-3 py-1 hover:bg-white/10" onClick={logout}>Logout</button>
            ) : (
              <button
                className="border border-white/20 rounded px-3 py-1 hover:bg-white/10 disabled:opacity-50"
                onClick={loginWithPi}
                disabled={!isPiBrowser || !piReady}
              >
                Login with Pi
              </button>
            )}
          </div>

          {/* 非 Pi Browser 环境的提示 */}
          {!isPiBrowser && (
            <div className="text-xs p-2 mt-2 bg-yellow-900/20 border border-yellow-800 rounded">
              <p className="text-yellow-200">⚠️ Detected you are not in Pi Browser environment. Please open this app in Pi Browser to use full features.</p>
            </div>
          )}

          {isPiBrowser && !piReady && (
            <div className="text-xs p-2 mt-2 bg-blue-900/20 border border-blue-800 rounded">
              <p className="text-blue-200">🔄 Pi SDK is loading, please wait...</p>
            </div>
          )}
        </div>

        {/* 垂直居中的内容区域 */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Logo 图片（替换文字） */}
          <div className="mb-8 flex items-center justify-center">
            <Image
              src="/PayPi.svg"
              width={264}
              height={110}
              alt="PayPi logo"
              priority
              className="mx-auto select-none"
            />
          </div>

          {/* Features */}
          <div className="grid gap-4 sm:gap-5">
            {/* 1. One-to-many Transfer */}
            <Link href="/oneton" className="rounded-2xl bg-[#8b22f4] hover:bg-[#a625fc] active:scale-[0.98] transition-all p-5 sm:p-6 flex items-center shadow-[0_8px_24px_rgba(166,37,252,0.25)]">
              <span className="mr-4 inline-flex h-12 w-12 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-white/15 flex-shrink-0">
                <svg viewBox="0 0 24 24" className="h-7 w-7 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h11" />
                  <path d="M10 11h11" />
                  <path d="M4 15h11" />
                  <path d="M14 5l3 2-3 2" />
                  <path d="M18 13l3 2-3 2" />
                </svg>
              </span>
              <span className="font-semibold text-lg sm:text-base">One-to-many Transfer</span>
            </Link>

            {/* 2. Red Envelope */}
            <Link href="/red-envelope" className="rounded-2xl bg-[#8b22f4] hover:bg-[#a625fc] active:scale-[0.98] transition-all p-5 sm:p-6 flex items-center shadow-[0_8px_24px_rgba(166,37,252,0.25)]">
              <span className="mr-4 inline-flex h-12 w-12 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-white/15 flex-shrink-0">
                <svg viewBox="0 0 24 24" className="h-7 w-7 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M4 8h16" />
                  <circle cx="12" cy="13" r="2.5" />
                </svg>
              </span>
              <span className="font-semibold text-lg sm:text-base">Password Red Envelope</span>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
