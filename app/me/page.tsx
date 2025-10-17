"use client";
import { useAuth } from "../contexts/AuthContext";

export default function MePage() {
  const { isAuthenticated, user } = useAuth();
  const piBalance = "Please check your Pi wallet";

  const checkBalance = () => {
    alert(
      "Due to privacy and security considerations, the Pi SDK does not provide a direct balance query function. Please open your Pi wallet to view your balance:\n\n1. Click the wallet icon at the bottom of Pi Browser\n2. Or visit wallet.pi for detailed information"
    );
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-semibold mb-4">My Information</h2>
        {!isAuthenticated && (
          <div className="opacity-75 text-sm mb-3">Not logged in, please complete Pi login on the home page.</div>
        )}
        {isAuthenticated && user && (
          <div className="border rounded p-4 text-sm grid gap-2">
            <div><span className="opacity-60">Pi Username：</span>{user.username}</div>
            <div><span className="opacity-60">Wallet Address：</span><span className="font-mono">{user.walletAddress || "Not obtained (please complete Pi login on the home page)"}</span></div>
            <div className="flex items-center justify-between">
              <span>
                <span className="opacity-60">Pi Balance：</span>
                <span>{piBalance}</span>
              </span>
              <button
                className="text-xs border rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
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


