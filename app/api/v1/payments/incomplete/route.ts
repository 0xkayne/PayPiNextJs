import { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { getIncompleteServerPayments, cancelA2UPayment } from "@/lib/pi-network";

/**
 * 获取未完成的 A2U 支付
 */
export async function GET(req: NextRequest) {
  try {
    const payments = await getIncompleteServerPayments();
    return json({ data: payments });
  } catch (error) {
    console.error("Failed to get incomplete payments:", error);
    return json({
      error: "Failed to get incomplete payments",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * 处理未完成的支付（取消）
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { paymentId, action } = body ?? {};

  if (!paymentId || !action) {
    return json({ error: "Missing paymentId or action" }, { status: 400 });
  }

  try {
    if (action === "cancel") {
      await cancelA2UPayment(paymentId);
      return json({ ok: true, message: "Payment cancelled successfully" });
    }

    return json({ error: "Invalid action. Only 'cancel' is supported" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process payment:", error);
    return json({
      error: "Failed to process payment",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

