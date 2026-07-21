import { pool } from "../db/pool.js";

interface ChargilyPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  checkout_url: string;
}

interface ChargilyConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

function getConfig(): ChargilyConfig {
  return {
    apiKey: process.env.CHARGILY_API_KEY ?? "",
    secretKey: process.env.CHARGILY_SECRET_KEY ?? "",
    baseUrl: "https://api.chargily.dz/v1",
  };
}

export async function createChargilyCheckout(params: {
  amount: number;
  currency?: string;
  description: string;
  partnerId: number;
  paymentMethod: "cib" | "edahabia";
}): Promise<ChargilyPayment | null> {
  const config = getConfig();
  if (!config.apiKey || !config.secretKey) {
    console.warn("[Chargily] API keys not configured");
    return null;
  }

  // Amount in centimes (multiply DA by 100)
  const amountInCentimes = params.amount * 100;

  try {
    const response = await fetch(`${config.baseUrl}/checkout_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.secretKey}`,
      },
      body: JSON.stringify({
        amount: amountInCentimes,
        currency: params.currency ?? "DZD",
        description: params.description,
        metadata: {
          partner_id: params.partnerId,
          payment_method: params.paymentMethod,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Chargily] Checkout error:", error);
      return null;
    }

    const data = (await response.json()) as ChargilyPayment;

    // Record payment in database
    await pool.query(
      `INSERT INTO partner_payments (partner_id, amount, currency, payment_method, chargily_payment_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.partnerId,
        params.amount,
        params.currency ?? "DZD",
        params.paymentMethod,
        data.id,
        "pending",
      ]
    );

    return data;
  } catch (err) {
    console.error("[Chargily] Request failed:", err);
    return null;
  }
}

export async function verifyChargilyPayment(
  paymentId: string
): Promise<{ status: string; amount: number } | null> {
  const config = getConfig();
  if (!config.apiKey || !config.secretKey) {
    return null;
  }

  try {
    const response = await fetch(`${config.baseUrl}/checkout_sessions/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { status: string; amount: number };

    // Update payment status in database
    await pool.query(
      `UPDATE partner_payments SET status = $1 WHERE chargily_payment_id = $2`,
      [data.status, paymentId]
    );

    return data;
  } catch (err) {
    console.error("[Chargily] Verification failed:", err);
    return null;
  }
}

export async function getPartnerPayments(
  partnerId: number
): Promise<Array<{
  id: number;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
}>> {
  const { rows } = await pool.query(
    `SELECT id, amount, currency, payment_method, status, created_at
     FROM partner_payments
     WHERE partner_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [partnerId]
  );
  return rows;
}
