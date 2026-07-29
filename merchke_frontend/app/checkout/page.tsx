"use client";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

type PayStep = "details" | "payment" | "confirm" | "success";
type PayMethod = "mpesa_stk" | "mpesa_paybill";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState<PayStep>("details");
  const [payMethod, setPayMethod] = useState<PayMethod>("mpesa_stk");
  const [phone, setPhone] = useState("0700");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    county: "",
    town: "",
    address: "",
    deliveryPhone: "",
  });

  const delivery = 200;
  const grandTotal = total + delivery;

  const handleSTKPush = async () => {
    setLoading(true);
    // Simulate API call — replace with real axios call to /api/payments/mpesa/stk-push/
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    setPolling(true);
    setStep("confirm");
  };

  const handlePollingDone = async () => {
    setPolling(false);
    // Simulate payment confirmed
    await new Promise((r) => setTimeout(r, 1000));
    setStep("success");
    clearCart();
  };

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 glow-green"
          style={{ background: "var(--accent-dim)", border: "2px solid var(--accent)" }}
        >
          ✓
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Order Confirmed!</h1>
        <p className="text-gray-400 mb-2">
          Your payment was received via M-Pesa. You will receive an SMS confirmation shortly.
        </p>
        <p className="text-sm font-semibold mb-8" style={{ color: "var(--accent)" }}>
          Order #MK{Math.random().toString(36).slice(2, 10).toUpperCase()}
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold text-white"
          style={{ background: "var(--primary)" }}
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-white mb-8">Checkout</h1>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10 text-sm">
        {[
          { id: "details", label: "Delivery" },
          { id: "payment", label: "Payment" },
          { id: "confirm", label: "Confirm" },
        ].map((s, i) => {
          const steps: PayStep[] = ["details", "payment", "confirm"];
          const current = steps.indexOf(step);
          const idx = steps.indexOf(s.id as PayStep);
          const done = idx < current;
          const active = idx === current;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px" style={{ background: done ? "var(--primary)" : "var(--border)" }} />}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={
                    done
                      ? { background: "var(--primary)", color: "#fff" }
                      : active
                      ? { background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid var(--primary)" }
                      : { background: "var(--surface)", color: "#6b7280", border: "1px solid var(--border)" }
                  }
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: active ? "var(--foreground)" : done ? "var(--primary)" : "#6b7280" }}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form area */}
        <div className="lg:col-span-2">

          {/* Step 1: Delivery details */}
          {step === "details" && (
            <div
              className="p-6 rounded-2xl space-y-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-lg font-bold text-white">Delivery Details</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "name", label: "Full Name", placeholder: "John Kamau" },
                  { key: "email", label: "Email", placeholder: "john@email.com" },
                  { key: "county", label: "County", placeholder: "Nairobi" },
                  { key: "town", label: "Town / Estate", placeholder: "Westlands" },
                  { key: "deliveryPhone", label: "Delivery Phone", placeholder: "0700 000 000" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
                    <input
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none transition-all"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    />
                  </div>
                ))}
              </div>

              {/* Full-width address */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Street Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. Ngong Road, near Shell Station"
                  className="w-full px-3 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                />
              </div>

              <button
                onClick={() => setStep("payment")}
                className="w-full py-4 rounded-xl font-bold text-white mt-2"
                style={{ background: "var(--primary)" }}
              >
                Continue to Payment →
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === "payment" && (
            <div
              className="p-6 rounded-2xl space-y-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-lg font-bold text-white">Select Payment Method</h2>

              {/* STK Push */}
              <button
                onClick={() => setPayMethod("mpesa_stk")}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left"
                style={
                  payMethod === "mpesa_stk"
                    ? { background: "var(--primary-dim)", border: "2px solid var(--primary)" }
                    : { background: "var(--surface-2)", border: "2px solid var(--border)" }
                }
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "var(--accent-dim)" }}
                >
                  📱
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">M-Pesa STK Push</p>
                  <p className="text-xs text-gray-500">A payment prompt is sent directly to your phone</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: payMethod === "mpesa_stk" ? "var(--primary)" : "var(--border)" }}
                >
                  {payMethod === "mpesa_stk" && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--primary)" }} />
                  )}
                </div>
              </button>

              {/* PayBill */}
              <button
                onClick={() => setPayMethod("mpesa_paybill")}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left"
                style={
                  payMethod === "mpesa_paybill"
                    ? { background: "var(--primary-dim)", border: "2px solid var(--primary)" }
                    : { background: "var(--surface-2)", border: "2px solid var(--border)" }
                }
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "var(--primary-dim)" }}
                >
                  💳
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">M-Pesa PayBill / Till</p>
                  <p className="text-xs text-gray-500">Pay to our PayBill number and enter the code</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: payMethod === "mpesa_paybill" ? "var(--primary)" : "var(--border)" }}
                >
                  {payMethod === "mpesa_paybill" && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--primary)" }} />
                  )}
                </div>
              </button>

              {/* Phone input for STK */}
              {payMethod === "mpesa_stk" && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    M-Pesa Phone Number
                  </label>
                  <div
                    className="flex items-center gap-2 rounded-xl overflow-hidden"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                  >
                    <span className="pl-3 text-sm text-gray-500 shrink-0">+254</span>
                    <input
                      value={phone.replace(/^0/, "")}
                      onChange={(e) => setPhone("0" + e.target.value.replace(/^0+/, ""))}
                      placeholder="7XX XXX XXX"
                      className="flex-1 bg-transparent px-2 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">You will receive an STK push on this number</p>
                </div>
              )}

              {/* PayBill instructions */}
              {payMethod === "mpesa_paybill" && (
                <div
                  className="p-4 rounded-xl text-sm space-y-2"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  <p className="font-semibold text-white">How to pay via PayBill:</p>
                  <ol className="text-gray-400 space-y-1 list-decimal list-inside text-xs">
                    <li>Open M-Pesa on your phone</li>
                    <li>Go to <strong className="text-white">Lipa na M-Pesa → Pay Bill</strong></li>
                    <li>Business No: <strong className="text-white">123456</strong></li>
                    <li>Account No: <strong className="text-white">MK-ORDER-ID</strong></li>
                    <li>Amount: <strong style={{ color: "var(--primary)" }}>KSh {grandTotal.toLocaleString()}</strong></li>
                  </ol>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("details")}
                  className="px-5 py-3.5 rounded-xl font-semibold text-sm text-gray-400 hover:text-white transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleSTKPush}
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-60"
                  style={{ background: "var(--primary)" }}
                >
                  {loading ? "Sending STK Push..." : payMethod === "mpesa_stk" ? `Pay KSh ${grandTotal.toLocaleString()} via M-Pesa` : "Confirm Order"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm / awaiting payment */}
          {step === "confirm" && (
            <div
              className="p-6 rounded-2xl text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {polling ? (
                <>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-5 animate-pulse"
                    style={{ background: "var(--accent-dim)" }}
                  >
                    📱
                  </div>
                  <h2 className="text-xl font-bold text-white mb-3">Check Your Phone</h2>
                  <p className="text-gray-400 text-sm mb-6">
                    An M-Pesa prompt has been sent to <strong className="text-white">{phone}</strong>. Enter your PIN to complete payment.
                  </p>
                  <div className="flex justify-center gap-2 mb-6">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: "var(--primary)", animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handlePollingDone}
                    className="px-8 py-3 rounded-xl font-semibold text-white text-sm"
                    style={{ background: "var(--accent)" }}
                  >
                    I&apos;ve completed payment
                  </button>
                </>
              ) : (
                <p className="text-gray-400">Processing...</p>
              )}
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div
            className="rounded-2xl p-5 sticky top-20"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-base font-bold text-white mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <div
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                    style={{ background: "var(--surface-2)" }}
                  >
                    🛍️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 truncate">{item.name}</p>
                    <p className="text-gray-600 text-xs">×{item.quantity}</p>
                  </div>
                  <span className="text-white font-medium shrink-0">
                    KSh {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-4 text-sm" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>KSh {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span><span>KSh {delivery}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="text-white">Total</span>
                <span style={{ color: "var(--primary)" }}>KSh {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
