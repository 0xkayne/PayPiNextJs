"use client";
import { useState } from "react";

async function api(path: string, method: string, body?: any, auth?: string) {
  const res = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export default function UsersPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [piAddress, setPiAddress] = useState("");
  const [message, setMessage] = useState<string>("");

  const saveToken = (token: string) => {
    localStorage.setItem("paypi_token", token);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">用户注册/登录</h2>

      <div className="grid gap-6">
        <div className="border rounded p-4">
          <h3 className="font-medium mb-3">注册</h3>
          <div className="grid gap-2">
            <input className="border p-2 rounded" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input className="border p-2 rounded" type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input className="border p-2 rounded" placeholder="Pi 地址" value={piAddress} onChange={(e) => setPiAddress(e.target.value)} />
            <button
              className="border rounded p-2 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
              onClick={async () => {
                const r = await api("/api/v1/users/register", "POST", { username, password, piAddress });
                if (r?.data?.token) {
                  saveToken(r.data.token);
                  setMessage("注册成功");
                } else {
                  setMessage(r?.error || "注册失败");
                }
              }}
            >注册</button>
          </div>
        </div>

        <div className="border rounded p-4">
          <h3 className="font-medium mb-3">登录</h3>
          <div className="grid gap-2">
            <input className="border p-2 rounded" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input className="border p-2 rounded" type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button
              className="border rounded p-2 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
              onClick={async () => {
                const r = await api("/api/v1/users/login", "POST", { username, password });
                if (r?.data?.token) {
                  saveToken(r.data.token);
                  setMessage("登录成功");
                } else {
                  setMessage(r?.error || "登录失败");
                }
              }}
            >登录</button>
          </div>
        </div>

        {message && <div className="text-sm opacity-80">{message}</div>}
      </div>
    </div>
  );
}


