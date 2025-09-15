"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function MePage() {
  const [me, setMe] = useState<any>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("paypi_token") || "" : "";

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/v1/users/me", {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });
      const r = await res.json();
      setMe(r?.data || null);
    })();
  }, [token]);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">我的信息</h2>
      {!me && <div className="opacity-75 text-sm mb-3">未登录，请在“用户注册/登录”页完成登录。</div>}
      {me && (
        <div className="border rounded p-4 text-sm grid gap-2">
          <div><span className="opacity-60">用户名：</span>{me.username}</div>
          <div><span className="opacity-60">用户ID：</span><span className="font-mono">{me.id}</span></div>
          <div><span className="opacity-60">Pi 地址：</span><span className="font-mono">{me.piAddress}</span></div>
          <div><span className="opacity-60">注册时间：</span>{me.createdAt}</div>
        </div>
      )}
      <div className="mt-4">
        <Link className="text-center border rounded p-2 inline-block" href="/">返回主界面</Link>
      </div>
    </div>
  );
}


