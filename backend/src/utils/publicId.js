import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

export function generatePublicUserId() {
  const bytes = crypto.randomBytes(7);
  let out = "";
  for (let i = 0; i < 7; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `USER-${out}`;
}
