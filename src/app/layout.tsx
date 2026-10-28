import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BantuRakyat AI — Pengimbas Bantuan & Subsidi Kerajaan Malaysia',
  description:
    'Semak anggaran kelayakan bantuan Malaysia (STR, SARA, JKM, Zakat, MySalam) dengan penjelasan Bahasa Melayu / English. Bukan portal rasmi kerajaan.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ms" className="scroll-smooth">
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-amber-400 selection:text-slate-950 font-sans">
        {children}
      </body>
    </html>
  );
}
