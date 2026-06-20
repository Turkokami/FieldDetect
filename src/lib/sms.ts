// SMS via Twilio — falls back to console log if not configured.
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in env to enable.

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    console.log(`[SMS] Not configured. Would send to ${to}: ${body}`);
    return false;
  }

  const cleaned = to.replace(/\D/g, "");
  const e164 = cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: FROM_NUMBER, To: e164, Body: body }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[SMS] Twilio error:", err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[SMS] Send failed:", err);
    return false;
  }
}
