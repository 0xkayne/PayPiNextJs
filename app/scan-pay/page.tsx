"use client";
import Link from "next/link";

export default function ScanPayPage() {
  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">扫码付款</h2>
      <div className="border rounded p-4 grid gap-3">
        <div className="text-sm opacity-80">初始状态（仅导航占位，逻辑后续补充）</div>
        <div className="grid gap-2">
          <button className="border rounded p-2" disabled>扫描商家二维码</button>
          <input className="border p-2 rounded" placeholder="输入商家 PayPi 地址" readOnly />
          <button className="border rounded p-2" disabled>确认支付</button>
        </div>
        <Link className="text-center border rounded p-2" href="/">返回主界面</Link>
      </div>
    </div>
  );
}


