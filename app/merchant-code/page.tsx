"use client";
import Link from "next/link";

export default function MerchantCodePage() {
  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">注册商家收款码</h2>
      <div className="border rounded p-4 grid gap-3">
        <div className="text-sm opacity-80">初始状态（仅导航占位，逻辑后续补充）</div>
        <div className="grid gap-2">
          <input className="border p-2 rounded" placeholder="商户名称" readOnly />
          <input className="border p-2 rounded" placeholder="收款地址" readOnly />
          <button className="border rounded p-2" disabled>点击确认生成</button>
        </div>
        <Link className="text-center border rounded p-2" href="/">返回主界面</Link>
      </div>
    </div>
  );
}


