import { randomBytes } from "crypto";

/** Opaque URL-safe token for client intake links. */
export function generateIntakeToken(): string {
  return randomBytes(24).toString("base64url");
}
