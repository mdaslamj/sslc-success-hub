/**
 * Invite-code generator + parser. Codes are 8 chars, uppercase, easy to
 * read over the phone (no 0/O/1/I). Stable doc id == code.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars

function secureRandomFromAlphabet(alphabet: string, length: number): string {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[arr[i] % alphabet.length];
  }
  return out;
}

export function generateInviteCode(): string {
  return secureRandomFromAlphabet(ALPHABET, 8);
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidInviteCode(code: string): boolean {
  return /^[A-Z2-9]{8}$/.test(code);
}

/** Convenience for ISO week key like "2026-W21" used for weekly reports. */
export function weekKeyOf(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}