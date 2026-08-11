import "server-only";
import { randomBytes, createHash } from "crypto";

// Shared secure-token convention used anywhere a link needs to grant
// access without a login (password reset, and — since Stage 7 — a
// visitor's booking manage link): generate a random token, hand the raw
// value to the recipient (e.g. in a URL), and store only its hash. A
// leaked database row is then useless without the raw token that was only
// ever emailed, never persisted.
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
