"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "Apa itu STR?",
  "Bantuan untuk warga emas?",
  "Saya OKU, apa saya layak?",
  "Bantuan kesihatan B40?",
];

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hai! 👋 Saya pembantu BantuRakyat AI. Tanya saya tentang mana-mana bantuan kerajaan Malaysia — STR, SARA, bantuan JKM, MySalam dan banyak lagi.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.reply ?? "Maaf, saya tidak dapat menjawab sekarang.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Maaf, berlaku ralat rangkaian." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-biru-500 to-biru-700 px-5 py-4 text-white shadow-[0_14px_36px_-10px_rgba(19,58,143,0.7)] ring-1 ring-white/15 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-10px_rgba(19,58,143,0.8)] animate-ring-pulse"
        >
          <MessageCircle className="w-5 h-5 transition-transform group-hover:rotate-12" />
          <span className="font-bold hidden sm:inline">Tanya AI</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end">
          <div
            className="absolute inset-0 bg-black/30 sm:bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="relative m-0 sm:m-6 w-full sm:w-[380px] h-[80vh] sm:h-[560px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-biru-500 text-white px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="bg-white/15 rounded-full p-1.5">
                  <Bot className="w-5 h-5 text-kuning-400" />
                </div>
                <div>
                  <p className="font-bold leading-tight">Pembantu BantuRakyat</p>
                  <p className="text-[11px] text-biru-100">Sedia membantu 24/7</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-biru-500 text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Menaip...
                  </div>
                </div>
              )}

              {messages.length <= 1 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-biru-200 bg-biru-50 text-biru-700 text-xs font-medium px-3 py-1.5 hover:bg-biru-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-slate-100 p-3 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Taip soalan anda..."
                className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-biru-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-biru-500 p-2.5 text-white hover:bg-biru-600 disabled:opacity-50"
                aria-label="Hantar"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
