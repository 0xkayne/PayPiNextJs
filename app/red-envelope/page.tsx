"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

async function api(path: string, method: string, body?: unknown, auth?: string) {
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

export default function RedEnvelopePage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("paypi_token") || "" : "";
  const [amountPi, setAmountPi] = useState<string>("");
  const [durationHours, setDurationHours] = useState<string>("24");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"menu" | "create-form" | "claim">("menu");
  const [balance] = useState<number>(523.45);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDurationDropdown(false);
      }
    }

    if (showDurationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showDurationDropdown]);

  return (
    <div className="min-h-screen bg-[#090b0c] text-white">
      <div className="mx-auto max-w-md p-6">
        {/* 顶部标题栏 */}
        <div className="flex items-center gap-4 mb-12 mt-4">
          <button
            onClick={() => {
              if (mode === "menu") {
                router.push("/");
              } else {
                setMode("menu");
                setMsg("");
                setCode("");
                setShowDurationDropdown(false);
              }
            }}
            className="flex items-center justify-center w-5 h-5"
          >
            <svg
              width="20"
              height="15"
              viewBox="0 0 20 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <path
                d="M8 1L2 7.5L8 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 7.5H18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-[#a625fc] to-[#f89318] bg-clip-text text-transparent">
            Password Gifts
          </h1>
        </div>

        {mode === "menu" && (
          <div className="flex flex-col gap-12">
            {/* 主卡片区域 */}
            <div className="bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-[10px] p-[1px]">
              <div className="bg-[#131519] rounded-[10px] p-8">
                <div className="flex flex-col gap-6">
                  {/* Enter the Password 选项 */}
                  <div className="flex items-center gap-7">
                    <div className="w-5 h-5 flex-shrink-0">
                      <Image src="/red-envelope.svg" width={21} height={20} alt="Red envelope" />
                    </div>
                    <p className="text-white text-xl font-normal">Enter the Password</p>
                  </div>

                  {/* Receive Address 选项 */}
                  <div className="flex items-center gap-7">
                    <div className="w-5 h-5 flex-shrink-0">
                      <Image src="/wallet.svg" width={20} height={20} alt="Wallet" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-white text-xl font-normal">Receive Address</p>
                      <p className="text-[#8d8f99] text-base">bc1ql4...h4wz</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex flex-col gap-5">
              <button
                onClick={() => setMode("claim")}
                className="w-full h-16 bg-[#32363e] border border-[#a625fc] rounded-full text-white text-xl font-medium hover:bg-[#3a3e48] transition-colors"
              >
                Receive Password Gifts
              </button>
              <button
                onClick={() => setMode("create-form")}
                className="w-full h-16 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-xl font-medium hover:opacity-90 transition-opacity"
              >
                Send Password Gifts
              </button>
            </div>
          </div>
        )}

        {mode === "create-form" && (
          <div className="flex flex-col gap-[60px] mt-8">
            {/* 表单区域 */}
            <div className="flex flex-col gap-[15px]">
              {/* Total Amount */}
              <div className="flex flex-col gap-3">
                <label className="text-white text-xl font-normal">Total Amount</label>
                <div className="bg-[#090b0c] border border-[#35363c] rounded-[9px] h-[60px] px-5 flex items-center justify-between">
                  <input
                    className="bg-transparent text-white text-2xl font-medium outline-none flex-1"
                    type="number"
                    placeholder="1000"
                    value={amountPi}
                    onChange={(e) => setAmountPi(e.target.value)}
                  />
                  <span className="text-white text-2xl font-medium">Pi</span>
                </div>
              </div>

              {/* Duration */}
              <div className="flex flex-col gap-3">
                <label className="text-white text-xl font-normal">Duration</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                    className="w-full bg-[#090b0c] border border-[#35363c] rounded-[9px] h-[60px] px-5 flex items-center justify-between hover:border-[#a625fc] transition-colors"
                  >
                    <span className="text-white text-2xl font-medium">{durationHours} Hours</span>
                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 10L13 16L19 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {showDurationDropdown && (
                    <div className="absolute top-full mt-2 w-full bg-[#131519] border border-[#35363c] rounded-[9px] overflow-hidden z-10">
                      {[1, 2, 3, 6, 12, 24].map((hours) => (
                        <button
                          key={hours}
                          onClick={() => {
                            setDurationHours(hours.toString());
                            setShowDurationDropdown(false);
                          }}
                          className="w-full px-5 py-3 text-white text-xl hover:bg-[#a625fc]/20 transition-colors text-left"
                        >
                          {hours} Hours
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Current Balance */}
              <p className="text-[#8d8f99] text-xl font-medium">
                Current Balance: {balance}Pi
              </p>
            </div>

            {/* Generate Button */}
            <button
              className="w-full h-[63px] bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-xl font-medium hover:opacity-90 transition-opacity"
              onClick={async () => {
                setMsg("");
                setCode("");
                const parsedAmount = Number(amountPi);
                const parsedHours = Number(durationHours);
                if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                  setMsg("Please enter a valid amount");
                  return;
                }
                if (parsedAmount > balance) {
                  setMsg("Amount cannot exceed current balance");
                  return;
                }
                if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
                  setMsg("Please enter a valid duration");
                  return;
                }
                if (parsedHours > 24) {
                  setMsg("Duration cannot exceed 24 hours");
                  return;
                }
                const expiresAt = new Date(Date.now() + parsedHours * 60 * 60 * 1000).toISOString();
                const r = await api("/api/v1/red-envelopes/create", "POST", { amountPi: parsedAmount, expiresAt }, token);
                if (r?.data?.code) {
                  setCode(r.data.code);
                  setMsg("Password gift created successfully!");
                } else {
                  setMsg(r?.error || "Failed to create");
                }
              }}
            >
              Generate Password Gift
            </button>

            {/* Success/Error Messages */}
            {code && (
              <div className="bg-[#131519] border border-[#a625fc] p-6 rounded-[10px] text-center">
                <p className="text-[#8d8f99] text-lg mb-3">Password Code:</p>
                <p className="text-white font-mono text-xl break-all">{code}</p>
              </div>
            )}
            {msg && !code && (
              <div className="bg-[#131519] border border-[#35363c] p-4 rounded-[10px] text-center text-[#8d8f99]">
                {msg}
              </div>
            )}
          </div>
        )}

        {mode === "claim" && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#131519] border border-[#a625fc] rounded-[10px] p-6">
              <h3 className="text-xl font-medium mb-4 text-white">Claim Password Gift</h3>
              <div className="flex flex-col gap-4">
                <input
                  className="bg-[#1e2126] border border-[#32363e] text-white p-3 rounded-lg placeholder:text-[#8d8f99] focus:outline-none focus:border-[#a625fc]"
                  placeholder="Enter password code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <button
                  className="w-full h-12 bg-gradient-to-r from-[#a625fc] to-[#f89318] rounded-full text-white text-lg font-medium hover:opacity-90 transition-opacity"
                  onClick={async () => {
                    setMsg("");
                    if (!code.trim()) {
                      setMsg("Please enter a password code");
                      return;
                    }
                    const r = await api("/api/v1/red-envelopes/claim", "POST", { code }, token);
                    if (r?.error) {
                      setMsg(r.error);
                    } else {
                      setMsg(`Claimed successfully: ${r?.data?.tx?.txHash || r?.data?.tx?.id}`);
                      setCode("");
                    }
                  }}
                >
                  Claim Gift
                </button>
              </div>
            </div>
            {msg && (
              <div className="bg-[#1e2126] border border-[#32363e] p-4 rounded-lg text-sm text-[#8d8f99]">
                {msg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


