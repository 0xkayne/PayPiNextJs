"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function OneToNPage() {
  type Row = { id: string; address: string; amount: string; touchedAddr?: boolean; touchedAmt?: boolean };

  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const [rows, setRows] = useState<Row[]>([{ id: uid(), address: "", amount: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string>("");

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

  // 确保 SDK 初始化为 Testnet
  useEffect(() => {
    const w = window as unknown as { Pi?: { init?: (cfg: { version: string; sandbox?: boolean; appName: string }) => void } };
    try { w.Pi?.init?.({ version: "2.0", sandbox: true, appName: "PayPi" }); } catch { }
  }, []);

  async function ensureAuthenticated(): Promise<string> {
    const w = window as unknown as {
      Pi?: {
        authenticate: (
          scopes: string[],
          onIncompletePaymentFound: (payment: unknown) => void
        ) => Promise<{ accessToken: string; user?: { username?: string } }>;
      };
    };
    if (!w.Pi) throw new Error("请在 Pi Browser 中使用此功能");

    const resolveIncomplete = async (payment: unknown) => {
      const p = payment as { identifier?: string; paymentId?: string; id?: string; transaction?: { txid?: string; id?: string } } | null;
      try {
        const paymentId = p?.identifier || p?.paymentId || p?.id;
        const txid = p?.transaction?.txid || p?.transaction?.id;
        if (paymentId && txid) {
          await fetch("/api/v1/payments/complete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });
        }
      } catch {
        // ignore; 用户稍后可重试
      }
    };

    // 若已登录且标记已授权 payments，则复用现有 token；否则请求授权
    const hasPayments = localStorage.getItem("pi_has_payments") === "1";
    let token = localStorage.getItem("pi_accessToken") || "";
    if (!hasPayments || !token) {
      const auth = await w.Pi.authenticate(["username", "wallet_address", "payments"], resolveIncomplete);
      token = auth.accessToken;
      localStorage.setItem("pi_accessToken", token);
      if (auth.user?.username) localStorage.setItem("pi_username", auth.user.username);
      localStorage.setItem("pi_has_payments", "1");
    }
    return token;
  }

  // 改为单笔支付：用户一次签名，支付总金额到应用账户
  async function sendSingle(items: { toAddress: string; amount: number }[]) {
    const w = window as unknown as {
      Pi?: {
        createPayment: (
          data: { amount: number; memo: string; metadata?: Record<string, unknown> },
          cbs: {
            onReadyForServerApproval: (paymentId: string) => void;
            onReadyForServerCompletion: (paymentId: string, txid: string) => void;
            onCancel: (paymentId: string) => void;
            onError: (error: Error) => void;
          }
        ) => void;
      };
    };
    if (!w.Pi) throw new Error("请在 Pi Browser 中使用此功能");

    await ensureAuthenticated();

    const batchId = `batch_${Date.now()}`;
    const totalAmount = items.reduce((s, it) => s + it.amount, 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error("总金额无效");

    await new Promise<void>((resolve, reject) => {
      w.Pi!.createPayment(
        {
          amount: totalAmount,
          memo: `1-to-N total:${totalAmount} batch:${batchId}`,
          metadata: { batchId, totalAmount, recipients: items },
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            try {
              const r = await fetch("/api/v1/payments/approve", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ paymentId }),
              });
              if (!r.ok) throw new Error("服务器审批失败");
            } catch (e) {
              reject(e instanceof Error ? e : new Error("服务器审批失败"));
            }
          },
          onReadyForServerCompletion: async (paymentId, txid) => {
            try {
              const r = await fetch("/api/v1/payments/complete", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ paymentId, txid }),
              });
              if (!r.ok) throw new Error("服务器完成失败");
              resolve();
            } catch (e) {
              reject(e instanceof Error ? e : new Error("服务器完成失败"));
            }
          },
          onCancel: () => reject(new Error("用户取消支付")),
          onError: (error: Error) => reject(error),
        }
      );
    });
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">发起一对多转账</h2>
      <div className="border rounded p-4 grid gap-3">
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
          <button
            className="border rounded p-2 disabled:opacity-50"
            disabled={submitting}
            onClick={async () => {
              setMsg("");
              // 收集并校验表单
              const items = rows
                .map((r) => ({ toAddress: r.address.trim(), amount: Number(r.amount) }))
                .filter((it) => it.toAddress && Number.isFinite(it.amount) && it.amount > 0);
              if (!items.length) {
                setMsg("请填写有效的收款地址与金额");
                return;
              }
              setSubmitting(true);
              try {
                await sendSingle(items);
                setMsg("全部支付流程已完成");
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "支付失败，请重试");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "发送中..." : "确认发送"}
          </button>
        </div>
        {msg && <div className="text-sm opacity-80">{msg}</div>}
        <Link className="text-center border rounded p-2" href="/history">查看历史转账记录</Link>
        <Link className="text-center border rounded p-2" href="/">返回主界面</Link>
      </div>
    </div>
  );
}


