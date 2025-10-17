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
    <nav className="fixed bottom-0 left-0 right-0 bg-[#090b0c] border-t border-[#35363c] z-50">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-around py-3 px-6">
          {/* 左侧：Scan Pay && Merchant Code*/}
          <Link href="/scan-pay" className="flex flex-col items-center justify-center relative">
            <div className="w-[30px] h-[30px] flex items-center justify-center">
              <Image
                src={(isActive("/scan-pay") || isActive("/merchant-code")) ? "/inFeaturePurple.svg" : "/outFeatureWhite.svg"}
                alt="Scan Pay"
                width={30}
                height={30}
                className="transition-all"
              />
            </div>
            {(isActive("/scan-pay") || isActive("/merchant-code")) && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[#a625fc] rounded-full" />
            )}
          </Link>

          {/* 中间：Home */}
          <Link href="/" className="flex flex-col items-center justify-center relative">
            <div className="w-[38px] h-[38px] flex items-center justify-center -mt-1">
              <Image
                src={isActive("/") ? "/homePurple.svg" : "/homeWhite.svg"}
                alt="Home"
                width={38}
                height={38}
                className="transition-all"
              />
            </div>
            {isActive("/") && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[#a625fc] rounded-full" />
            )}
          </Link>

          {/* 右侧：Me */}
          <Link href="/me" className="flex flex-col items-center justify-center relative">
            <div className="w-[30px] h-[30px] flex items-center justify-center">
              <Image
                src={isActive("/me") ? "/ProfilePurple.svg" : "/ProfileWhite.svg"}
                alt="Profile"
                width={30}
                height={30}
                className="transition-all"
              />
            </div>
            {isActive("/me") && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[#a625fc] rounded-full" />
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}

