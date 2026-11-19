"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { chatApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/config";

type Msg = { role: "user" | "assistant"; content: string; at: string; error?: boolean };

const STORAGE_KEY = "merchi_chat";
const GREETING = "Hi! I'm Merchi, your Merchke assistant. How can I help?";
const SUGGESTIONS = ["How does M-Pesa payment work?", "Is my money safe?", "How do I start selling?", "Where are my tickets?"];

type Stored = { sessionId: string; messages: Msg[] };

function newSessionId() {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `web-${rand}`.slice(0, 40);
}

function load(): Stored {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Stored | null;
    if (parsed?.sessionId && Array.isArray(parsed.messages)) return parsed;
  } catch {
    // corrupted / unavailable storage — start fresh
  }
  return { sessionId: newSessionId(), messages: [] };
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Stored | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // localStorage is only available after mount
    setState(load());
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, messages: state.messages.slice(-60) }));
    } catch {
      // storage full / private mode — chat still works for this visit
    }
  }, [state]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [state?.messages.length, typing, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Job pages have a sticky "Apply" bar on mobile; sit above it.
  const raised = /^\/jobs\/\d+/.test(pathname);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || typing || !state) return;
    const userMsg: Msg = { role: "user", content: message, at: new Date().toISOString() };
    setState({ ...state, messages: [...state.messages, userMsg] });
    setInput("");
    setTyping(true);
    try {
      const { data } = await chatApi.send(message, state.sessionId);
      setState((s) => s && { ...s, messages: [...s.messages, { role: "assistant", content: data.reply, at: data.created_at }] });
      if (data.remaining_today === 0) setLimitReached(true);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 429) setLimitReached(true);
      setState((s) => s && {
        ...s,
        messages: [...s.messages, {
          role: "assistant", error: true, at: new Date().toISOString(),
          content: apiErrorMessage(err, "I couldn't connect just now. Please try again in a moment."),
        }],
      });
    } finally {
      setTyping(false);
    }
  };

  const reset = () => {
    setState({ sessionId: newSessionId(), messages: [] });
    setLimitReached(false);
  };

  const messages = state?.messages ?? [];

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat with Merchi" : "Chat with Merchi, the Merchke assistant"}
        aria-expanded={open}
        className={`fixed ${raised ? "bottom-24" : "bottom-4"} right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-xl glow-orange transition-transform hover:scale-105`}
        style={{ background: "var(--primary)" }}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Merchi support chat"
          className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[380px] h-[85vh] sm:h-[560px] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <header className="flex items-center gap-3 px-4 py-3" style={{ background: "linear-gradient(135deg, #2d1200 0%, #1a0900 100%)", borderBottom: "1px solid var(--border)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white" style={{ background: "var(--primary)" }} aria-hidden>M</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Merchi</p>
              <p className="text-[11px] text-emerald-400">● Online · replies in seconds</p>
            </div>
            <button onClick={reset} className="text-[11px] text-gray-400 hover:text-white px-2 py-1" title="Start a new conversation">New chat</button>
            <button onClick={() => setOpen(false)} className="sm:hidden text-gray-400 hover:text-white px-2 text-lg" aria-label="Close chat">✕</button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
            <Bubble msg={{ role: "assistant", content: GREETING, at: "" }} />
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((q) => (
                  <button key={q} onClick={() => send(q)} className="text-xs px-3 py-2 rounded-full text-gray-300 hover:text-white"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {typing && (
              <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-md w-fit" style={{ background: "var(--surface-2)" }} aria-label="Merchi is typing">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce bg-gray-400" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="p-3 flex items-end gap-2"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              rows={1}
              maxLength={1000}
              disabled={limitReached}
              placeholder={limitReached ? "Daily limit reached — email support@merchke.co.ke" : "Ask about orders, payments, selling…"}
              aria-label="Message Merchi"
              className="flex-1 resize-none max-h-28 px-3 py-2.5 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none disabled:opacity-60"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            />
            <button type="submit" disabled={!input.trim() || typing || limitReached}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-40 shrink-0"
              style={{ background: "var(--primary)" }} aria-label="Send">
              ➤
            </button>
          </form>
          <p className="text-[10px] text-center text-gray-600 pb-2">Powered by Merchke AI · never share your M-Pesa PIN</p>
        </div>
      )}
    </>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.role === "user";
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 text-sm whitespace-pre-line rounded-2xl ${mine ? "rounded-br-md text-white" : "rounded-bl-md text-gray-200"}`}
        style={mine ? { background: "var(--primary)" } : { background: msg.error ? "rgba(239,68,68,0.12)" : "var(--surface-2)" }}
      >
        {msg.content}
      </div>
      {msg.at && <span className="text-[10px] text-gray-600 mt-1 px-1">{time(msg.at)}</span>}
    </div>
  );
}
