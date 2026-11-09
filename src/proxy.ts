/**
 * src/middleware.ts — Bảo vệ /api/parse và /api/download
 * ponytail: Cookie check trên Edge, nâng cấp lên JWT verify khi cần
 */
import { NextRequest, NextResponse } from "next/server";
import { validateSessionFromCookies } from "@/lib/auth";

export const config = {
  matcher: ["/api/parse", "/api/download"],
};

export async function proxy(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const isValid = await validateSessionFromCookies(cookieHeader);

  if (!isValid) {
    return NextResponse.json(
      { error: "Unauthorized: vui lòng xác thực trước." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}
