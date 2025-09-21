"use client";
import Link from "next/link";
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
        //w.Pi.init({ version: "2.0", sandbox: process.env.NODE_ENV !== "production", appName: "PayPi" });
        w.Pi.init({ version: "2.0", sandbox: true, appName: "PayPi" });
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
    <div className="min-h-screen p-8 sm:p-16">
      <h1 className="text-3xl font-bold mb-6">PayPi</h1>
      <div className="max-w-md border rounded-2xl p-6 mx-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm opacity-80">
              {getEnvironmentStatus()}
            </div>
            {isPiBrowser && username ? (
              <button className="border rounded px-3 py-1 hover:bg-[#f2f2f2]" onClick={logout}>退出</button>
            ) : (
              <button
                className="border rounded px-3 py-1 hover:bg-[#f2f2f2] disabled:opacity-50"
                onClick={loginWithPi}
                disabled={!isPiBrowser || !piReady}
              >
                使用 Pi 登录
              </button>
            )}
          </div>

          {/* 非 Pi Browser 环境的提示 */}
          {!isPiBrowser && (
            <div className="text-xs p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded mb-2">
              <p className="text-yellow-800 dark:text-yellow-200">
                ⚠️ 检测到您不在 Pi Browser 环境中。请在 Pi Browser 中打开本应用以使用完整功能。
              </p>
            </div>
          )}

          {isPiBrowser && !piReady && (
            <div className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded mb-2">
              <p className="text-blue-800 dark:text-blue-200">
                🔄 Pi SDK 正在加载中，请稍候...
              </p>
            </div>
          )}

          {/* 首页仅展示用户名；钱包地址与余额请移步“我的信息”页 */}
        </div>
        <div className="text-center text-xl font-semibold mb-6">PayPi</div>
        <nav className="grid gap-4">
          <Link className="border rounded-lg p-4 text-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]" href="/oneton">发起一对多转账</Link>
          <Link className="border rounded-lg p-4 text-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]" href="/red-envelope">口令红包</Link>
          <Link className="border rounded-lg p-4 text-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]" href="/merchant-code">注册商家收款码 / 查看我的收款码</Link>
          <Link className="border rounded-lg p-4 text-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]" href="/scan-pay">扫码付款</Link>
          <Link className="border rounded-lg p-4 text-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]" href="/me">查看我的信息</Link>
        </nav>
      </div>
    </div>
  );
}
