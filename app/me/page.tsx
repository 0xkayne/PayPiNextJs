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
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-semibold mb-4">My Information</h2>

        {!isAuthenticated && (
          <div className="opacity-75 text-sm mb-3">
            Not logged in, please complete Pi login on the home page.
          </div>
        )}

        {isAuthenticated && user && (
          <div className="space-y-4">
            {/* 基本信息卡片 */}
            <div className="border border-[#35363c] rounded-lg p-5 text-sm grid gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold opacity-80">Basic Information</h3>
                <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded">Logged In</span>
              </div>

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
            </div>

            {/* 钱包信息卡片 */}
            <div className="border border-[#35363c] rounded-lg p-5 text-sm grid gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold opacity-80">Wallet Information</h3>
                {!walletInfo && (
                  <button
                    onClick={handleFetchWalletInfo}
                    disabled={loading}
                    className="text-xs px-3 py-1 bg-[#a625fc] hover:bg-[#a625fc]/80 rounded transition-colors disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Fetch Wallet Info"}
                  </button>
                )}
              </div>

              {error && (
                <div className="text-xs p-2 bg-red-900/20 border border-red-800 rounded text-red-300">
                  {error}
                </div>
              )}

              {!walletInfo && !loading && (
                <div className="text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-700 rounded p-3">
                  <p className="font-semibold mb-1">⚠️ Wallet Info Not Loaded</p>
                  <p className="text-xs opacity-90">
                    Click &ldquo;Fetch Wallet Info&rdquo; button to load your wallet address from Pi Platform.
                  </p>
                </div>
              )}

              {walletInfo && (
                <>
                  {/* Wallet Address */}
                  <div className="flex flex-col gap-1">
                    <span className="opacity-60 text-xs">Wallet Address:</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs break-all">{walletInfo.address}</span>
                      <button
                        className="text-xs border border-[#a625fc] rounded px-2 py-1 hover:bg-[#a625fc]/20 transition-colors shrink-0"
                        onClick={() => copyToClipboard(walletInfo.address, "wallet")}
                      >
                        {copied === "wallet" ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Network */}
                  <div className="flex flex-col gap-1">
                    <span className="opacity-60 text-xs">Network:</span>
                    <span className="text-sm capitalize">{walletInfo.network}</span>
                  </div>

                  {/* Balance Note */}
                  <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-700 rounded">
                    <div className="flex flex-col gap-1">
                      <span className="opacity-60 text-xs">Pi Balance:</span>
                      <span className="text-xs opacity-90">Check in Pi Wallet</span>
                    </div>
                    <button
                      className="text-xs border border-[#a625fc] rounded px-3 py-2 hover:bg-[#a625fc]/20 transition-colors"
                      onClick={checkBalance}
                    >
                      View Balance
                    </button>
                  </div>

                  <div className="text-xs opacity-60 italic">
                    ℹ️ Due to privacy constraints, wallet balance cannot be fetched via API.
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
