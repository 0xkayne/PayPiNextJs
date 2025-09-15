"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function OneToNPage() {
  type Row = { id: string; address: string; amount: string; touchedAddr?: boolean; touchedAmt?: boolean };

  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const [rows, setRows] = useState<Row[]>([{ id: uid(), address: "", amount: "" }]);

  const isAddrValid = (v: string) => v.trim().length > 0;
  const isAmtValid = (v: string) => {
    const t = v.trim();
    if (!t) return false;
    const n = Number(t);
    return Number.isFinite(n);
  };

  const total = useMemo(() => {
    return rows.reduce((sum, r) => {
      return isAmtValid(r.amount) ? sum + Number(r.amount) : sum;
    }, 0);
  }, [rows]);

  const tryAddRow = () => {
    // 若存在地址为空，不允许新增，并将其高亮
    let hasEmpty = false;
    setRows((prev) =>
      prev.map((r) => {
        const valid = isAddrValid(r.address);
        if (!valid) hasEmpty = true;
        return { ...r, touchedAddr: !valid || r.touchedAddr };
      })
    );
    if (hasEmpty) return;
    setRows((prev) => [...prev, { id: uid(), address: "", amount: "" }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const updateAddr = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, address: value, touchedAddr: true } : r))
    );
  };

  const updateAmt = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, amount: value, touchedAmt: true } : r))
    );
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">发起一对多转账</h2>
      <div className="border rounded p-4 grid gap-3">
        <div className="text-sm opacity-80">仅实现输入与导航，业务逻辑后续补充</div>
        <div className="grid gap-3">
          {rows.map((r) => {
            const addrInvalid = r.touchedAddr && !isAddrValid(r.address);
            const amtInvalid = r.touchedAmt && !isAmtValid(r.amount);
            return (
              <div key={r.id} className="grid gap-2 border rounded p-3">
                <input
                  className={`border p-2 rounded ${addrInvalid ? "border-red-500" : ""}`}
                  placeholder="接收地址"
                  value={r.address}
                  onChange={(e) => updateAddr(r.id, e.target.value)}
                />
                <input
                  className={`border p-2 rounded ${amtInvalid ? "border-red-500" : ""}`}
                  placeholder="金额（只能输入数字）"
                  value={r.amount}
                  onChange={(e) => updateAmt(r.id, e.target.value)}
                />
                <button className="border rounded p-2" onClick={() => removeRow(r.id)} disabled={rows.length <= 1}>删除该条</button>
              </div>
            );
          })}

          <button className="border rounded p-2" onClick={tryAddRow}>+ 添加接收地址</button>
          <div className="text-sm">当前总金额：<span className="font-mono">{Number.isFinite(total) ? total : 0}</span></div>
          <button className="border rounded p-2" disabled>确认发送</button>
        </div>
        <Link className="text-center border rounded p-2" href="/history">查看历史转账记录</Link>
        <Link className="text-center border rounded p-2" href="/">返回主界面</Link>
      </div>
    </div>
  );
}


