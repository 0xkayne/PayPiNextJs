export type UserId = string;
export type MerchantId = string;
export type TransactionId = string;
export type RedEnvelopeId = string;

export interface User {
  id: UserId;
  username: string;
  passwordHash: string;
  piAddress: string;
  createdAt: string;
}

export interface AuthToken {
  token: string;
  userId: UserId;
  issuedAt: string;
}

export interface Transaction {
  id: TransactionId;
  fromUserId: UserId;
  toAddress: string;
  amountPi: number;
  txHash?: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface BatchTransferItem {
  toAddress: string;
  amountPi: number;
}

export interface Merchant {
  id: MerchantId;
  name: string;
  ownerUserId: UserId;
  receiveAddress: string;
  feePercent: number; // 0-100
  dividendPercent: number; // 0-100
  dividendPool: number; // accumulated Pi
  createdAt: string;
}

export interface RedEnvelope {
  id: RedEnvelopeId;
  creatorUserId: UserId;
  code: string; // unique claim code
  amountPi: number;
  expiresAt: string; // ISO
  claimedByUserId?: UserId;
  claimedAt?: string;
  createdAt: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  data: T;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// 批量转账历史记录类型
export interface BatchTransferHistory {
  id: string;
  batchId: string;
  totalAmount: string;
  recipientCount: number;
  status: string; // pending, processing, completed, failed, partial_completed
  createdAt: Date | string;
  completedAt?: Date | string | null;
  userPaymentId: string;
  userTxid?: string | null;
  payments: A2UPaymentHistory[];
}

export interface A2UPaymentHistory {
  id: string;
  toAddress: string;
  amount: string;
  status: string; // created, submitted, completed, failed
  txid?: string | null;
  errorMessage?: string | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
}


