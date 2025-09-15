import { createHash, randomBytes, randomUUID } from "crypto";
import {
  ApiResult,
  AuthToken,
  BatchTransferItem,
  Merchant,
  MerchantId,
  RedEnvelope,
  RedEnvelopeId,
  Transaction,
  TransactionId,
  User,
  UserId,
} from "./types";

// In-memory stores (replace with Postgres/Redis later)
const users: User[] = [];
const authTokens: AuthToken[] = [];
const transactions: Transaction[] = [];
const merchants: Merchant[] = [];
const redEnvelopes: RedEnvelope[] = [];

function nowIso(): string {
  return new Date().toISOString();
}

function hashPassword(password: string): string {
  // Simple hash for demo; replace with bcrypt/scrypt in production
  return createHash("sha256").update(password).digest("hex");
}

export function generateToken(userId: UserId): AuthToken {
  const token = randomBytes(24).toString("hex");
  const authToken: AuthToken = { token, userId, issuedAt: nowIso() };
  authTokens.push(authToken);
  return authToken;
}

export function findUserByToken(bearer: string | null): User | null {
  if (!bearer) return null;
  const token = bearer.replace(/^Bearer\s+/i, "").trim();
  const found = authTokens.find((t) => t.token === token);
  if (!found) return null;
  return users.find((u) => u.id === found.userId) ?? null;
}

export function createUser(params: {
  username: string;
  password: string;
  piAddress: string;
}): ApiResult<{ user: Omit<User, "passwordHash">; token: string }> {
  const { username, password, piAddress } = params;
  if (!username || !password || !piAddress) {
    return { error: "缺少必要字段" };
  }
  if (users.some((u) => u.username === username)) {
    return { error: "用户名已存在" };
  }
  const user: User = {
    id: randomUUID(),
    username,
    passwordHash: hashPassword(password),
    piAddress,
    createdAt: nowIso(),
  };
  users.push(user);
  const token = generateToken(user.id).token;
  const { passwordHash, ...safe } = user;
  return { data: { user: safe, token } };
}

export function loginUser(params: {
  username: string;
  password: string;
}): ApiResult<{ user: Omit<User, "passwordHash">; token: string }> {
  const { username, password } = params;
  const user = users.find((u) => u.username === username);
  if (!user) return { error: "用户不存在" };
  if (user.passwordHash !== hashPassword(password)) {
    return { error: "密码错误" };
  }
  const token = generateToken(user.id).token;
  const { passwordHash, ...safe } = user;
  return { data: { user: safe, token } };
}

export function getUserById(id: UserId): ApiResult<Omit<User, "passwordHash">> {
  const user = users.find((u) => u.id === id);
  if (!user) return { error: "未找到用户" };
  const { passwordHash, ...safe } = user;
  return { data: safe };
}

export function createTransaction(params: {
  fromUserId: UserId;
  toAddress: string;
  amountPi: number;
  merchantId?: MerchantId;
}): ApiResult<Transaction> {
  const { fromUserId, toAddress, amountPi, merchantId } = params;
  if (amountPi <= 0) return { error: "金额需大于0" };
  const tx: Transaction = {
    id: randomUUID() as TransactionId,
    fromUserId,
    toAddress,
    amountPi,
    createdAt: nowIso(),
    txHash: `mock-${Math.random().toString(36).slice(2, 10)}`,
    meta: merchantId ? { merchantId } : undefined,
  };
  transactions.push(tx);
  if (merchantId) {
    const m = merchants.find((mm) => mm.id === merchantId);
    if (m) {
      const fee = (m.feePercent / 100) * amountPi;
      const div = (m.dividendPercent / 100) * amountPi;
      m.dividendPool += div;
      // fee can be considered burned or platform revenue; no-op here
    }
  }
  return { data: tx };
}

export function createBatchTransactions(params: {
  fromUserId: UserId;
  items: BatchTransferItem[];
  merchantId?: MerchantId;
}): ApiResult<{ transactions: Transaction[]; totalAmount: number }> {
  const { fromUserId, items, merchantId } = params;
  if (!items?.length) return { error: "批量明细不能为空" };
  const result: Transaction[] = [];
  let total = 0;
  for (const item of items) {
    const r = createTransaction({
      fromUserId,
      toAddress: item.toAddress,
      amountPi: item.amountPi,
      merchantId,
    });
    if ("error" in r) return r;
    result.push(r.data);
    total += item.amountPi;
  }
  return { data: { transactions: result, totalAmount: total } };
}

export function getTransactionsByUser(userId: UserId): ApiResult<Transaction[]> {
  const list = transactions.filter((t) => t.fromUserId === userId);
  return { data: list };
}

export function registerMerchant(params: {
  name: string;
  ownerUserId: UserId;
  receiveAddress: string;
  feePercent: number;
  dividendPercent: number;
}): ApiResult<Merchant> {
  const { name, ownerUserId, receiveAddress, feePercent, dividendPercent } =
    params;
  if (!name || !receiveAddress) return { error: "缺少必要字段" };
  if (feePercent < 0 || dividendPercent < 0)
    return { error: "费率不能为负数" };
  const merchant: Merchant = {
    id: randomUUID() as MerchantId,
    name,
    ownerUserId,
    receiveAddress,
    feePercent,
    dividendPercent,
    dividendPool: 0,
    createdAt: nowIso(),
  };
  merchants.push(merchant);
  return { data: merchant };
}

export function getMerchantById(id: MerchantId): ApiResult<Merchant> {
  const m = merchants.find((mm) => mm.id === id);
  if (!m) return { error: "商户不存在" };
  return { data: m };
}

export function payoutDividend(params: {
  merchantId: MerchantId;
  recipients: { toAddress: string; amountPi: number }[];
}): ApiResult<{ remainingPool: number }> {
  const { merchantId, recipients } = params;
  const m = merchants.find((mm) => mm.id === merchantId);
  if (!m) return { error: "商户不存在" };
  const total = recipients.reduce((s, r) => s + r.amountPi, 0);
  if (total > m.dividendPool) return { error: "分红池余额不足" };
  for (const r of recipients) {
    transactions.push({
      id: randomUUID() as TransactionId,
      fromUserId: m.ownerUserId,
      toAddress: r.toAddress,
      amountPi: r.amountPi,
      createdAt: nowIso(),
      txHash: `div-${Math.random().toString(36).slice(2, 10)}`,
      meta: { merchantId },
    });
  }
  m.dividendPool -= total;
  return { data: { remainingPool: m.dividendPool } };
}

export function createRedEnvelope(params: {
  creatorUserId: UserId;
  amountPi: number;
  expiresAt: string; // ISO
}): ApiResult<RedEnvelope> {
  const { creatorUserId, amountPi, expiresAt } = params;
  if (amountPi <= 0) return { error: "金额需大于0" };
  const code = randomBytes(32).toString("hex");
  const env: RedEnvelope = {
    id: randomUUID() as RedEnvelopeId,
    creatorUserId,
    code,
    amountPi,
    expiresAt,
    createdAt: nowIso(),
  };
  redEnvelopes.push(env);
  return { data: env };
}

export function claimRedEnvelope(params: {
  code: string;
  claimerUserId: UserId;
}): ApiResult<{ envelope: RedEnvelope; tx: Transaction }> {
  const { code, claimerUserId } = params;
  const env = redEnvelopes.find((e) => e.code === code);
  if (!env) return { error: "红包不存在" };
  if (env.claimedByUserId) return { error: "红包已被领取" };
  if (new Date(env.expiresAt).getTime() < Date.now())
    return { error: "红包已过期" };
  const tx = createTransaction({
    fromUserId: env.creatorUserId,
    toAddress: users.find((u) => u.id === claimerUserId)?.piAddress ?? "",
    amountPi: env.amountPi,
  });
  if ("error" in tx) return tx;
  env.claimedByUserId = claimerUserId;
  env.claimedAt = nowIso();
  return { data: { envelope: env, tx: tx.data } };
}

export function getMerchantPaycodePayload(merchantId: MerchantId) {
  const m = merchants.find((mm) => mm.id === merchantId);
  if (!m) return null;
  return {
    merchantId: m.id,
    name: m.name,
    receiveAddress: m.receiveAddress,
    feePercent: m.feePercent,
    dividendPercent: m.dividendPercent,
  };
}

export const dbDebug = {
  users,
  authTokens,
  transactions,
  merchants,
  redEnvelopes,
};


