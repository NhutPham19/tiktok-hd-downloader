"use client";

/**
 * app/page.tsx — Giao diện duy nhất: PIN Lock → Tải Video TikTok HD
 * ponytail: 1 file duy nhất cho toàn bộ UI, nâng cấp tách component khi >400 LOC
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Lock,
  Clipboard,
  Download,
  Music,
  Image as ImageIcon,
  RefreshCw,
  LogOut,
  Loader2,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TikTokResult {
  type: "video" | "slideshow";
  id: string;
  title: string;
  author: string;
  cover: string;
  duration?: number;
  hdplay?: string;
  play?: string;
  music?: string;
  musicTitle?: string;
  images?: string[];
}

type UIState = "locked" | "idle" | "loading" | "result" | "error";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildDownloadUrl(
  fileUrl: string,
  filename: string,
  type: "mp4" | "mp3" | "jpg"
): string {
  const params = new URLSearchParams({ url: fileUrl, filename, type });
  return `/api/download?${params.toString()}`;
}

function formatDuration(secs?: number): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Màn hình nhập PIN với 1 single-input ẩn chống lỗi nhảy 2 số */
function PinScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submitPin = useCallback(
    async (code: string) => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: code }),
        });
        if (res.ok) {
          onUnlock();
        } else {
          setShake(true);
          setPin("");
          setTimeout(() => {
            setShake(false);
            inputRef.current?.focus();
          }, 450);
        }
      } catch {
        setShake(true);
        setPin("");
        setTimeout(() => {
          setShake(false);
          inputRef.current?.focus();
        }, 450);
      } finally {
        setLoading(false);
      }
    },
    [onUnlock]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const val = rawVal.slice(0, 4);
    setPin(val);

    // Auto-submit khi đủ 4 số
    if (val.length === 4) {
      submitPin(val);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
          borderRadius: "1.25rem",
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: "23rem",
          textAlign: "center",
          margin: "0 auto",
        }}
      >
        {/* Icon khóa */}
        <div
          style={{
            width: 56,
            height: 56,
            background: "#f1f5f9",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <Lock size={24} color="#0f172a" strokeWidth={2} />
        </div>

        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "0.25rem",
          }}
        >
          Nhập mã truy cập
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#64748b",
            marginBottom: "1.75rem",
          }}
        >
          Nhập mã PIN 4 số để tiếp tục
        </p>

        {/* 4 ô PIN với Single Input ẩn — 100% không bị nhảy đúp số */}
        <div
          onClick={() => inputRef.current?.focus()}
          className={shake ? "shake" : ""}
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            marginBottom: "1rem",
            position: "relative",
            cursor: "text",
          }}
        >
          {/* Input vô hình nhận mọi phím bấm chuẩn */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={4}
            value={pin}
            onChange={handleInputChange}
            disabled={loading}
            aria-label="Nhập 4 số PIN"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "text",
              zIndex: 2,
            }}
          />

          {[0, 1, 2, 3].map((i) => {
            const digit = pin[i] ?? "";
            const isCurrent = i === pin.length && !loading;
            return (
              <div
                key={i}
                style={{
                  width: 56,
                  height: 60,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${
                    isCurrent ? "#2563eb" : digit ? "#0f172a" : "#e2e8f0"
                  }`,
                  borderRadius: "0.75rem",
                  background: "#f8fafc",
                  color: "#0f172a",
                  boxShadow: isCurrent
                    ? "0 0 0 3px rgba(37, 99, 235, 0.15)"
                    : "none",
                  transition: "border-color 150ms, box-shadow 150ms",
                  userSelect: "none",
                }}
              >
                {digit}
              </div>
            );
          })}
        </div>

        {loading ? (
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#2563eb",
              marginTop: "0.75rem",
              fontWeight: 500,
            }}
          >
            Đang xác thực…
          </p>
        ) : (
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#94a3b8",
              marginTop: "0.75rem",
            }}
          >
            Chạm vào ô để nhập
          </p>
        )}
      </div>
    </div>
  );
}

/** Skeleton loading card */
function SkeletonCard() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 8px 30px rgb(0 0 0 / 0.04)",
        borderRadius: "1rem",
        padding: "1.25rem",
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 100,
          minWidth: 100,
          aspectRatio: "9/16",
          background:
            "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
          backgroundSize: "200% 100%",
          borderRadius: "0.625rem",
          animation: "shimmer 1.5s infinite",
        }}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
        }}
      >
        <div
          style={{
            height: 14,
            background: "#f1f5f9",
            borderRadius: 6,
            width: "60%",
          }}
        />
        <div
          style={{
            height: 12,
            background: "#f1f5f9",
            borderRadius: 6,
            width: "40%",
          }}
        />
        <div
          style={{
            height: 40,
            background: "#f1f5f9",
            borderRadius: 8,
            marginTop: "0.5rem",
          }}
        />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div
            style={{
              height: 32,
              background: "#f1f5f9",
              borderRadius: 8,
              flex: 1,
            }}
          />
          <div
            style={{
              height: 32,
              background: "#f1f5f9",
              borderRadius: 8,
              flex: 1,
            }}
          />
        </div>
      </div>
      <style>{`@keyframes shimmer { to { background-position: -200% 0; } }`}</style>
    </div>
  );
}

/** Card kết quả video */
function VideoResultCard({
  data,
  onReset,
}: {
  data: TikTokResult;
  onReset: () => void;
}) {
  const videoId = data.id || "video";
  const isSlideshow = data.type === "slideshow";

  return (
    <div className="fade-in-up">
      {isSlideshow ? (
        // ── Slideshow ────────────────────────────────────────────────
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 30px rgb(0 0 0 / 0.04)",
            borderRadius: "1rem",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                @{data.author}
              </p>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#64748b",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {data.title}
              </p>
            </div>
            <button
              onClick={onReset}
              title="Tải video khác"
              style={{
                padding: "0.375rem",
                borderRadius: "0.5rem",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                background: "transparent",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Lưới ảnh */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            {(data.images ?? []).map((img, i) => (
              <a
                key={i}
                href={buildDownloadUrl(
                  img,
                  `tiktok-img-${videoId}-${i + 1}.jpg`,
                  "jpg"
                )}
                download
                style={{
                  display: "block",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  aspectRatio: "9/16",
                  background: "#f1f5f9",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Ảnh ${i + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  loading="lazy"
                />
              </a>
            ))}
          </div>

          {/* Nút hành động */}
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <a
              href={buildDownloadUrl(
                data.cover,
                `tiktok-cover-${videoId}.jpg`,
                "jpg"
              )}
              download
              style={{
                flex: 1,
                minWidth: 140,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.625rem 1rem",
                background: "#0f172a",
                color: "#fff",
                borderRadius: "0.625rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <ImageIcon size={16} /> Tải ảnh bìa
            </a>
            {data.music && (
              <a
                href={buildDownloadUrl(
                  data.music,
                  `tiktok-music-${videoId}.mp3`,
                  "mp3"
                )}
                download
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 1rem",
                  border: "1px solid #e2e8f0",
                  color: "#0f172a",
                  background: "#fff",
                  borderRadius: "0.625rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                <Music size={16} /> Tải nhạc MP3
              </a>
            )}
          </div>
        </div>
      ) : (
        // ── Video thường ──────────────────────────────────────────────
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 30px rgb(0 0 0 / 0.04)",
            borderRadius: "1rem",
            padding: "1.25rem",
            display: "flex",
            gap: "1rem",
            alignItems: "flex-start",
          }}
        >
          {/* Ảnh bìa */}
          <div style={{ position: "relative", minWidth: 100, width: 100 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.cover}
              alt="Cover"
              style={{
                width: "100%",
                aspectRatio: "9/16",
                objectFit: "cover",
                borderRadius: "0.625rem",
                background: "#f1f5f9",
              }}
              loading="lazy"
            />
            {data.duration && (
              <span
                style={{
                  position: "absolute",
                  bottom: 4,
                  right: 4,
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  borderRadius: "0.25rem",
                  padding: "1px 5px",
                }}
              >
                {formatDuration(data.duration)}
              </span>
            )}
          </div>

          {/* Thông tin + nút */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: "0.125rem",
                  }}
                >
                  @{data.author}
                </p>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "#64748b",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {data.title}
                </p>
              </div>
              <button
                onClick={onReset}
                title="Tải video khác"
                style={{
                  flexShrink: 0,
                  padding: "0.375rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  background: "transparent",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Nút HD — nổi bật nhất */}
            {data.hdplay && (
              <a
                href={buildDownloadUrl(
                  data.hdplay,
                  `tiktok-hd-${videoId}.mp4`,
                  "mp4"
                )}
                download
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.75rem",
                  background: "#0f172a",
                  color: "#fff",
                  borderRadius: "0.625rem",
                  fontWeight: 700,
                  fontSize: "0.9375rem",
                  textDecoration: "none",
                  marginBottom: "0.625rem",
                  cursor: "pointer",
                }}
              >
                <Download size={17} />
                Tải Video HD (Không Logo)
                <span
                  style={{
                    marginLeft: "0.25rem",
                    background: "#10b981",
                    color: "#fff",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    borderRadius: "0.25rem",
                    padding: "1px 6px",
                  }}
                >
                  HD
                </span>
              </a>
            )}

            {/* Nút phụ */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {data.play && (
                <a
                  href={buildDownloadUrl(
                    data.play,
                    `tiktok-${videoId}.mp4`,
                    "mp4"
                  )}
                  download
                  style={{
                    flex: 1,
                    minWidth: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.375rem",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                    background: "#fff",
                    borderRadius: "0.5rem",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    textDecoration: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Download size={14} /> MP4 Thường
                </a>
              )}
              {data.music && (
                <a
                  href={buildDownloadUrl(
                    data.music,
                    `tiktok-music-${videoId}.mp3`,
                    "mp3"
                  )}
                  download
                  style={{
                    flex: 1,
                    minWidth: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.375rem",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #e2e8f0",
                    color: "#0f172a",
                    background: "#fff",
                    borderRadius: "0.5rem",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    textDecoration: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Music size={14} /> Nhạc MP3
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export default function Home() {
  const [uiState, setUiState] = useState<UIState>("locked");
  const [inputVal, setInputVal] = useState("");
  const [result, setResult] = useState<TikTokResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Kiểm tra session hiện có khi load
  useEffect(() => {
    fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "ping" }),
    })
      .then((r) => {
        if (r.status !== 401) setUiState("idle");
      })
      .catch(() => {});
  }, []);

  const handleUnlock = () => {
    setUiState("idle");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleLock = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setUiState("locked");
    setResult(null);
    setInputVal("");
  };

  const runParse = useCallback(async (raw: string) => {
    const url = raw.trim();
    if (!url) return;
    setUiState("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.status === 401) {
        setUiState("locked");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
        setUiState("error");
        return;
      }
      setResult(data as TikTokResult);
      setUiState("result");
    } catch {
      setErrorMsg("Không kết nối được server. Hãy kiểm tra mạng và thử lại.");
      setUiState("error");
    }
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputVal(text);
      runParse(text);
    } catch {
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setInputVal("");
    setResult(null);
    if (uiState === "result" || uiState === "error") {
      setUiState("idle");
    }
    inputRef.current?.focus();
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (
      text.includes("tiktok.com") ||
      text.includes("vt.tiktok") ||
      text.includes("vm.tiktok")
    ) {
      e.preventDefault();
      setInputVal(text);
      runParse(text);
    }
  };

  const handleReset = () => {
    setResult(null);
    setInputVal("");
    setUiState("idle");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Render: Màn hình khóa ─────────────────────────────────────────────────
  if (uiState === "locked") {
    return <PinScreen onUnlock={handleUnlock} />;
  }

  // ── Render: Màn hình chính ────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      {/* Header tối giản */}
      <header
        style={{
          borderBottom: "1px solid #e2e8f0",
          background: "rgba(248,250,252,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "0.875rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Download size={18} color="#0f172a" strokeWidth={2.5} />
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            TikTok HD
          </span>
        </div>
        <button
          onClick={handleLock}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "#64748b",
            background: "transparent",
            border: "1px solid #e2e8f0",
            borderRadius: "0.5rem",
            padding: "0.375rem 0.75rem",
            cursor: "pointer",
          }}
        >
          <LogOut size={14} /> Khóa lại
        </button>
      </header>

      {/* Content */}
      <main
        style={{
          flex: 1,
          maxWidth: "680px",
          width: "100%",
          margin: "0 auto",
          padding: "2rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          boxSizing: "border-box",
        }}
      >
        {/* Hero text */}
        {uiState === "idle" && (
          <div style={{ textAlign: "center", paddingBottom: "0.5rem" }}>
            <h2
              style={{
                fontSize: "clamp(1.375rem, 4vw, 1.875rem)",
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                marginBottom: "0.375rem",
              }}
            >
              Tải Video TikTok HD
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#64748b" }}>
              Không logo · Không watermark · Chất lượng gốc
            </p>
          </div>
        )}

        {/* Input khu vực */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 30px rgb(0 0 0 / 0.04)",
            borderRadius: "1rem",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.625rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "stretch",
              position: "relative",
            }}
          >
            {/* Input dán link */}
            <div
              style={{
                position: "relative",
                flex: 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                ref={inputRef}
                type="url"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onPaste={handleInputPaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runParse(inputVal);
                }}
                placeholder="Dán link TikTok vào đây…"
                disabled={uiState === "loading"}
                aria-label="Link TikTok"
                style={{
                  width: "100%",
                  height: 52,
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  padding: inputVal ? "0 2.5rem 0 1rem" : "0 1rem",
                  fontSize: "0.9375rem",
                  color: "#0f172a",
                  outline: "none",
                  background: "#f8fafc",
                  transition: "border-color 150ms",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />

              {/* Nút Xóa nhanh bên trong input khi có ký tự */}
              {inputVal && (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Xóa link này"
                  aria-label="Xóa link"
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "#e2e8f0",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#475569",
                    padding: 0,
                    transition: "background 150ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#cbd5e1")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#e2e8f0")
                  }
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Nút Xóa tất cả ngoài thanh (hiện khi có link) */}
            {inputVal && (
              <button
                type="button"
                onClick={handleClear}
                title="Xóa nhanh tất cả link đã nhập"
                style={{
                  height: 52,
                  padding: "0 0.875rem",
                  border: "1.5px solid #fee2e2",
                  borderRadius: "0.75rem",
                  background: "#fef2f2",
                  color: "#dc2626",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                <X size={15} /> Xóa
              </button>
            )}

            {/* Nút Dán từ Clipboard */}
            <button
              onClick={handlePaste}
              disabled={uiState === "loading"}
              title="Dán từ bộ nhớ tạm"
              aria-label="Dán từ bộ nhớ tạm"
              style={{
                height: 52,
                padding: "0 1rem",
                border: "1.5px solid #e2e8f0",
                borderRadius: "0.75rem",
                background: "#f8fafc",
                color: "#0f172a",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              <Clipboard size={16} />
              <span>Dán</span>
            </button>
          </div>

          {/* Nút Lấy Video */}
          <button
            onClick={() => runParse(inputVal)}
            disabled={uiState === "loading" || !inputVal.trim()}
            style={{
              width: "100%",
              height: 48,
              background: inputVal.trim() ? "#0f172a" : "#94a3b8",
              color: "#fff",
              borderRadius: "0.75rem",
              border: "none",
              fontSize: "0.9375rem",
              fontWeight: 700,
              cursor: inputVal.trim() ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "background 150ms, transform 100ms",
            }}
            onMouseDown={(e) => {
              if (inputVal.trim())
                e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {uiState === "loading" ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Đang phân tích…
              </>
            ) : (
              <>
                <Download size={18} /> Lấy Video
              </>
            )}
          </button>
        </div>

        {/* Trạng thái loading */}
        {uiState === "loading" && <SkeletonCard />}

        {/* Lỗi */}
        {uiState === "error" && (
          <div
            className="fade-in-up"
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem",
              color: "#be123c",
              fontSize: "0.9rem",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Kết quả */}
        {uiState === "result" && result && (
          <VideoResultCard data={result} onReset={handleReset} />
        )}
      </main>

      {/* Footer tối giản */}
      <footer
        style={{
          textAlign: "center",
          padding: "1.25rem",
          fontSize: "0.75rem",
          color: "#94a3b8",
          borderTop: "1px solid #f1f5f9",
        }}
      >
        Chỉ sử dụng cho mục đích cá nhân · Không lưu video trên server
      </footer>
    </div>
  );
}
