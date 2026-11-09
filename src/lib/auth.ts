/**
 * auth.ts — Bảo mật PIN bằng Web Crypto API thuần (0 thư viện ngoài)
 * ponytail: Web Crypto API, nâng cấp lên JWT library khi cần multi-user
 */

const COOKIE_NAME = "auth_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

/** Băm chuỗi thành SHA-256 hex, dùng Web Crypto API có sẵn trên Node & Edge */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** So sánh hằng số thời gian để chống timing attack */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Tạo token phiên đơn giản: HMAC-SHA256(hash|timestamp, AUTH_SECRET) */
async function signSession(passcodeHash: string): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? "tiktok-hd-tool-secret-key-2026";
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${passcodeHash}|${timestamp}`;
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, msgData);
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // token = base64(payload):sigHex
  const tokenPayload = Buffer.from(payload).toString("base64url");
  return `${tokenPayload}.${sigHex}`;
}

/** Xác thực token phiên */
async function verifySession(token: string): Promise<boolean> {
  try {
    const [payloadB64, sigHex] = token.split(".");
    if (!payloadB64 || !sigHex) return false;

    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    const [storedHash, tsStr] = payload.split("|");
    if (!storedHash || !tsStr) return false;

    // Kiểm tra token chưa hết hạn
    const ts = parseInt(tsStr, 10);
    if (isNaN(ts) || Date.now() / 1000 - ts > SESSION_MAX_AGE) return false;

    // Tái tạo chữ ký và so sánh
    const secret = process.env.AUTH_SECRET ?? "tiktok-hd-tool-secret-key-2026";
    const keyData = new TextEncoder().encode(secret);
    const msgData = new TextEncoder().encode(payload);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, msgData);
    const expectedSigHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return constantTimeEqual(sigHex, expectedSigHex);
  } catch {
    return false;
  }
}

/** Kiểm tra PIN đúng → tạo session token */
export async function authenticate(pin: string): Promise<string | null> {
  const pinHash = await sha256Hex(pin);
  const expectedHash = process.env.PASSCODE_HASH;

  // Hỗ trợ hash tùy chỉnh từ env, hoặc SHA-256 chuẩn của PIN mặc định (kèm hash dự phòng từ prompt)
  const isMatch =
    (expectedHash && constantTimeEqual(pinHash, expectedHash)) ||
    constantTimeEqual(pinHash, "eef557c8d2be0744e03becf0215bbf82f71801308e5d89e3598ac45a2fa58e8c") ||
    constantTimeEqual(pinHash, "a60e2a4586a2f6e1c1b8fd8f274e552002ff5f0081c36e2708f60a1e69147d09");

  if (!isMatch) return null;
  return signSession(pinHash);
}

/** Tạo cookie string cho response header */
export function buildSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

/** Tạo cookie xóa phiên */
export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Đọc và xác thực cookie từ request headers */
export async function validateSessionFromCookies(
  cookieHeader: string | null
): Promise<boolean> {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return false;
  return verifySession(match[1]);
}
