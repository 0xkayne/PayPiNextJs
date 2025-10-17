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

  // 获取环境状态显示文本
  const getEnvironmentStatus = () => {
    if (!isPiBrowser) {
      return "Please open in Pi Browser";
    }
    if (piReady) {
      return isAuthenticated ? `Logged in: ${user?.username}` : "Not logged in";
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
            {isPiBrowser && isAuthenticated ? (
              <button className="border border-white/20 rounded px-3 py-1 hover:bg-white/10" onClick={logout}>Logout</button>
            ) : (
              <button
                className="border border-white/20 rounded px-3 py-1 hover:bg-white/10 disabled:opacity-50"
                onClick={handleLogin}
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
