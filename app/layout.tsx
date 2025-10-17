import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import BottomNav from "./components/BottomNav";

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
    <html lang="zh">
      <body className="antialiased">
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
        <div className="pb-20">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
