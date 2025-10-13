import { json } from "@/lib/http";

type RateResponse = {
  piPerUsd: number; // Pi 数量 / USD（1 美元可兑换多少 Pi）
  usdPerPi: number; // USD / Pi（1 Pi 等于多少美元）
  source: string;
  updatedAt: string; // ISO 时间
};

const DEFAULT_PI_PER_USD = 0.2; // 默认汇率，若未配置环境变量则使用

let cache: { value: RateResponse; expiresAt: number } | null = null;
const TTL_MS = 30 * 1000; // 建议 ≥20-30s 刷新

// 使用 symbols 方式查询（与用户验证的 cURL 一致）
const COINGECKO_SYMBOL = process.env.COINGECKO_SYMBOL || "pi";
const COINGECKO_BASE = process.env.COINGECKO_BASE_URL || "https://api.coingecko.com/api/v3";

async function getRateFromCoinGecko(): Promise<RateResponse | null> {
  try {
    // 参考：GET /simple/price?vs_currencies=usd&symbols=pi，头：x-cg-api-key
    const url = `${COINGECKO_BASE}/simple/price?vs_currencies=usd&symbols=${encodeURIComponent(COINGECKO_SYMBOL)}`;
    const headers: Record<string, string> = {};
    if (process.env.COINGECKO_API_KEY) headers["x-cg-api-key"] = process.env.COINGECKO_API_KEY as string;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const priceData = await res.json().catch(() => null) as Record<string, { usd?: number }> | null;
    const keyUpper = COINGECKO_SYMBOL.toUpperCase();
    const keyLower = COINGECKO_SYMBOL.toLowerCase();
    const usd = priceData?.[keyUpper]?.usd ?? priceData?.[keyLower]?.usd;
    if (typeof usd === "number" && usd > 0) {
      return {
        piPerUsd: 1 / usd,
        usdPerPi: usd,
        source: `coingecko:simple.price:symbols:${COINGECKO_SYMBOL}/usd`,
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function getRate(): Promise<RateResponse> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  // 优先从 CoinGecko 获取
  const fromCG = await getRateFromCoinGecko().catch(() => null);
  if (fromCG) {
    cache = { value: fromCG, expiresAt: now + TTL_MS };
    return fromCG;
  }

  // 回退：使用环境变量或默认值
  const fromEnv = parseFloat(process.env.PI_USD_RATE || "");
  const useEnv = Number.isFinite(fromEnv) && fromEnv > 0;
  const piPerUsd = useEnv ? fromEnv : DEFAULT_PI_PER_USD;
  const source = useEnv ? "env:PI_USD_RATE" : "default:static";

  const value: RateResponse = {
    piPerUsd,
    usdPerPi: 1 / piPerUsd,
    source,
    updatedAt: new Date().toISOString(),
  };

  cache = { value, expiresAt: now + TTL_MS };
  return value;
}

export async function GET() {
  const rate = await getRate();
  return json({ data: rate });
}


