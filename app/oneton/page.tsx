"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function OneToNPage() {
  type Row = { id: string; address: string; amount: string; touchedAddr?: boolean; touchedAmt?: boolean };

  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const [rows, setRows] = useState<Row[]>([{ id: uid(), address: "", amount: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const isAddrNonEmpty = (v: string) => v.trim().length > 0;
  const isAddrFormatValid = (v: string) => /^[A-Z0-9]{56}$/.test(v.trim());
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
        const valid = isAddrNonEmpty(r.address);
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
    // 仅更新值，不在输入过程中标记 touched（失焦时再标记）
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, address: value } : r))
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
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="mx-auto max-w-md p-6 sm:p-8">
        {/* 顶部返回与标题 */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/" className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="text-lg font-semibold">
            <span className="bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">One-to-many Transfer</span>
          </div>
        </div>
        <div className="text-sm opacity-70 mb-3">Send Pi to</div>
        <div className="rounded-2xl bg-[#111317] border border-white/10 p-4 sm:p-5 grid gap-4 overflow-hidden">
          <div className="grid gap-3">
            {rows.map((r) => {
              const addrEmpty = r.touchedAddr && !isAddrNonEmpty(r.address);
              const addrFormatBad = r.touchedAddr && isAddrNonEmpty(r.address) && !isAddrFormatValid(r.address);
              const addrInvalid = addrEmpty || addrFormatBad;
              const amtInvalid = r.touchedAmt && !isAmtValid(r.amount);
              return (
                <div key={r.id} className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                    <span className="hidden sm:inline-flex h-5 w-5 rounded-full bg-white/20 mr-1" />
                    <input
                      className={`flex-1 min-w-0 max-w-full rounded-lg px-3 py-2 bg-white/10 placeholder-white/40 outline-none border ${addrInvalid ? "border-red-500" : "border-white/15"}`}
                      placeholder="接收地址"
                      value={r.address}
                      onChange={(e) => updateAddr(r.id, e.target.value)}
                      onBlur={() => {
                        // 失焦后触发格式校验提示
                        setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, touchedAddr: true } : x));
                      }}
                    />
                    {(addrEmpty || addrFormatBad) && (
                      <div className="sm:hidden text-xs text-red-500 mt-1">{addrEmpty ? "地址不能为空" : "地址格式错误：需为 56 位大写字母或数字"}</div>
                    )}
                    <input
                      className={`rounded-lg w-full sm:w-28 max-w-[8rem] px-3 py-2 bg-white/10 placeholder-white/40 outline-none border text-right ${amtInvalid ? "border-red-500" : "border-white/15"}`}
                      placeholder="金额"
                      value={r.amount}
                      onChange={(e) => updateAmt(r.id, e.target.value)}
                    />
                    <button
                      className="shrink-0 px-2 py-1 text-xs text-white/70 hover:text-white rounded"
                      onClick={() => removeRow(r.id)}
                      disabled={rows.length <= 1}
                    >
                      删除
                    </button>
                  </div>
                  {/* 桌面/大屏在输入行下方提示 */}
                  {(addrEmpty || addrFormatBad) && (
                    <div className="hidden sm:block text-xs text-red-500 mt-1">{addrEmpty ? "地址不能为空" : "地址格式错误：需为 56 位大写字母或数字"}</div>
                  )}
                </div>
              );
            })}

            {/* 添加地址行 */}
            <button className="rounded-xl border border-dashed border-white/25 hover:bg-white/5 px-4 py-3 flex items-center gap-3 overflow-hidden" onClick={tryAddRow}>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">+</span>
              <span>Add Address</span>
            </button>

            <div className="rounded-xl px-4 py-3 overflow-hidden">
              <div className="flex items-center justify-between text-base">
                <span className="bg-gradient-to-l from-[#d66675] to-[#a625fc] bg-clip-text text-transparent font-semibold">TOTAL</span>
                <span className="bg-gradient-to-l from-[#f89318] to-[#da6a6e] bg-clip-text text-transparent font-semibold">${Number.isFinite(total) ? total : 0} Pi</span>
              </div>
              <div className="mt-2 h-px bg-white/10" />
            </div>

            {/* 操作按钮 */}
            <button
              className="rounded-full bg-[#32363e] border border-[#a625fc] px-4 py-3 font-medium hover:bg-[#3a3e46] disabled:opacity-60"
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
              {submitting ? "发送中..." : "Continue to Transfer"}
            </button>
          </div>

          {msg && <div className="text-sm opacity-80">{msg}</div>}
          <Link className="text-center rounded-full bg-gradient-to-r from-[#a625fc] to-[#f89318] p-3 font-medium" href="/history">Transfer History</Link>
          <Link className="text-center rounded-lg border border-white/15 p-2 hover:bg-white/5" href="/">返回主界面</Link>
        </div>
      </div>
    </div>
  );
}


