import "server-only";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "Credential vault isn't configured yet. Set CREDENTIAL_ENCRYPTION_KEY (openssl rand -hex 32)."
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be a 32-byte hex string (openssl rand -hex 32)."
    );
  }
  return key;
}

// Stored as base64(iv):base64(authTag):base64(ciphertext) — never plaintext.
export function encryptSecret(plaintext: string) {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(
    ":"
  );
}

export function decryptSecret(stored: string) {
  const key = getKey();
  const [ivB64, authTagB64, ciphertextB64] = stored.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Corrupted credential value.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
