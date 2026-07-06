import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BantuRakyat AI — Pencari Bantuan Kerajaan Malaysia",
  description:
    "Semak kelayakan anda untuk pelbagai bantuan kerajaan Malaysia (STR, SARA, JKM, MySalam dan banyak lagi) dalam satu imbasan, dengan bantuan pembantu AI.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ms">
      <body className={`${sora.variable} ${jakarta.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
