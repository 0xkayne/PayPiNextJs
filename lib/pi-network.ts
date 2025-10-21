import PiNetwork from 'pi-backend';

// 初始化 Pi Network SDK
function getPiClient() {
  const apiKey = process.env.PI_API_KEY;
  const walletPrivateSeed = process.env.PI_WALLET_PRIVATE_SEED; // 需要在 .env 中配置

  if (!apiKey || !walletPrivateSeed) {
    throw new Error('Pi Network credentials not configured');
  }

  return new PiNetwork(apiKey, walletPrivateSeed);
}

// 创建 A2U 支付
export async function createA2UPayment(params: {
  uid: string;  // 收款人的 Pi uid
  amount: number;
  memo: string;
  metadata: object;
}) {
  const pi = getPiClient();
  const paymentId = await pi.createPayment({
    amount: params.amount,
    memo: params.memo,
    metadata: params.metadata,
    uid: params.uid,
  });
  return paymentId;
}

// 提交支付到区块链
export async function submitA2UPayment(paymentId: string) {
  const pi = getPiClient();
  const txid = await pi.submitPayment(paymentId);
  return txid;
}

// 完成支付
export async function completeA2UPayment(paymentId: string, txid: string) {
  const pi = getPiClient();
  const payment = await pi.completePayment(paymentId, txid);
  return payment;
}

// 获取支付详情
export async function getPaymentDetails(paymentId: string) {
  const pi = getPiClient();
  return await pi.getPayment(paymentId);
}

// 取消支付
export async function cancelA2UPayment(paymentId: string) {
  const pi = getPiClient();
  return await pi.cancelPayment(paymentId);
}

// 获取未完成的服务端支付
export async function getIncompleteServerPayments() {
  const pi = getPiClient();
  return await pi.getIncompleteServerPayments();
}

