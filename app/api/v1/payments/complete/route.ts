import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { paymentId, txid } = await req.json().catch(() => ({}));
  if (!paymentId || !txid) return Response.json({ error: "missing paymentId/txid" }, { status: 400 });

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) return Response.json({ error: "server not configured" }, { status: 500 });

  const res = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ txid }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return Response.json({ error: `complete failed`, details: text }, { status: 500 });
  }
  return Response.json({ ok: true });
}


