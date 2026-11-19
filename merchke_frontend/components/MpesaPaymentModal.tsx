"use client";
import { useCallback, useState, type ReactNode } from "react";
import { usePolling } from "@/lib/usePolling";
import { apiErrorMessage, formatKES } from "@/lib/config";

export type PaymentCheck = { status: "pending" | "paid" | "failed" | "expired"; error?: string };

type Props = {
  open: boolean;
  phone: string;
  amount: number | string;
  /** e.g. "Pay listing fee" */
  title: string;
  /** Shown while waiting, under the phone number */
  description?: ReactNode;
  /** Asked every 5s; resolve the current payment state */
  check: () => Promise<PaymentCheck>;
  /** Resend the STK push (optional) */
  onRetry?: () => Promise<void>;
  onClose: () => void;
  paidTitle?: string;
  paidBody?: ReactNode;
  /** Buttons/links shown after payment */
  paidActions?: ReactNode;
  /** Give up waiting client-side after this many seconds */
  timeoutSeconds?: number;
};

type View = "waiting" | "paid" | "failed" | "timeout";

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("254") ? "0" + digits.slice(3) : digits;
  return local.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
}

/** Mounted only while open, so every opening starts with fresh state. */
export default function MpesaPaymentModal(props: Props) {
  return props.open ? <PaymentModalBody {...props} /> : null;
}

function PaymentModalBody({
  phone, amount, title, description, check, onRetry, onClose,
  paidTitle = "Payment received", paidBody, paidActions, timeoutSeconds = 150,
}: Props) {
  const [view, setView] = useState<View>("waiting");
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const runCheck = useCallback(async () => {
    const result = await check();
    if (result.status === "paid") {
      setView("paid");
      return true;
    }
    if (result.status === "failed" || result.status === "expired") {
      setError(result.error || (result.status === "expired" ? "The payment window expired." : "The payment did not go through."));
      setView("failed");
      return true;
    }
    if (Date.now() - startedAt > timeoutSeconds * 1000) {
      setView("timeout");
      return true;
    }
    return false;
  }, [check, startedAt, timeoutSeconds]);

  // Check straight away (sandbox payments complete instantly), then every 5s.
  usePolling(runCheck, 5000, view === "waiting", true);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    setError("");
    try {
      await onRetry();
      setStartedAt(Date.now());
      setView("waiting");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not resend the M-Pesa prompt."));
      setView("failed");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="mpesa-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={view === "waiting" ? undefined : onClose} />
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {view === "waiting" && (
          <>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse"
              style={{ background: "var(--accent-dim)" }}
              aria-hidden
            >
              📱
            </div>
            <h2 id="mpesa-title" className="text-lg font-black text-white mb-1">{title}</h2>
            <p className="text-3xl font-black mb-3" style={{ color: "var(--primary)" }}>{formatKES(amount)}</p>
            <p className="text-sm text-gray-400 mb-1">
              We&apos;ve sent an M-Pesa prompt to <strong className="text-white">{maskPhone(phone)}</strong>.
            </p>
            <p className="text-sm text-gray-400 mb-5">Enter your M-Pesa PIN on your phone to complete payment.</p>
            {description && <div className="text-xs text-gray-500 mb-5">{description}</div>}
            <div className="flex justify-center gap-2 mb-5" aria-label="Waiting for payment">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--primary)", animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p className="text-xs text-gray-600">Keep this page open — it updates automatically.</p>
          </>
        )}

        {view === "paid" && (
          <>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 glow-green"
              style={{ background: "var(--accent-dim)", border: "2px solid var(--accent)", color: "var(--accent)" }}
              aria-hidden
            >
              ✓
            </div>
            <h2 id="mpesa-title" className="text-xl font-black text-white mb-2">{paidTitle}</h2>
            {paidBody && <div className="text-sm text-gray-400 mb-5">{paidBody}</div>}
            <div className="flex flex-col gap-2">
              {paidActions ?? (
                <button onClick={onClose} className="w-full py-3.5 rounded-xl font-bold text-white" style={{ background: "var(--primary)" }}>
                  Done
                </button>
              )}
            </div>
          </>
        )}

        {(view === "failed" || view === "timeout") && (
          <>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
              aria-hidden
            >
              !
            </div>
            <h2 id="mpesa-title" className="text-lg font-black text-white mb-2">
              {view === "timeout" ? "Didn't get the prompt?" : "Payment not completed"}
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              {view === "timeout"
                ? "Make sure your phone is on and unlocked and has enough M-Pesa balance, then resend the prompt."
                : error}
            </p>
            <div className="flex flex-col gap-2">
              {onRetry && (
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-60"
                  style={{ background: "var(--primary)" }}
                >
                  {retrying ? "Sending…" : "Resend M-Pesa prompt"}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold text-sm text-gray-300"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                {onRetry ? "I'll do it later" : "Close"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
