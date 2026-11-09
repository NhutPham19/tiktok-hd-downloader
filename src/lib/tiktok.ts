/**
 * tiktok.ts — Core bóc tách link TikTok + Dual-Provider Fallback
 * ponytail: TikWM API first, @tobyg74/tiktok-api-dl fallback, nâng cấp khi cần thêm provider
 */

/** Regex lọc URL TikTok từ chuỗi bất kỳ (hỗ trợ vm/vt/m subdomain) */
const TIKTOK_URL_REGEX =
  /https?:\/\/(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/[^\s"'<>]+/i;

export function extractTikTokUrl(rawInput: string): string | null {
  const match = rawInput.match(TIKTOK_URL_REGEX);
  return match ? match[0].trim() : null;
}

/** Interface chuẩn hoá kết quả từ mọi provider */
export interface TikTokResult {
  type: "video" | "slideshow";
  id: string;
  title: string;
  author: string;
  cover: string;
  duration?: number;
  // Video
  hdplay?: string;   // HD gốc không logo
  play?: string;     // MP4 chuẩn
  music?: string;    // MP3 nhạc nền
  musicTitle?: string;
  // Slideshow
  images?: string[];
}

/** Adapter Provider 1: TikWM API */
async function fetchFromTikWM(url: string): Promise<TikTokResult> {
  const apiUrl = "https://www.tikwm.com/api/";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ url, hd: "1" }).toString(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`TikWM HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 0 || !json.data) throw new Error("TikWM API error");

    const d = json.data;

    // Slideshow / Photo mode
    if (Array.isArray(d.images) && d.images.length > 0) {
      return {
        type: "slideshow",
        id: d.id ?? "",
        title: d.title ?? "",
        author: d.author?.unique_id ?? d.author ?? "",
        cover: d.cover ?? d.origin_cover ?? "",
        images: d.images as string[],
        music: d.music ?? "",
        musicTitle: d.music_info?.title ?? "",
      };
    }

    // Video thường
    return {
      type: "video",
      id: d.id ?? "",
      title: d.title ?? "",
      author: d.author?.unique_id ?? d.author ?? "",
      cover: d.cover ?? d.origin_cover ?? "",
      duration: d.duration,
      hdplay: d.hdplay ?? "",
      play: d.play ?? "",
      music: d.music ?? "",
      musicTitle: d.music_info?.title ?? "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Adapter Provider 2: @tobyg74/tiktok-api-dl fallback
 * Note: package uses `export = default` (CommonJS), dùng require để tránh TS type issue
 */
async function fetchFromFallback(url: string): Promise<TikTokResult> {
  // ponytail: require pattern cho CommonJS export= module, nâng cấp khi package hỗ trợ ESM
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tiktokDl = require("@tobyg74/tiktok-api-dl") as {
    Downloader: (
      url: string,
      options: { version: "v1" | "v2" | "v3" }
    ) => Promise<{
      status: string;
      message?: string;
      result?: {
        type?: string;
        id?: string;
        desc?: string;
        author?: { nickname?: string; uniqueId?: string };
        video?: {
          duration?: number;
          playAddr?: string[];
          downloadAddr?: string[];
          cover?: string[];
        };
        images?: string[];
        music?: { title?: string; playUrl?: string[] };
        videoHD?: string;
        videoSD?: string;
      };
    }>;
  };

  const result = await tiktokDl.Downloader(url, { version: "v1" });

  if (result.status !== "success" || !result.result) {
    throw new Error("Fallback provider failed");
  }

  const r = result.result;
  const author = r.author?.uniqueId ?? r.author?.nickname ?? "";

  // Slideshow / image type
  if (r.type === "image") {
    const images = r.images ?? [];
    return {
      type: "slideshow",
      id: r.id ?? "",
      title: r.desc ?? "",
      author,
      cover: images[0] ?? "",
      images,
      music: r.music?.playUrl?.[0] ?? "",
      musicTitle: r.music?.title ?? "",
    };
  }

  // Video: ưu tiên HD → downloadAddr → playAddr
  const hdplay = r.videoHD ?? r.video?.downloadAddr?.[0] ?? r.video?.playAddr?.[0] ?? "";
  const play = r.videoSD ?? r.video?.playAddr?.[0] ?? hdplay;
  const cover = r.video?.cover?.[0] ?? "";

  return {
    type: "video",
    id: r.id ?? "",
    title: r.desc ?? "",
    author,
    cover,
    duration: r.video?.duration,
    hdplay,
    play,
    music: r.music?.playUrl?.[0] ?? "",
    musicTitle: r.music?.title ?? "",
  };
}

/** Entry point: TikWM trước, fallback nếu lỗi */
export async function fetchTikTokData(url: string): Promise<TikTokResult> {
  try {
    return await fetchFromTikWM(url);
  } catch (err) {
    console.warn("[tiktok] TikWM failed, switching to fallback:", err);
    return fetchFromFallback(url);
  }
}
