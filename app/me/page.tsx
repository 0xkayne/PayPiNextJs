"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function MePage() {
  const [piUsername, setPiUsername] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const piBalance = "请在Pi钱包中查看";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => {
      setPiUsername(localStorage.getItem("pi_username"));
      setWalletAddress(localStorage.getItem("pi_walletAddress"));
    };
    load();
    // 监听跨标签页变更
    const onStorage = (e: StorageEvent) => {
      if (e.key === "pi_username" || e.key === "pi_walletAddress") load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const checkBalance = () => {
    alert(
      "由于隐私和安全考虑，Pi SDK 不提供直接查询余额的功能。请打开 Pi 钱包查看您的余额：\n\n1. 在 Pi Browser 中点击底部的钱包图标\n2. 或者访问 wallet.pi 查看详细信息"
    );
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">我的信息</h2>
      {!piUsername && (
        <div className="opacity-75 text-sm mb-3">未登录，请在主页完成 Pi 登录，或在“用户注册/登录”页完成账号登录。</div>
      )}
      {piUsername && (
        <div className="border rounded p-4 text-sm grid gap-2">
          <div><span className="opacity-60">Pi 用户名：</span>{piUsername}</div>
          <div><span className="opacity-60">钱包地址：</span><span className="font-mono">{walletAddress || "未获取（请在主页完成 Pi 登录）"}</span></div>
          <div className="flex items-center justify-between">
            <span>
              <span className="opacity-60">Pi 余额：</span>
              <span>{piBalance}</span>
            </span>
            <button
              className="text-xs border rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={checkBalance}
            >
              查看余额
            </button>
          </div>

        </div>
      )}
      <div className="mt-4">
        <Link className="text-center border rounded p-2 inline-block" href="/">返回主界面</Link>
      </div>
    </div>
  );
}


