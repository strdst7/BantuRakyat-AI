import { getCatalog } from "@/lib/programs";
import type { ChatMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

const catalog = getCatalog();

function knowledgeBase(): string {
  return catalog
    .map(
      (p) =>
        `- ${p.name} (${p.agency}) [${p.category}]: ${p.description} Manfaat: ${p.benefitLabel}. Mohon di: ${p.applyUrl}`,
    )
    .join("\n");
}

// Deterministic, offline-friendly assistant grounded in the program catalog.
const STOP_WORDS = new Set([
  "apa",
  "itu",
  "yang",
  "untuk",
  "saya",
  "boleh",
  "dapat",
  "adakah",
  "bagi",
  "dengan",
  "dan",
  "atau",
  "layak",
  "bantuan",
  "program",
]);

function ruleBasedReply(userText: string): string {
  const text = userText.toLowerCase().replace(/[^\w\s-]/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean);

  const greetings = ["hai", "hi", "hello", "helo", "salam", "assalam", "khabar"];
  if (greetings.some((g) => words.includes(g)) && text.length < 25) {
    return "Hai! 👋 Saya pembantu BantuRakyat AI. Tanya saya tentang bantuan kerajaan seperti STR, SARA, bantuan JKM, MySalam dan lain-lain — atau lengkapkan borang imbasan untuk semak kelayakan anda.";
  }

  const matched = catalog.filter((p) => {
    const hay =
      `${p.slug} ${p.name} ${p.nameMs} ${p.category} ${p.agency} ${p.tags.join(" ")}`.toLowerCase();
    return words.some(
      (w) => w.length >= 2 && !STOP_WORDS.has(w) && hay.includes(w),
    );
  });

  if (matched.length > 0) {
    const top = matched.slice(0, 3);
    const lines = top
      .map(
        (p) =>
          `📌 **${p.name}** (${p.agency})\n${p.description}\n💰 ${p.benefitLabel}\n🔗 Mohon: ${p.applyUrl}`,
      )
      .join("\n\n");
    return `Berikut program yang mungkin berkaitan:\n\n${lines}\n\nUntuk semakan kelayakan peribadi, sila lengkapkan borang imbasan di halaman utama.`;
  }

  if (text.includes("layak") || text.includes("kelayakan") || text.includes("mohon")) {
    return "Untuk menyemak kelayakan anda dengan tepat, klik butang 'Semak Kelayakan Saya' dan isikan maklumat pendapatan, saiz isi rumah dan status pekerjaan. Sistem akan padankan anda dengan program yang berkaitan serta anggaran jumlah bantuan setahun.";
  }

  return "Saya boleh bantu terangkan program bantuan kerajaan Malaysia seperti STR, SARA, Bantuan Warga Emas, Bantuan OKU, Bantuan Kanak-Kanak, MySalam, PeKa B40, i-Suri, Rumah Mesra Rakyat, PTPTN dan PERKESO. Cuba tanya, contohnya: \"Apa itu STR?\" atau \"Bantuan untuk warga emas?\".";
}

async function openAiReply(messages: ChatMessage[]): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const system = `Anda ialah pembantu "BantuRakyat AI" yang membantu rakyat Malaysia memahami bantuan kerajaan. Jawab ringkas, mesra, dalam Bahasa Melayu (boleh campur sedikit Inggeris). Guna HANYA maklumat daripada senarai program di bawah dan galakkan pengguna menyemak di portal rasmi. Jangan reka amaun atau syarat yang tiada dalam senarai. Ingatkan bahawa anggaran hanyalah panduan.\n\nSENARAI PROGRAM:\n${knowledgeBase()}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: "system", content: system },
          ...messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    return typeof reply === "string" ? reply : null;
  } catch (e) {
    console.error("OpenAI call failed", e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const userText = lastUser?.content ?? "";

    const ai = await openAiReply(messages);
    const reply = ai ?? ruleBasedReply(userText);
    return Response.json({ reply, source: ai ? "ai" : "rules" });
  } catch (err) {
    console.error("Chat failed", err);
    return Response.json(
      { reply: "Maaf, berlaku ralat. Sila cuba lagi." },
      { status: 200 },
    );
  }
}
