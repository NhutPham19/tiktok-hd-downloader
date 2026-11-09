/**
 * src/app/api/download/route.ts — Stream Proxy (vượt giới hạn 4.5MB Vercel)
 * ponytail: ReadableStream passthrough trên Node.js runtime, không gây warning deploy
 */
export const runtime = "nodejs";

/** Whitelist CDN patterns để chống SSRF */
const ALLOWED_PATTERNS = [
  /tiktokcdn.*\.com$/,
  /tiktok\.com$/,
  /tiktokv\.com$/,
  /tikwm\.com$/,
  /byteoversea\.com$/,
  /ibyteimg\.com$/,
  /bytedance\.com$/,
  /muscdn\.com$/,
  /musical\.ly$/,
  /akamaized\.net$/,
  /snaptik\.app$/,
];

function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");
  const rawFilename = searchParams.get("filename") ?? "tiktok-video.mp4";
  const type = searchParams.get("type") ?? "mp4";

  if (!fileUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Đảm bảo filename có extension chuẩn
  const ext = type === "mp3" ? ".mp3" : type === "jpg" ? ".jpg" : ".mp4";
  const safeFilename = rawFilename.endsWith(ext)
    ? rawFilename
    : `${rawFilename.replace(/\.[^/.]+$/, "")}${ext}`;

  // Nếu host không thuộc whitelist nhưng là HTTPS hợp lệ, redirect trực tiếp thay vì trả lỗi txt
  if (!isAllowedHost(fileUrl)) {
    try {
      const parsed = new URL(fileUrl);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return Response.redirect(fileUrl, 302);
      }
    } catch {
      return new Response("Invalid URL", { status: 400 });
    }
    return new Response("Forbidden: host not allowed", { status: 403 });
  }

  const contentTypeMap: Record<string, string> = {
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const contentType = contentTypeMap[type] ?? "video/mp4";

  try {
    const upstream = await fetch(fileUrl, {
      headers: {
        Referer: "https://www.tiktok.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!upstream.ok) {
      // Nếu CDN chặn referer, thử redirect trực tiếp đến file
      return Response.redirect(fileUrl, 302);
    }

    const encodedFilename = encodeURIComponent(safeFilename);

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "public, max-age=3600",
        ...(upstream.headers.get("Content-Length")
          ? { "Content-Length": upstream.headers.get("Content-Length")! }
          : {}),
      },
    });
  } catch (err) {
    console.error("[download] Stream proxy error:", err);
    // Fallback redirect thẳng đến CDN URL để người dùng vẫn tải được
    return Response.redirect(fileUrl, 302);
  }
}
