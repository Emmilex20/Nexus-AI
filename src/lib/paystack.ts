type PaystackInitializePayload = {
  email: string;
  amount: number;
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
};

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    customer: {
      email: string;
    };
    metadata?: Record<string, unknown>;
  };
};

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getPaystackSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not set");
  }

  return secretKey;
}

export async function initializePaystackTransaction(
  payload: PaystackInitializePayload
) {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as PaystackInitializeResponse;

  if (!res.ok || !data.status || !data.data?.authorization_url) {
    throw new Error(data.message || "Failed to initialize Paystack transaction");
  }

  return data.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
      },
    }
  );

  const data = (await res.json()) as PaystackVerifyResponse;

  if (!res.ok || !data.status || !data.data) {
    throw new Error(data.message || "Failed to verify Paystack transaction");
  }

  return data.data;
}
