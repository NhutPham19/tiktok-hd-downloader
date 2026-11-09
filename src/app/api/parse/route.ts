/**
 * src/app/api/parse/route.ts — Bóc tách link TikTok → trả JSON
 */
import { NextRequest, NextResponse } from "next/server";
import { extractTikTokUrl, fetchTikTokData } from "@/lib/tiktok";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rawInput: string = body?.url ?? "";

  if (!rawInput || typeof rawInput !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const cleanUrl = extractTikTokUrl(rawInput);
  if (!cleanUrl) {
    return NextResponse.json(
      { error: "Không tìm thấy link TikTok hợp lệ trong chuỗi đã nhập." },
      { status: 422 }
    );
  }

  try {
    const data = await fetchTikTokData(cleanUrl);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[parse] Error:", err);
    return NextResponse.json(
      { error: "Không thể lấy thông tin video. Hãy thử lại sau." },
      { status: 502 }
    );
  }
}
