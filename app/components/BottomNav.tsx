"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function BottomNav() {
  const pathname = usePathname();

  // 判断当前路由是否激活
  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    // 对 /me 路径做精确匹配，避免与 /merchant-code 混淆
    if (path === "/me") {
      return pathname === "/me" || pathname.startsWith("/me/");
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* 顶部多层装饰线 */}
      <div className="absolute top-0 left-0 right-0">
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#a625fc] to-transparent"></div>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#f89318]/60 to-transparent mt-[1px]"></div>
      </div>

      {/* 发光装饰层 */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-t from-[#a625fc]/10 via-[#a625fc]/5 to-transparent pointer-events-none blur-xl"></div>

      {/* 主导航栏 - 增强毛玻璃效果 */}
      <div className="relative backdrop-blur-xl bg-gradient-to-b from-[#0d0f11] to-[#090b0c] border-t-2 border-[#a625fc]/20 shadow-[0_-12px_48px_rgba(166,37,252,0.15)]">
        {/* 强化渐变背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#a625fc]/10 via-[#d66675]/5 to-transparent pointer-events-none"></div>

        {/* 内部发光线 */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

        <div className="mx-auto max-w-md">
          <div className="relative flex items-center justify-around py-3 px-6">
            {/* 左侧：Scan Pay && Merchant Code */}
            <Link href="/scan-pay" className="group flex flex-col items-center justify-center relative">
              <div className="w-[30px] h-[30px] flex items-center justify-center transition-transform group-active:scale-90">
                <Image
                  src={(isActive("/scan-pay") || isActive("/merchant-code")) ? "/inFeaturePurple.svg" : "/outFeatureWhite.svg"}
                  alt="Scan Pay"
                  width={30}
                  height={30}
                  className="transition-all"
                />
              </div>
              {(isActive("/scan-pay") || isActive("/merchant-code")) && (
                <>
                  {/* 多层发光效果 */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#a625fc]/40 rounded-full blur-2xl"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#a625fc]/50 rounded-full blur-lg"></div>
                  {/* 底部指示器 - 增强 */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gradient-to-r from-[#a625fc] via-[#d66675] to-[#f89318] rounded-full shadow-[0_0_12px_rgba(166,37,252,0.8)]" />
                </>
              )}
            </Link>

            {/* 中间：Home - 调整对齐 */}
            <Link href="/" className="group flex flex-col items-center justify-center relative">
              <div className="w-[30px] h-[30px] flex items-center justify-center transition-transform group-active:scale-90">
                <Image
                  src={isActive("/") ? "/homePurple.svg" : "/homeWhite.svg"}
                  alt="Home"
                  width={30}
                  height={30}
                  className="transition-all"
                />
              </div>
              {isActive("/") && (
                <>
                  {/* 多层发光效果 */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#a625fc]/40 rounded-full blur-2xl"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#a625fc]/50 rounded-full blur-lg"></div>
                  {/* 底部指示器 - 增强 */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gradient-to-r from-[#a625fc] via-[#d66675] to-[#f89318] rounded-full shadow-[0_0_12px_rgba(166,37,252,0.8)]" />
                </>
              )}
            </Link>

            {/* 右侧：Me */}
            <Link href="/me" className="group flex flex-col items-center justify-center relative">
              <div className="w-[30px] h-[30px] flex items-center justify-center transition-transform group-active:scale-90">
                <Image
                  src={isActive("/me") ? "/ProfilePurple.svg" : "/ProfileWhite.svg"}
                  alt="Profile"
                  width={30}
                  height={30}
                  className="transition-all"
                />
              </div>
              {isActive("/me") && (
                <>
                  {/* 多层发光效果 */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#a625fc]/40 rounded-full blur-2xl"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#a625fc]/50 rounded-full blur-lg"></div>
                  {/* 底部指示器 - 增强 */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gradient-to-r from-[#a625fc] via-[#d66675] to-[#f89318] rounded-full shadow-[0_0_12px_rgba(166,37,252,0.8)]" />
                </>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

