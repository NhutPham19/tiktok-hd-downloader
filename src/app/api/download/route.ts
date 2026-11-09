/**
 * src/app/api/download/route.ts — Edge Stream Proxy (vượt giới hạn 4.5MB Vercel)
 * ponytail: ReadableStream passthrough, nâng cấp khi cần signed URLs
 */
export const runtime = "edge";

/** Whitelist CDN hostname để chống SSRF */
const ALLOWED_HOSTS = [
  "tiktokcdn.com",
  "tikwm.com",
  "tiktokv.com",
  "muscdn.com",
  "akamaized.net",
  "tiktok.com",
  "snaptik.app",
  "cdn.tikwm.com",
];

function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");
  const filename = searchParams.get("filename") ?? "tiktok-video.mp4";
  const type = searchParams.get("type") ?? "mp4";

  if (!fileUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  if (!isAllowedHost(fileUrl)) {
    return new Response("Forbidden: host not in whitelist", { status: 403 });
  }

  const contentTypeMap: Record<string, string> = {
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const contentType = contentTypeMap[type] ?? "application/octet-stream";

  try {
    const upstream = await fetch(fileUrl, {
      headers: {
        Referer: "https://www.tiktok.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!upstream.ok) {
      return new Response("Upstream error", { status: upstream.status });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        ...(upstream.headers.get("Content-Length")
          ? { "Content-Length": upstream.headers.get("Content-Length")! }
          : {}),
      },
    });
  } catch (err) {
    console.error("[download] Stream error:", err);
    return new Response("Failed to fetch media", { status: 502 });
  }
}
