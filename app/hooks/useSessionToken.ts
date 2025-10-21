import { useState, useEffect } from "react";

/**
 * 获取后端session token的自定义Hook
 * 
 * 工作流程：
 * 1. 每次组件加载时，使用Pi的accessToken调用后端登录接口获取最新的sessionToken
 * 2. 将获取到的sessionToken保存到localStorage和state中
 * 3. 这样可以确保token始终有效，避免使用过期的token
 * 
 * @param isAuthenticated - 用户是否已通过Pi认证
 * @returns sessionToken字符串、加载状态和错误信息
 */
export function useSessionToken(isAuthenticated: boolean) {
  const [sessionToken, setSessionToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSessionToken = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 如果已登录，每次都重新获取sessionToken以确保token有效
        if (isAuthenticated) {
          const piAccessToken = localStorage.getItem("pi_accessToken") || "";
          const piUsername = localStorage.getItem("pi_username") || "";
          const piWallet = localStorage.getItem("pi_walletAddress") || "";
          const piUid = localStorage.getItem("pi_uid") || "";

          if (piAccessToken && piUsername) {
            console.log("📝 Obtaining fresh sessionToken from backend...");

            const res = await fetch("/api/v1/auth/pi-login", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                piAccessToken,
                username: piUsername,
                walletAddress: piWallet || undefined,
                uid: piUid || undefined,
              }),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || `Failed to get session token: ${res.status}`);
            }

            const data = await res.json();

            if (data?.data?.sessionToken) {
              const token = data.data.sessionToken;
              localStorage.setItem("sessionToken", token);
              setSessionToken(token);
              console.log("✅ Fresh sessionToken obtained and saved");
            } else {
              throw new Error("No sessionToken in response");
            }
          } else {
            console.warn("⚠️ Missing Pi authentication data (piAccessToken or username)");
            setError("Missing Pi authentication data");
          }
        } else {
          console.log("⏸️ User not authenticated, skipping token fetch");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to get session token";
        console.error("❌ Error getting sessionToken:", errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    getSessionToken();
  }, [isAuthenticated]);

  return { sessionToken, isLoading, error };
}

