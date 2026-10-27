"use client";
import { useEffect, useRef, useState } from "react";
import VendorGate, { FormShell } from "@/components/VendorGate";
import { inputClass, inputStyle } from "@/components/ui";
import { ticketApi } from "@/lib/api";
import { apiErrorMessage, formatDateTime } from "@/lib/config";
import type { Ticket } from "@/lib/types";

type Result = { valid: boolean; detail: string; ticket?: Ticket };

// The browser's built-in barcode reader (Chrome on Android — what most gate staff carry).
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function CheckIn() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanScan(typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const checkIn = async (raw: string) => {
    const token = raw.match(UUID_RE)?.[0];
    if (!token) {
      setResult({ valid: false, detail: "That doesn't look like a Merchke ticket code." });
      return;
    }
    setBusy(true);
    try {
      const { data } = await ticketApi.checkIn(token);
      setResult(data);
    } catch (err) {
      const data = (err as { response?: { data?: Result } }).response?.data;
      setResult(data?.detail ? data : { valid: false, detail: apiErrorMessage(err, "Ticket not found.") });
    } finally {
      setBusy(false);
      setCode("");
    }
  };

  const stopScan = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const startScan = async () => {
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });
      const loop = async () => {
        if (!streamRef.current) return;
        const codes = await detector.detect(video).catch(() => []);
        if (codes[0]?.rawValue) {
          stopScan();
          await checkIn(codes[0].rawValue);
          return;
        }
        requestAnimationFrame(loop);
      };
      loop();
    } catch {
      stopScan();
      setResult({ valid: false, detail: "Couldn't open the camera. Type the code instead." });
    }
  };

  return (
    <FormShell title="Gate check-in" subtitle="Scan or type a ticket code. Each ticket works once.">
      <div className="space-y-4">
        {canScan && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <video ref={videoRef} playsInline muted className={scanning ? "w-full aspect-square object-cover" : "hidden"} />
            <button onClick={scanning ? stopScan : startScan} className="w-full py-4 font-bold text-white" style={{ background: scanning ? "#374151" : "var(--primary)" }}>
              {scanning ? "Stop camera" : "📷 Scan QR code"}
            </button>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); checkIn(code); }} className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste ticket code" aria-label="Ticket code"
            className={inputClass} style={inputStyle} autoCapitalize="none" autoCorrect="off" />
          <button type="submit" disabled={busy || !code} className="px-5 rounded-xl font-bold text-sm text-white disabled:opacity-50 shrink-0" style={{ background: "var(--primary)" }}>
            {busy ? "…" : "Check in"}
          </button>
        </form>

        {result && (
          <div role="status" className="p-5 rounded-2xl text-center"
            style={result.valid
              ? { background: "rgba(16,185,129,0.12)", border: "2px solid #10b981" }
              : { background: "rgba(239,68,68,0.10)", border: "2px solid #ef4444" }}>
            <p className="text-4xl mb-2" aria-hidden>{result.valid ? "✅" : "⛔"}</p>
            <p className="text-lg font-black text-white">{result.valid ? "Let them in" : result.detail}</p>
            {result.ticket && (
              <div className="text-sm text-gray-300 mt-2 space-y-0.5">
                <p className="font-semibold">{result.ticket.ticket_type_name} · {result.ticket.ticket_number}</p>
                <p className="text-gray-500">{result.ticket.event_title} · bought by {result.ticket.buyer_name}</p>
                {!result.valid && result.ticket.used_at && <p className="text-gray-500">First scanned {formatDateTime(result.ticket.used_at)}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </FormShell>
  );
}

export default function CheckInPage() {
  return <VendorGate next="/dashboard/events/check-in"><CheckIn /></VendorGate>;
}
