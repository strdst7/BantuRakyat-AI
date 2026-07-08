import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BantuRakyat AI - Pembantu Bantuan Malaysia 🇲🇾",
  description: "Check government aid & subsidies you qualify for. Free, anonymous, in BM & English.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ms">
      <body className="bg-[#f5f0e8] text-[#2d2a24] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
