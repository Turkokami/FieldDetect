// Matching helpers for /api/integrations/leads.

/** E.164 for US/Canada numbers; other numbers keep their digits with a leading +. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

const STREET_WORDS: Record<string, string> = {
  street: "st", avenue: "ave", av: "ave", road: "rd", drive: "dr", lane: "ln", court: "ct",
  boulevard: "blvd", place: "pl", terrace: "ter", circle: "cir", highway: "hwy", parkway: "pkwy",
  north: "n", south: "s", east: "e", west: "w", northeast: "ne", northwest: "nw",
  southeast: "se", southwest: "sw", apartment: "apt", suite: "ste",
};

export function normalizeAddressKey(addressLine1: string, zip: string): string {
  const street = addressLine1
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => STREET_WORDS[w] ?? w)
    .join(" ");
  return `${street}|${zip.replace(/\D/g, "").slice(0, 5)}`;
}
