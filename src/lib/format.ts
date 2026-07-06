export function rm(amount: number): string {
  return `RM${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export const CATEGORY_STYLES: Record<string, { bg: string; text: string; emoji: string }> = {
  "Bantuan Tunai": { bg: "bg-hijau-500/10", text: "text-hijau-600", emoji: "💵" },
  Kesihatan: { bg: "bg-merah-500/10", text: "text-merah-600", emoji: "🩺" },
  "Warga Emas": { bg: "bg-amber-500/10", text: "text-amber-600", emoji: "🧓" },
  OKU: { bg: "bg-purple-500/10", text: "text-purple-600", emoji: "♿" },
  "Kanak-Kanak": { bg: "bg-pink-500/10", text: "text-pink-600", emoji: "🧒" },
  Perumahan: { bg: "bg-orange-500/10", text: "text-orange-600", emoji: "🏠" },
  Pendidikan: { bg: "bg-biru-500/10", text: "text-biru-600", emoji: "🎓" },
  Persaraan: { bg: "bg-teal-500/10", text: "text-teal-600", emoji: "🪙" },
  Kebajikan: { bg: "bg-slate-500/10", text: "text-slate-600", emoji: "🤝" },
};

export function categoryStyle(category: string) {
  return (
    CATEGORY_STYLES[category] ?? {
      bg: "bg-slate-500/10",
      text: "text-slate-600",
      emoji: "📋",
    }
  );
}
