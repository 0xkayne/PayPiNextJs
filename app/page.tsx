"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./contexts/AuthContext";

export default function Home() {
  const {
    isAuthenticated,
    user,
    isPiBrowser,
    piReady,
    login,
    logout
  } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Login failed");
    }
  };

  // 渲染优雅的状态显示
  const renderStatusDisplay = () => {
    if (!isPiBrowser) {
      return (
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-amber-400/90 truncate">
            Please open in Pi Browser
          </span>
        </div>
      );
    }

    if (!piReady) {
      return (
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-blue-400/90 truncate flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Pi SDK Loading...
          </span>
        </div>
      );
    }

    if (isAuthenticated && user?.username) {
      return (
        <div className="flex flex-col gap-0.5 min-w-0">
          {/* 主状态文本 */}
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[11px] font-medium text-emerald-400/80 tracking-wide uppercase flex-shrink-0">
              Logged in
            </span>
            <span className="text-sm font-bold bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent truncate">
              {user.username}
            </span>
          </div>
          {/* UID 显示 */}
          {user?.uid && (
            <span className="text-[10px] text-white/40 font-mono tracking-wider truncate">
              UID: <span className="text-white/60">{user.uid.slice(0, 12)}...</span>
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-white/60 tracking-wide truncate">
          Not Logged In
        </span>
        <span className="text-[10px] text-white/40 mt-0.5">
          Please login to continue
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-white flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col px-5 sm:px-6 pt-4 pb-6">
        {/* 顶部状态与登录区 - 精致化设计 */}
        <div className="mb-6">
          {/* 主状态卡片 - 毛玻璃效果 */}
          <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            {/* 渐变边框效果 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#a625fc]/20 via-transparent to-[#f89318]/20 opacity-50 pointer-events-none" />

            <div className="relative flex items-center justify-between gap-3">
              {/* 状态显示区 - 带图标 */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {/* 状态指示灯 */}
                <div className="relative flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-400' : 'bg-slate-400'
                    }`} />
                  {isAuthenticated && (
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  )}
                </div>

                {/* 状态文本 - 优雅显示 */}
                {renderStatusDisplay()}
              </div>

              {/* 登录/登出按钮 - 精致化设计 */}
              {isPiBrowser && isAuthenticated ? (
                <button
                  className="group relative px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 transition-all duration-300 active:scale-95 flex items-center gap-2"
                  onClick={logout}
                >
                  <svg className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">Logout</span>
                </button>
              ) : (
                <button
                  className="group relative px-4 py-2 rounded-xl overflow-hidden transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-2 shadow-lg"
                  onClick={handleLogin}
                  disabled={!isPiBrowser || !piReady}
                >
                  {/* 渐变背景 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#a625fc] to-[#f89318] opacity-100 group-hover:opacity-90 transition-opacity" />

                  {/* 悬停光效 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                  {/* 按钮内容 */}
                  <svg className="relative w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                  </svg>
                  <span className="relative text-sm font-semibold text-white">Login with Pi</span>
                </button>
              )}
            </div>
          </div>

          {/* 非 Pi Browser 环境的提示 - 精致化 */}
          {!isPiBrowser && (
            <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 backdrop-blur-sm shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-xs leading-relaxed text-amber-200/90 flex-1">
                  <span className="font-semibold">Not in Pi Browser</span><br />
                  Please open this app in Pi Browser to use full features.
                </p>
              </div>
            </div>
          )}

          {/* Pi SDK 加载提示 - 精致化 */}
          {isPiBrowser && !piReady && (
            <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 backdrop-blur-sm shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-xs leading-relaxed text-blue-200/90 flex-1">
                  <span className="font-semibold">Initializing Pi SDK</span><br />
                  Please wait a moment...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 垂直居中的内容区域 */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Logo 图片（替换文字） */}
          <div className="mb-6 flex items-center justify-center">
            <Image
              src="/PayPi.svg"
              width={264}
              height={110}
              alt="PayPi logo"
              priority
              className="mx-auto select-none"
            />
          </div>

          {/* Features - 紧凑优化 */}
          <div className="flex flex-col items-center gap-3 sm:gap-3.5">
            {/* 1. One-to-many Transfer */}
            <Link href="/oneton" className="w-full rounded-xl bg-[#8b22f4] hover:bg-[#a625fc] active:scale-[0.98] transition-all p-3.5 sm:p-4 flex items-center shadow-[0_6px_20px_rgba(166,37,252,0.25)]" style={{ maxWidth: '300px' }}>
              <span className="mr-3 inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white/15 flex-shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h11" />
                  <path d="M10 11h11" />
                  <path d="M4 15h11" />
                  <path d="M14 5l3 2-3 2" />
                  <path d="M18 13l3 2-3 2" />
                </svg>
              </span>
              <span className="font-semibold text-base sm:text-sm">One-to-many Transfer</span>
            </Link>

            {/* 2. Red Envelope */}
            <Link href="/red-envelope" className="w-full rounded-xl bg-[#8b22f4] hover:bg-[#a625fc] active:scale-[0.98] transition-all p-3.5 sm:p-4 flex items-center shadow-[0_6px_20px_rgba(166,37,252,0.25)]" style={{ maxWidth: '300px' }}>
              <span className="mr-3 inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white/15 flex-shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M4 8h16" />
                  <circle cx="12" cy="13" r="2.5" />
                </svg>
              </span>
              <span className="font-semibold text-base sm:text-sm">Password Red Envelope</span>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
