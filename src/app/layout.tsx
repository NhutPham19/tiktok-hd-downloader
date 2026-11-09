/**
 * app/layout.tsx — Root layout với Inter font + Light Mode metadata
 */
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TikTok HD Downloader — Tải video chất lượng gốc, không logo",
  description:
    "Tải video TikTok HD gốc không logo, không watermark. Hỗ trợ cả video thường và slideshow ảnh. Nhanh, bảo mật, miễn phí.",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
