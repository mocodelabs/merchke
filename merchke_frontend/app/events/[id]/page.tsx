"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { eventApi, paymentApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

function mediaUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "") + path;
}

type TicketType = {
  id: number; name: string; description?: string;
  price: string; total_quantity: number;
  tickets_sold: number; tickets_remaining: number; is_sold_out: boolean;
};

type Event = {
  id: number; title: string; description: string;
  venue_name: string; venue_address: string; town: string;
  start_datetime: string; end_datetime?: string | null; genre: string;
  banner_image?: string; status: string;
  google_maps_link?: string;
  vendor_name: string; vendor_slug: string;
  ticket_types: TicketType[];
};

function formatDate(iso: string) {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString("en-KE", { weekday: "short" }),
    date: date.toLocaleDateString("en-KE", { month: "long", day: "numeric" }),
    year: date.getFullYear().toString(),
    time: date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
  };
}

type PurchaseStep = "select" | "confirm" | "pending" | "success" | "error";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [step, setStep] = useState<PurchaseStep>("select");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [purchaseResult, setPurchaseResult] = useState<{
    order_id: number; order_number: string;
    total: string; ticket_type: string; quantity: number;
  } | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    eventApi.detail(Number(id))
      .then((res) => {
        setEvent(res.data);
        if (res.data.ticket_types?.length) {
          const avail = res.data.ticket_types.find((t: TicketType) => !t.is_sold_out);
          setSelectedTicket(avail || res.data.ticket_types[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const totalAmount = selectedTicket ? Number(selectedTicket.price) * quantity : 0;

  const validatePhone = (v: string) => {
    const clean = v.replace(/\s+/g, "");
    if (!/^(07|01|2547|2541|\+2547|\+2541)\d{8}$/.test(clean)) {
      setPhoneError("Enter a valid Kenyan phone number (e.g. 07xxxxxxxx)");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePay = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=/events/${id}`);
      return;
    }
    if (!selectedTicket) return;
    if (!validatePhone(phone)) return;

    setStep("pending");
    setErrorMsg("");

    try {
      const purchaseRes = await eventApi.purchase(Number(id), {
        ticket_type_id: selectedTicket.id,
        quantity,
      });
      const pr = purchaseRes.data;
      setPurchaseResult(pr);

      const payRes = await paymentApi.stkPush({
        order_id: pr.order_id,
        phone: phone.replace(/\s+/g, ""),
      });
      setCheckoutRequestId(payRes.data.CheckoutRequestID || "");

      let count = 0;
      pollRef.current = setInterval(async () => {
        count++;
        setPollCount(count);
        try {
          const statusRes = await paymentApi.queryStatus(
            payRes.data.CheckoutRequestID
          );
          const rc = statusRes.data?.ResultCode;
          if (rc === "0" || rc === 0) {
            clearInterval(pollRef.current!);
            setStep("success");
          } else if (rc !== undefined && rc !== null) {
            clearInterval(pollRef.current!);
            setErrorMsg(statusRes.data?.ResultDesc || "Payment cancelled or failed");
            setStep("error");
          }
        } catch (_) {}

        if (count >= 12) {
          clearInterval(pollRef.current!);
          setStep("error");
          setErrorMsg("Payment timed out. Check your M-Pesa for any deductions.");
        }
      }, 5000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; detail?: string } } };
      setErrorMsg(e.response?.data?.error || e.response?.data?.detail || "Something went wrong");
      setStep("error");
    }
  };

  if (loading) return <EventSkeleton />;
  if (!event) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-white text-lg font-bold mb-4">Event not found</p>
      <Link href="/events" className="text-sm" style={{ color: "var(--primary)" }}>← Back to Events</Link>
    </div>
  );

  const dt = formatDate(event.start_datetime);
  const availTickets = event.ticket_types.filter((t) => !t.is_sold_out);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/events" className="text-sm flex items-center gap-1 mb-6" style={{ color: "var(--primary)" }}>
        ← All Events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Event info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Banner */}
          <div className="rounded-2xl overflow-hidden aspect-video relative" style={{ background: "var(--surface)" }}>
            {event.banner_image ? (
              <img src={mediaUrl(event.banner_image)} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl">🎵</div>
            )}
            <span
              className="absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full text-white capitalize"
              style={{ background: "var(--primary)" }}
            >
              {event.genre}
            </span>
          </div>

          {/* Title & organiser */}
          <div>
            <h1 className="text-2xl font-black text-white mb-2">{event.title}</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">by</span>
              <Link
                href={`/vendors/${event.vendor_slug}`}
                className="text-sm font-semibold hover:underline"
                style={{ color: "var(--primary)" }}
              >
                {event.vendor_name}
              </Link>
            </div>
          </div>

          {/* Details grid */}
          <div
            className="grid grid-cols-2 gap-4 p-5 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <InfoBlock icon="📅" label="Date">
              <p className="text-white font-bold">{dt.date}, {dt.year}</p>
              <p className="text-gray-400 text-xs">{dt.day}{dt.time ? ` · ${dt.time}` : ""}</p>
            </InfoBlock>
            <InfoBlock icon="📍" label="Venue">
              <p className="text-white font-bold">{event.venue_name}</p>
              <p className="text-gray-400 text-xs">{event.venue_address ? `${event.venue_address}, ` : ""}{event.town}</p>
              {event.google_maps_link && (
                <a href={event.google_maps_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs mt-1 hover:underline" style={{ color: "var(--primary)" }}>
                  View on Maps ↗
                </a>
              )}
            </InfoBlock>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-base font-bold text-white mb-3">About This Event</h2>
            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Ticket types overview */}
          <div>
            <h2 className="text-base font-bold text-white mb-3">Ticket Types</h2>
            <div className="space-y-3">
              {event.ticket_types.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl flex items-center justify-between"
                  style={{ background: "var(--surface)", border: `1px solid ${t.is_sold_out ? "var(--border)" : "var(--primary)"}`, opacity: t.is_sold_out ? 0.5 : 1 }}
                >
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    {t.description && <p className="text-gray-500 text-xs mt-0.5">{t.description}</p>}
                    <p className="text-xs text-gray-600 mt-1">
                      {t.is_sold_out ? "Sold out" : `${t.tickets_remaining} remaining`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-black">
                      {Number(t.price) === 0 ? "FREE" : `KSh ${Number(t.price).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">{t.tickets_remaining} of {t.total_quantity} left</p>
                    {t.is_sold_out && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                        SOLD OUT
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Purchase panel */}
        <div className="lg:col-span-1">
          <div
            className="sticky top-24 rounded-2xl p-5 space-y-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {step === "select" || step === "confirm" ? (
              <>
                <h3 className="font-black text-white text-base">Get Tickets</h3>

                {availTickets.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-2xl mb-2">😔</p>
                    <p className="text-sm text-gray-400">All tickets are sold out</p>
                  </div>
                ) : (
                  <>
                    {/* Ticket type selector */}
                    <div>
                      <label className="text-xs font-semibold text-gray-400 mb-2 block">Ticket Type</label>
                      <div className="space-y-2">
                        {event.ticket_types.map((t) => (
                          <button
                            key={t.id}
                            disabled={t.is_sold_out}
                            onClick={() => { setSelectedTicket(t); setQuantity(1); }}
                            className="w-full px-4 py-3 rounded-xl text-left transition-all text-sm disabled:opacity-40"
                            style={{
                              background: selectedTicket?.id === t.id ? "rgba(249,115,22,0.15)" : "var(--surface-2)",
                              border: `1px solid ${selectedTicket?.id === t.id ? "var(--primary)" : "var(--border)"}`,
                              color: "var(--foreground)",
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">{t.name}</span>
                              <span className="font-black" style={{ color: "var(--primary)" }}>
                                {Number(t.price) === 0 ? "FREE" : `KSh ${Number(t.price).toLocaleString()}`}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">{t.tickets_remaining} left · {t.total_quantity} total</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantity */}
                    {selectedTicket && (
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">Quantity</label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white"
                            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                          >−</button>
                          <span className="text-white font-bold text-base w-6 text-center">{quantity}</span>
                          <button
                            onClick={() => setQuantity((q) => Math.min(selectedTicket.tickets_remaining, q + 1))}
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white"
                            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                          >+</button>
                        </div>
                      </div>
                    )}

                    {/* Phone input (shown in confirm step) */}
                    {step === "confirm" && (
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-2 block">M-Pesa Phone</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                          placeholder="07xx xxx xxx"
                          className="w-full px-4 py-3 rounded-xl text-sm text-white"
                          style={{ background: "var(--surface-2)", border: `1px solid ${phoneError ? "#f87171" : "var(--border)"}` }}
                        />
                        {phoneError && <p className="text-xs text-red-400 mt-1">{phoneError}</p>}
                      </div>
                    )}

                    {/* Total & CTA */}
                    {selectedTicket && (
                      <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
                        <div className="flex justify-between text-sm mb-4">
                          <span className="text-gray-400">Total ({quantity} ticket{quantity > 1 ? "s" : ""})</span>
                          <span className="text-white font-black">
                            {totalAmount === 0 ? "FREE" : `KSh ${totalAmount.toLocaleString()}`}
                          </span>
                        </div>

                        {step === "select" ? (
                          <button
                            onClick={() => {
                              if (!isAuthenticated) { router.push(`/login?next=/events/${id}`); return; }
                              setStep("confirm");
                            }}
                            className="w-full py-3.5 rounded-xl font-bold text-white text-sm"
                            style={{ background: "var(--primary)" }}
                          >
                            {isAuthenticated ? "Continue to Payment" : "Login to Buy Tickets"}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <button
                              onClick={handlePay}
                              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                              style={{ background: "#00a651" }}
                            >
                              <span>Pay with M-Pesa</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setStep("select")}
                              className="w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                            >
                              ← Go back
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : step === "pending" ? (
              <PendingState pollCount={pollCount} total={purchaseResult?.total} />
            ) : step === "success" ? (
              <SuccessState result={purchaseResult} onDone={() => router.push("/orders")} />
            ) : (
              <ErrorState msg={errorMsg} onRetry={() => setStep("confirm")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xl mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        {children}
      </div>
    </div>
  );
}

function PendingState({ pollCount, total }: { pollCount: number; total?: string }) {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center animate-pulse" style={{ background: "rgba(0,166,81,0.15)" }}>
        <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "#00a651" }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <div>
        <p className="text-white font-bold">Check Your Phone</p>
        <p className="text-sm text-gray-400 mt-1">Enter your M-Pesa PIN to complete the payment</p>
        {total && (
          <p className="text-xs text-gray-500 mt-2">Amount: KSh {Number(total).toLocaleString()}</p>
        )}
      </div>
      <div className="flex justify-center gap-1">
        {[0,1,2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: "#00a651", animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600">Checking status ({pollCount * 5}s)</p>
    </div>
  );
}

function SuccessState({ result, onDone }: {
  result: { order_number: string; total: string; ticket_type: string; quantity: number } | null;
  onDone: () => void;
}) {
  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(0,166,81,0.15)" }}>
        <svg className="w-7 h-7" fill="none" stroke="#00a651" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-white font-black text-base">Payment Confirmed!</p>
        {result && (
          <div className="mt-3 text-xs text-gray-400 space-y-1">
            <p>Order: <span className="text-white font-mono">{result.order_number}</span></p>
            <p>{result.ticket_type} × {result.quantity}</p>
            <p>Paid: KSh {Number(result.total).toLocaleString()}</p>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">You&apos;ll receive an SMS confirmation shortly</p>
      </div>
      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl font-bold text-white text-sm"
        style={{ background: "var(--primary)" }}
      >
        View My Orders
      </button>
    </div>
  );
}

function ErrorState({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
        <svg className="w-7 h-7" fill="none" stroke="#f87171" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <div>
        <p className="text-red-400 font-bold">Payment Failed</p>
        <p className="text-xs text-gray-400 mt-1">{msg || "Please try again"}</p>
      </div>
      <button
        onClick={onRetry}
        className="w-full py-3 rounded-xl font-bold text-white text-sm"
        style={{ background: "var(--primary)" }}
      >
        Try Again
      </button>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="h-4 w-32 skeleton rounded mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video skeleton rounded-2xl" />
          <div className="space-y-3">
            <div className="h-7 w-3/4 skeleton rounded" />
            <div className="h-4 w-1/3 skeleton rounded" />
          </div>
          <div className="h-32 skeleton rounded-2xl" />
          <div className="space-y-2">
            <div className="h-4 w-full skeleton rounded" />
            <div className="h-4 w-5/6 skeleton rounded" />
            <div className="h-4 w-4/6 skeleton rounded" />
          </div>
        </div>
        <div className="h-80 skeleton rounded-2xl" />
      </div>
    </div>
  );
}
