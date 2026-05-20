/**
 * Class invite-code generator. 8 chars uppercase, phone-friendly (no 0/O/1/I).
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateClassInviteCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function normalizeClassInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidClassInviteCode(code: string): boolean {
  return /^[A-Z2-9]{8}$/.test(code);
}