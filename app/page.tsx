"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [piReady, setPiReady] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const uaPi = /PiBrowser/i.test(navigator.userAgent);
    const w = window as unknown as { Pi?: { init: (cfg: { version: string; appName: string }) => void } };

    let cancelled = false;

    const tryInit = () => {
      if (w.Pi) {
        try { w.Pi.init({ version: "2.0", appName: "PayPi" }); } catch {
          // no-op
        }
        if (!cancelled) setPiReady(true);
        return true;
      }
      return false;
    };

    if (!tryInit() && uaPi) {
      const timer = setInterval(() => {
        if (tryInit()) clearInterval(timer);
      }, 200);
      const killer = setTimeout(() => clearInterval(timer), 4000);

      const saved = localStorage.getItem("pi_username");
      if (saved) setUsername(saved);

      return () => { cancelled = true; clearInterval(timer); clearTimeout(killer); };
    }

    const saved = localStorage.getItem("pi_username");
    if (saved) setUsername(saved);

    return () => { cancelled = true; };
  }, []);

  const loginWithPi = async () => {
    const w = window as unknown as {
      Pi?: {
        init?: (cfg: { version: string; appName: string }) => void;
        authenticate: (
          scopes: string[],
          onIncompletePaymentFound: (payment: unknown) => void
        ) => Promise<{ accessToken: string; user?: { username?: string } }>;
      };
    };
    if (!w.Pi) {
      alert("请在 Pi Browser 中打开本应用");
      return;
    }
    try {
      const auth = await w.Pi.authenticate([
        "username",
        "wallet_address",
        "payments",
      ], () => { });
      localStorage.setItem("pi_accessToken", auth.accessToken);
      localStorage.setItem("pi_username", auth.user?.username || "");
      setUsername(auth.user?.username || "");
    } catch {
      alert("登录失败，请重试");
    }
  };

  const logout = () => {
    localStorage.removeItem("pi_accessToken");
    localStorage.removeItem("pi_username");
    setUsername(null);
  };

  return (
    <div className="min-h-screen p-8 sm:p-16">
      <h1 className="text-3xl font-bold mb-6">PayPi</h1>
      <div className="max-w-md border rounded-2xl p-6 mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm opacity-80">
            {piReady ? (username ? `已登录：${username}` : "未登录") : "非 Pi Browser（无法登录）"}
          </div>
          {username ? (
            <button className="border rounded px-3 py-1 hover:bg-[#f2f2f2]" onClick={logout}>退出</button>
          ) : (
            <button className="border rounded px-3 py-1 hover:bg-[#f2f2f2]" onClick={loginWithPi} disabled={!piReady}>使用 Pi 登录</button>
          )}
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
