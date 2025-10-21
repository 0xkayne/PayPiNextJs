import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import BottomNav from "./components/BottomNav";
import { AuthProvider } from "./contexts/AuthContext";

export const metadata: Metadata = {
  title: "PayPi",
  description: "基于 Pi Network 的支付与分红演示应用",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="h-full">
      <body className="antialiased h-full">
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
        <AuthProvider>
          <div className="pb-20 min-h-full">
            {children}
          </div>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
