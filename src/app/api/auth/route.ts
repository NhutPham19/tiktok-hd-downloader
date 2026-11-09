/**
 * src/app/api/auth/route.ts — Đăng nhập / Đăng xuất bằng PIN
 * ponytail: Set/Clear HttpOnly cookie, nâng cấp lên OAuth khi cần
 */
import { NextRequest, NextResponse } from "next/server";
import {
  authenticate,
  buildSessionCookie,
  buildClearCookie,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pin: string = body?.pin ?? "";

  if (!pin || typeof pin !== "string" || pin.length > 10) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const token = await authenticate(pin);
  if (!token) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildSessionCookie(token));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildClearCookie());
  return res;
}
