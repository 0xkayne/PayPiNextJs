"use client";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

export default function MePage() {
  const { isAuthenticated, user, accessToken } = useAuth();
  const piBalance = "Please check your Pi wallet";
  const [copied, setCopied] = useState<string | null>(null);

  const checkBalance = () => {
    alert(
      "Due to privacy and security considerations, the Pi SDK does not provide a direct balance query function. Please open your Pi wallet to view your balance:\n\n1. Click the wallet icon at the bottom of Pi Browser\n2. Or visit wallet.pi for detailed information"
    );
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // 脱敏显示 token（显示前8位和后8位）
  const maskToken = (token: string) => {
    if (token.length <= 16) return token;
    return `${token.slice(0, 8)}...${token.slice(-8)}`;
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-semibold mb-4">My Information</h2>
        {!isAuthenticated && (
          <div className="opacity-75 text-sm mb-3">Not logged in, please complete Pi login on the home page.</div>
        )}
        {isAuthenticated && user && (
          <div className="border border-[#35363c] rounded-lg p-5 text-sm grid gap-4">
            {/* User ID */}
            <div className="flex flex-col gap-1">
              <span className="opacity-60 text-xs">User ID (UID):</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm break-all">{user.uid}</span>
                <button
                  className="text-xs border border-[#a625fc] rounded px-2 py-1 hover:bg-[#a625fc]/20 transition-colors shrink-0"
                  onClick={() => copyToClipboard(user.uid, "uid")}
                >
                  {copied === "uid" ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1">
              <span className="opacity-60 text-xs">Pi Username:</span>
              <span className="text-sm">{user.username}</span>
            </div>

            {/* Wallet Address */}
            <div className="flex flex-col gap-1">
              <span className="opacity-60 text-xs">Wallet Address:</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm break-all">
                  {user.walletAddress || "Not obtained"}
                </span>
                {user.walletAddress && (
                  <button
                    className="text-xs border border-[#a625fc] rounded px-2 py-1 hover:bg-[#a625fc]/20 transition-colors shrink-0"
                    onClick={() => copyToClipboard(user.walletAddress!, "wallet")}
                  >
                    {copied === "wallet" ? "✓" : "Copy"}
                  </button>
                )}
              </div>
            </div>

            {/* Access Token */}
            <div className="flex flex-col gap-1">
              <span className="opacity-60 text-xs">Access Token:</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs break-all opacity-80">
                  {accessToken ? maskToken(accessToken) : "Not available"}
                </span>
                {accessToken && (
                  <button
                    className="text-xs border border-[#a625fc] rounded px-2 py-1 hover:bg-[#a625fc]/20 transition-colors shrink-0"
                    onClick={() => copyToClipboard(accessToken, "token")}
                  >
                    {copied === "token" ? "✓" : "Copy"}
                  </button>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#35363c]"></div>

            {/* Balance */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="opacity-60 text-xs">Pi Balance:</span>
                <span className="text-sm">{piBalance}</span>
              </div>
              <button
                className="text-xs border border-[#a625fc] rounded px-3 py-2 hover:bg-[#a625fc]/20 transition-colors"
                onClick={checkBalance}
              >
                View Balance
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


