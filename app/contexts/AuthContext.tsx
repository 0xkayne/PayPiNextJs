"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

interface User {
  uid: string;           // 应用内用户唯一标识
  username: string;
  walletAddress: string | null;
}

interface AuthContextType {
  // 状态
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;  // 访问令牌
  isPiBrowser: boolean;
  piReady: boolean;
  isLoading: boolean;

  // 方法
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Pi 环境检测
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
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  return Promise.race([probe, timeout]);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [piReady, setPiReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：检测 Pi 环境 + SDK + 恢复登录状态
  useEffect(() => {
    let cancelled = false;
    const w = window as unknown as {
      Pi?: {
        init?: (cfg: { version: string; sandbox?: boolean; appName: string }) => void;
      };
    };

    // 1. 初始化 Pi SDK
    if (w.Pi?.init) {
      try {
        w.Pi.init({
          version: "2.0",
          //sandbox: process.env.NODE_ENV !== "production",
          sandbox: true,
          appName: "PayPi"
        });
      } catch { /* ignore */ }
    }

    (async () => {
      // 2. 检测 Pi 环境
      const ok = await detectPiEnv(2000);
      if (cancelled) return;
      setIsPiBrowser(ok);

      if (ok) {
        // 3. 等待 SDK 就绪
        const checkReady = () => {
          if ((window as unknown as { Pi?: unknown }).Pi) {
            setPiReady(true);
            return true;
          }
          return false;
        };

        if (!checkReady()) {
          const timer = setInterval(() => {
            if (checkReady()) clearInterval(timer);
          }, 200);
          setTimeout(() => clearInterval(timer), 4000);
        }
      }

      // 4. 恢复本地登录状态
      const savedUid = localStorage.getItem("pi_uid");
      const savedUsername = localStorage.getItem("pi_username");
      const savedWallet = localStorage.getItem("pi_walletAddress");
      const savedToken = localStorage.getItem("pi_accessToken");

      if (savedUid && savedUsername && savedToken) {
        setUser({
          uid: savedUid,
          username: savedUsername,
          walletAddress: savedWallet,
        });
        setAccessToken(savedToken);
      }

      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  // 登录方法
  const login = useCallback(async () => {
    if (!isPiBrowser) {
      throw new Error("Please open this app in Pi Browser");
    }

    const w = window as unknown as {
      Pi?: {
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
      };
    };

    if (!w.Pi) {
      throw new Error("Pi SDK not loaded, please refresh the page and try again");
    }

    try {
      const auth = await w.Pi.authenticate(
        ["username", "wallet_address", "payments"],
        () => { } // onIncompletePaymentFound
      );

      console.log("Pi authentication result:", auth); // 调试信息

      // 保存到 localStorage - 正确分别保存 uid 和 wallet_address
      localStorage.setItem("pi_accessToken", auth.accessToken);
      localStorage.setItem("pi_uid", auth.user?.uid || "");
      localStorage.setItem("pi_username", auth.user?.username || "");
      localStorage.setItem("pi_walletAddress", auth.user?.wallet_address || auth.user?.walletAddress || "");
      localStorage.setItem("pi_has_payments", "1");

      // 更新状态
      setUser({
        uid: auth.user?.uid || "",
        username: auth.user?.username || "",
        walletAddress: auth.user?.wallet_address || auth.user?.walletAddress || null,
      });
      setAccessToken(auth.accessToken);
    } catch (error) {
      throw new Error("Login failed, please try again");
    }
  }, [isPiBrowser]);

  // 登出方法
  const logout = useCallback(() => {
    localStorage.removeItem("pi_accessToken");
    localStorage.removeItem("pi_uid");
    localStorage.removeItem("pi_username");
    localStorage.removeItem("pi_walletAddress");
    localStorage.removeItem("pi_has_payments");
    setUser(null);
    setAccessToken(null);
  }, []);

  const value: AuthContextType = {
    isAuthenticated: !!user,
    user,
    accessToken,
    isPiBrowser,
    piReady,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook: 获取认证上下文
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Hook: 要求必须登录，未登录自动触发登录
export function useRequireAuth() {
  const auth = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 等待初始化完成
    if (auth.isLoading) return;

    // 如果未登录且在 Pi Browser 中，自动触发登录
    if (!auth.isAuthenticated && auth.isPiBrowser && auth.piReady) {
      auth.login().catch((error) => {
        console.error("Auto login failed:", error);
        alert(error.message || "Login failed");
      }).finally(() => {
        setChecking(false);
      });
    } else {
      setChecking(false);
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.isPiBrowser, auth.piReady, auth]);

  return {
    ...auth,
    isChecking: checking || auth.isLoading,
  };
}

