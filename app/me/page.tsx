"use client";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

export default function MePage() {
  const { isAuthenticated, user, walletInfo, fetchWalletInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const checkBalance = () => {
    alert(
      "Due to privacy and security considerations, the Pi SDK does not provide a direct balance query function. Please open your Pi wallet to view your balance:\n\n1. Click the wallet icon at the bottom of Pi Browser\n2. Or visit wallet.pi for detailed information"
    );
  };

  const handleFetchWalletInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchWalletInfo();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch wallet info";
      console.error("Error fetching wallet info:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-white flex flex-col">
      <div className="mx-auto max-w-md w-full px-4 py-5 flex-1 flex flex-col">
        {/* 顶部标题栏 - 精致化 */}
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-5">
          {/* 渐变边框效果 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#a625fc]/20 via-transparent to-[#f89318]/20 opacity-50 pointer-events-none" />

          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#a625fc]/20 to-[#f89318]/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">
              My Information
            </h2>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1">
          {!isAuthenticated && (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative bg-[#131519] rounded-xl p-4 text-center border border-amber-500/30">
                <p className="text-sm font-semibold text-amber-300">
                  Not logged in, please complete Pi login on the home page.
                </p>
              </div>
            </div>
          )}

          {isAuthenticated && user && (
            <div className="mx-auto w-full" style={{ maxWidth: '320px' }}>
              <div className="space-y-4">
                {/* 基本信息卡片 - 精致化 */}
                <div className="relative group">
                  {/* 发光边框 */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#a625fc] via-[#d66675] to-[#f89318] rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-300"></div>

                  <div className="relative bg-gradient-to-br from-[#1a1d24] to-[#131519] rounded-2xl overflow-hidden border border-[#a625fc]/30">
                    {/* 顶部装饰条 */}
                    <div className="h-1 bg-gradient-to-r from-[#a625fc] via-[#d66675] to-[#f89318]"></div>

                    {/* 背景装饰 */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#a625fc]/10 to-transparent rounded-full blur-3xl"></div>

                    <div className="relative p-5 grid gap-4">
                      {/* 标题栏 */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">Basic Information</h3>
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                          Logged In
                        </span>
                      </div>

                      {/* User ID */}
                      <div className="flex flex-col gap-2">
                        <span className="text-white/70 text-xs font-bold uppercase tracking-wide">User ID (UID)</span>
                        <div className="flex items-center justify-between gap-2 p-3 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10">
                          <span className="font-mono text-sm font-semibold break-all text-white">{user.uid}</span>
                          <button
                            className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-lg text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
                            onClick={() => copyToClipboard(user.uid, "uid")}
                          >
                            {copied === "uid" ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* Username */}
                      <div className="flex flex-col gap-2">
                        <span className="text-white/70 text-xs font-bold uppercase tracking-wide">Pi Username</span>
                        <div className="p-3 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10">
                          <span className="text-sm font-semibold text-white">{user.username}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 钱包信息卡片 - 精致化 */}
                <div className="relative group">
                  {/* 发光边框 */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#f89318] via-[#d66675] to-[#a625fc] rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-300"></div>

                  <div className="relative bg-gradient-to-br from-[#1a1d24] to-[#131519] rounded-2xl overflow-hidden border border-[#f89318]/30">
                    {/* 顶部装饰条 */}
                    <div className="h-1 bg-gradient-to-r from-[#f89318] via-[#d66675] to-[#a625fc]"></div>

                    {/* 背景装饰 */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-[#f89318]/10 to-transparent rounded-full blur-3xl"></div>

                    <div className="relative p-5 grid gap-4">
                      {/* 标题栏 */}
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-bold bg-gradient-to-r from-[#f89318] to-[#a625fc] bg-clip-text text-transparent">Wallet Information</h3>
                        {!walletInfo && (
                          <button
                            onClick={handleFetchWalletInfo}
                            disabled={loading}
                            className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-lg text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                          >
                            {loading ? "Loading..." : "Fetch Info"}
                          </button>
                        )}
                      </div>

                      {error && (
                        <div className="relative group/error">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl blur opacity-30"></div>
                          <div className="relative text-xs p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 font-semibold">
                            {error}
                          </div>
                        </div>
                      )}

                      {!walletInfo && !loading && (
                        <div className="relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl blur opacity-20"></div>
                          <div className="relative bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-3.5">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
                                <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-yellow-300 mb-1">Wallet Info Not Loaded</p>
                                <p className="text-xs text-yellow-200/80 font-medium">
                                  Click &ldquo;Fetch Info&rdquo; button to load your wallet address from Pi Platform.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {walletInfo && (
                        <>
                          {/* Wallet Address */}
                          <div className="flex flex-col gap-2">
                            <span className="text-white/70 text-xs font-bold uppercase tracking-wide">Wallet Address</span>
                            <div className="flex items-center justify-between gap-2 p-3 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10">
                              <span className="font-mono text-xs font-semibold break-all text-white">{walletInfo.address}</span>
                              <button
                                className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-lg text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
                                onClick={() => copyToClipboard(walletInfo.address, "wallet")}
                              >
                                {copied === "wallet" ? "✓ Copied" : "Copy"}
                              </button>
                            </div>
                          </div>

                          {/* Network */}
                          <div className="flex flex-col gap-2">
                            <span className="text-white/70 text-xs font-bold uppercase tracking-wide">Network</span>
                            <div className="p-3 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10">
                              <span className="text-sm font-semibold text-white capitalize">{walletInfo.network}</span>
                            </div>
                          </div>

                          {/* Balance Note */}
                          <div className="relative">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-20"></div>
                            <div className="relative flex items-center justify-between p-3.5 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-blue-300">Pi Balance</span>
                                <span className="text-xs text-blue-200/80 font-medium">Check in Pi Wallet</span>
                              </div>
                              <button
                                className="flex-shrink-0 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg text-white text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
                                onClick={checkBalance}
                              >
                                View
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-white/60 font-medium">
                            <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>Due to privacy constraints, wallet balance cannot be fetched via API.</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
