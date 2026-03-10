"use client";

import { useState, useRef } from "react";
import Link from "next/link";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type DocMode = "invoice" | "order";
type OrderStatus = "confirmed" | "pending";
type DiscountType = "percent" | "fixed";

interface LineItem {
  id: string;
  description: string;
  qty: string;
  rate: string;
}

interface FormData {
  mode: DocMode;
  fromName: string;
  fromEmail: string;
  fromPhone: string;
  fromGST: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  docNumber: string;
  docDate: string;
  dueDate: string;
  orderStatus: OrderStatus;
  items: LineItem[];
  discountEnabled: boolean;
  discountType: DiscountType;
  discountValue: string;
  gstEnabled: boolean;
  gstRate: string;
  notes: string;
  payment: string;
  showQR: boolean;
  upiId: string;
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }
function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayStr() { return new Date().toISOString().split("T")[0]; }
function dueIn30() {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}
function fmtDate(str: string) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function newItem(): LineItem { return { id: uid(), description: "", qty: "1", rate: "" }; }

const defaults: FormData = {
  mode: "invoice",
  fromName: "StaplerLabs",
  fromEmail: "work@staplerlabs.com",
  fromPhone: "+91 82925 11007",
  fromGST: "",
  clientName: "",
  clientEmail: "",
  clientAddress: "",
  docNumber: "",
  docDate: todayStr(),
  dueDate: dueIn30(),
  orderStatus: "confirmed",
  items: [newItem(), newItem()],
  discountEnabled: false,
  discountType: "percent",
  discountValue: "",
  gstEnabled: true,
  gstRate: "18",
  notes: "",
  payment: "",
  showQR: true,
  upiId: "gautam.robin333-8@okaxis",
};

/* ─────────────────────────────────────────────
   STAPLER LABS LOGO (inline SVG — matches official logo kit)
───────────────────────────────────────────── */
function SlLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="200" height="200" fill="#F0F0F0" rx="40"/>
      {/* Corner accent */}
      <circle cx="28" cy="28" r="4" fill="#D4A800" opacity="0.4"/>
      {/* BASE PLATE */}
      <rect x="22" y="134" width="156" height="30" rx="9" fill="#333333"/>
      <rect x="22" y="134" width="156" height="4" rx="9" fill="#444444" opacity="0.9"/>
      <rect x="28" y="158" width="18" height="5" rx="2.5" fill="#555555"/>
      <rect x="154" y="158" width="18" height="5" rx="2.5" fill="#555555"/>
      <rect x="30" y="140" width="116" height="3.5" rx="1.75" fill="#444444"/>
      <rect x="32" y="145" width="4" height="1.5" rx="0.75" fill="#4A4A4A"/>
      <rect x="40" y="145" width="4" height="1.5" rx="0.75" fill="#4A4A4A"/>
      <rect x="48" y="145" width="4" height="1.5" rx="0.75" fill="#4A4A4A"/>
      {/* ARM */}
      <path d="M 22 134 L 22 88 Q 22 72 38 68 L 140 62 Q 160 60 168 76 L 174 96 L 174 134 Z" fill="#555555"/>
      <path d="M 22 88 Q 22 72 38 68 L 140 62 Q 160 60 168 76 L 168 90 L 22 90 Z" fill="#444444"/>
      <path d="M 30 88 Q 30 76 44 73 L 138 67 Q 155 65 163 77" fill="none" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      {/* HINGE */}
      <circle cx="170" cy="112" r="20" fill="#F0F0F0"/>
      <circle cx="170" cy="112" r="20" fill="none" stroke="#C8A800" strokeWidth="4.5"/>
      <circle cx="170" cy="112" r="9.5" fill="#D4A800"/>
      <circle cx="170" cy="112" r="5" fill="#D4A800"/>
      <circle cx="170" cy="112" r="3.5" fill="#F0F0F0"/>
      {/* MOUTH */}
      <rect x="22" y="118" width="146" height="16" fill="#F0F0F0"/>
      <rect x="24" y="120" width="142" height="4" fill="#E8E8E8"/>
      {/* STAPLE */}
      <rect x="32" y="110" width="52" height="10" rx="5" fill="#D4A800"/>
      <rect x="32" y="110" width="10" height="32" rx="5" fill="#D4A800"/>
      <rect x="74" y="110" width="10" height="32" rx="5" fill="#D4A800"/>
      <rect x="34" y="112" width="48" height="2" rx="1" fill="#E8C000" opacity="0.5"/>
      {/* Paper lines */}
      <rect x="14" y="164" width="172" height="3.5" rx="1.75" fill="#D4A800" opacity="0.08"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   INVOICE DOCUMENT (rendered into hidden div for PDF capture)
───────────────────────────────────────────── */
function InvoiceDoc({ f, innerRef }: { f: FormData; innerRef?: React.RefObject<HTMLDivElement | null> }) {
  const subtotal = f.items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
  const discountAmt = f.discountEnabled && f.discountValue
    ? f.discountType === "percent"
      ? subtotal * (parseFloat(f.discountValue) / 100)
      : parseFloat(f.discountValue) || 0
    : 0;
  const afterDiscount = subtotal - discountAmt;
  const gstAmt = f.gstEnabled ? afterDiscount * ((parseFloat(f.gstRate) || 0) / 100) : 0;
  const grand = afterDiscount + gstAmt;
  const isOrder = f.mode === "order";
  // QR is populated imperatively in handleDownload via data-qr attribute selector — no useEffect needed

  return (
    <div
      ref={innerRef}
      style={{
        width: "794px",
        background: "#ffffff",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: "#1a1a1a",
        fontSize: "13px",
        lineHeight: "1.5",
        boxSizing: "border-box",
      }}
    >
      {/* ── Yellow accent top ── */}
      <div style={{ height: "6px", background: "linear-gradient(90deg, #F5C842, #FFD966)" }} />

      {/* ── Header ── */}
      <div style={{ padding: "36px 48px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Logo mark — official StaplerLabs stapler icon */}
          <svg width="42" height="42" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect width="200" height="200" fill="#F0F0F0" rx="40"/>
            <circle cx="28" cy="28" r="4" fill="#D4A800" opacity="0.4"/>
            <rect x="22" y="134" width="156" height="30" rx="9" fill="#333333"/>
            <rect x="22" y="134" width="156" height="4" rx="9" fill="#444444" opacity="0.9"/>
            <rect x="28" y="158" width="18" height="5" rx="2.5" fill="#555555"/>
            <rect x="154" y="158" width="18" height="5" rx="2.5" fill="#555555"/>
            <rect x="30" y="140" width="116" height="3.5" rx="1.75" fill="#444444"/>
            <path d="M 22 134 L 22 88 Q 22 72 38 68 L 140 62 Q 160 60 168 76 L 174 96 L 174 134 Z" fill="#555555"/>
            <path d="M 22 88 Q 22 72 38 68 L 140 62 Q 160 60 168 76 L 168 90 L 22 90 Z" fill="#444444"/>
            <circle cx="170" cy="112" r="20" fill="#F0F0F0"/>
            <circle cx="170" cy="112" r="20" fill="none" stroke="#C8A800" strokeWidth="4.5"/>
            <circle cx="170" cy="112" r="9.5" fill="#D4A800"/>
            <circle cx="170" cy="112" r="5" fill="#D4A800"/>
            <circle cx="170" cy="112" r="3.5" fill="#F0F0F0"/>
            <rect x="22" y="118" width="146" height="16" fill="#F0F0F0"/>
            <rect x="24" y="120" width="142" height="4" fill="#E8E8E8"/>
            <rect x="32" y="110" width="52" height="10" rx="5" fill="#D4A800"/>
            <rect x="32" y="110" width="10" height="32" rx="5" fill="#D4A800"/>
            <rect x="74" y="110" width="10" height="32" rx="5" fill="#D4A800"/>
          </svg>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#0A0A0A", letterSpacing: "-0.5px" }}>
              {f.fromName || "StaplerLabs"}
            </div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "1px" }}>
              {[f.fromEmail, f.fromPhone].filter(Boolean).join("  ·  ")}
              {f.fromGST && <span style={{ marginLeft: "6px", color: "#bbb" }}>GST: {f.fromGST}</span>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            display: "inline-block",
            background: "#0A0A0A",
            color: "#F5C842",
            fontSize: "10px",
            fontWeight: "800",
            padding: "6px 16px",
            borderRadius: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}>
            {isOrder ? "Order Confirmation" : "Invoice"}
          </div>
          {isOrder && (
            <div style={{ marginTop: "8px" }}>
              <span style={{
                display: "inline-block",
                padding: "3px 12px",
                borderRadius: "100px",
                fontSize: "10px",
                fontWeight: "700",
                background: f.orderStatus === "confirmed" ? "#E8F5E9" : "#FFF9E6",
                color: f.orderStatus === "confirmed" ? "#2E7D32" : "#A67C00",
              }}>
                {f.orderStatus === "confirmed" ? "✓ Confirmed" : "⏳ Pending"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Yellow divider ── */}
      <div style={{ margin: "0 48px", height: "2px", background: "#F5C842", borderRadius: "2px" }} />

      {/* ── Meta + Client row ── */}
      <div style={{ padding: "24px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: doc meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          {[
            { label: isOrder ? "Order No." : "Invoice No.", value: f.docNumber || (isOrder ? "ORD-001" : "INV-001"), large: true },
            { label: isOrder ? "Order Date" : "Invoice Date", value: fmtDate(f.docDate) },
            { label: isOrder ? "Est. Delivery" : "Due Date", value: fmtDate(f.dueDate) },
          ].map((m, i) => (
            <div key={i}>
              <div style={{ fontSize: "8px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", marginBottom: "3px" }}>{m.label}</div>
              <div style={{ fontSize: m.large ? "15px" : "12px", fontWeight: m.large ? "800" : "600", color: "#0A0A0A" }}>{m.value}</div>
            </div>
          ))}
        </div>
        {/* Right: client */}
        <div style={{ background: "#F8F8F8", borderRadius: "10px", padding: "14px 18px" }}>
          <div style={{ fontSize: "8px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", marginBottom: "6px" }}>
            {isOrder ? "Order For" : "Billed To"}
          </div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#0A0A0A" }}>{f.clientName || "—"}</div>
          {f.clientEmail && <div style={{ fontSize: "11px", color: "#777", marginTop: "2px" }}>{f.clientEmail}</div>}
          {f.clientAddress && <div style={{ fontSize: "11px", color: "#777" }}>{f.clientAddress}</div>}
        </div>
      </div>

      {/* ── Items table ── */}
      <div style={{ padding: "0 48px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ background: "#0A0A0A", padding: "10px 14px", textAlign: "left", fontSize: "8px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5C842", borderRadius: "6px 0 0 0" }}>Description</th>
              <th style={{ background: "#0A0A0A", padding: "10px 14px", textAlign: "center", fontSize: "8px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5C842", width: "60px" }}>Qty</th>
              <th style={{ background: "#0A0A0A", padding: "10px 14px", textAlign: "right", fontSize: "8px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5C842", width: "100px" }}>Rate</th>
              <th style={{ background: "#0A0A0A", padding: "10px 14px", textAlign: "right", fontSize: "8px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.12em", color: "#F5C842", width: "100px", borderRadius: "0 6px 0 0" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {f.items.map((item, idx) => {
              const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
              return (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? "#ffffff" : "#FAFAFA" }}>
                  <td style={{ padding: "11px 14px", fontSize: "12px", color: "#333", borderBottom: "1px solid #F0F0F0" }}>
                    {item.description || "—"}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "12px", color: "#555", textAlign: "center", borderBottom: "1px solid #F0F0F0" }}>{item.qty || 0}</td>
                  <td style={{ padding: "11px 14px", fontSize: "12px", color: "#555", textAlign: "right", borderBottom: "1px solid #F0F0F0" }}>{formatINR(parseFloat(item.rate) || 0)}</td>
                  <td style={{ padding: "11px 14px", fontSize: "12px", fontWeight: "700", color: "#0A0A0A", textAlign: "right", borderBottom: "1px solid #F0F0F0" }}>{formatINR(amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Totals ── */}
      <div style={{ padding: "16px 48px 0", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "240px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#777" }}>
            <span>Subtotal</span><span>{formatINR(subtotal)}</span>
          </div>
          {f.discountEnabled && discountAmt > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#E53935" }}>
              <span>Discount {f.discountType === "percent" ? `(${f.discountValue}%)` : ""}</span>
              <span>– {formatINR(discountAmt)}</span>
            </div>
          )}
          {f.gstEnabled && parseFloat(f.gstRate) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#777" }}>
              <span>GST ({f.gstRate}%)</span><span>{formatINR(gstAmt)}</span>
            </div>
          )}
          <div style={{ borderTop: "2px solid #0A0A0A", marginTop: "8px", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "900", color: "#0A0A0A" }}>
            <span>Total</span>
            <span style={{ color: "#D4A800" }}>{formatINR(grand)}</span>
          </div>
        </div>
      </div>

      {/* ── Notes + QR row ── */}
      <div style={{ padding: "24px 48px", display: "grid", gridTemplateColumns: f.showQR ? "1fr auto" : "1fr", gap: "24px", alignItems: "start" }}>
        <div>
          {f.notes && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "8px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.12em", color: "#aaa", marginBottom: "6px" }}>Notes</div>
              <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.6", whiteSpace: "pre-line" }}>{f.notes}</div>
            </div>
          )}
          {f.payment && (
            <div style={{ background: "#FFFBEB", borderRadius: "8px", borderLeft: "4px solid #F5C842", padding: "14px 16px" }}>
              <div style={{ fontSize: "8px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.12em", color: "#aaa", marginBottom: "6px" }}>Payment Details</div>
              <div style={{ fontSize: "12px", color: "#333", whiteSpace: "pre-line" }}>{f.payment}</div>
            </div>
          )}
        </div>

        {/* QR Code — src is injected by handleDownload before html2canvas capture; data-qr is the selector */}
        {f.showQR && f.upiId && (
          <div style={{ textAlign: "center", padding: "16px", background: "#F8F8F8", borderRadius: "12px", minWidth: "130px" }}>
            <div style={{ fontSize: "8px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", marginBottom: "10px" }}>Scan to Pay</div>
            <div style={{ display: "inline-block", background: "white", padding: "8px", borderRadius: "8px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img data-qr="true" src="" alt="UPI QR" width={96} height={96} style={{ display: "block", width: "96px", height: "96px" }} />
            </div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "8px", fontWeight: "600" }}>UPI</div>
            <div style={{ fontSize: "9px", color: "#aaa", marginTop: "2px", wordBreak: "break-all", maxWidth: "120px" }}>{f.upiId}</div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ margin: "0 48px", height: "1px", background: "#ECECEC" }} />
      <div style={{ padding: "14px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" fill="#F0F0F0" rx="40"/>
            <rect x="22" y="134" width="156" height="30" rx="9" fill="#333333"/>
            <rect x="22" y="134" width="156" height="4" rx="9" fill="#444444" opacity="0.9"/>
            <path d="M 22 134 L 22 88 Q 22 72 38 68 L 140 62 Q 160 60 168 76 L 174 96 L 174 134 Z" fill="#555555"/>
            <path d="M 22 88 Q 22 72 38 68 L 140 62 Q 160 60 168 76 L 168 90 L 22 90 Z" fill="#444444"/>
            <circle cx="170" cy="112" r="20" fill="#F0F0F0"/>
            <circle cx="170" cy="112" r="20" fill="none" stroke="#C8A800" strokeWidth="4.5"/>
            <circle cx="170" cy="112" r="9.5" fill="#D4A800"/>
            <circle cx="170" cy="112" r="3.5" fill="#F0F0F0"/>
            <rect x="22" y="118" width="146" height="16" fill="#F0F0F0"/>
            <rect x="32" y="110" width="52" height="10" rx="5" fill="#D4A800"/>
            <rect x="32" y="110" width="10" height="32" rx="5" fill="#D4A800"/>
            <rect x="74" y="110" width="10" height="32" rx="5" fill="#D4A800"/>
          </svg>
          <span style={{ fontSize: "10px", color: "#aaa", fontWeight: "600" }}>{f.fromName}</span>
          <span style={{ fontSize: "10px", color: "#ddd" }}>·</span>
          <span style={{ fontSize: "10px", color: "#bbb" }}>{f.fromEmail}</span>
        </div>
        <span style={{ fontSize: "10px", color: "#ccc" }}>staplerlabs.com</span>
      </div>
      <div style={{ height: "5px", background: "linear-gradient(90deg, #F5C842, #FFD966)" }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function InvoicePage() {
  const [f, setF] = useState<FormData>(defaults);
  const [generating, setGenerating] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setF((p) => ({ ...p, [key]: val }));

  const setItem = (id: string, key: keyof LineItem, val: string) =>
    setF((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, [key]: val } : it)) }));

  const addItem = () => setF((p) => ({ ...p, items: [...p.items, newItem()] }));
  const removeItem = (id: string) =>
    setF((p) => ({ ...p, items: p.items.length > 1 ? p.items.filter((it) => it.id !== id) : p.items }));

  /* ── Computed totals ── */
  const subtotal = f.items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
  const discountAmt = f.discountEnabled && f.discountValue
    ? f.discountType === "percent" ? subtotal * (parseFloat(f.discountValue) / 100) : parseFloat(f.discountValue) || 0
    : 0;
  const afterDiscount = subtotal - discountAmt;
  const gstAmt = f.gstEnabled ? afterDiscount * ((parseFloat(f.gstRate) || 0) / 100) : 0;
  const grand = afterDiscount + gstAmt;

  /* ── PDF: capture the hidden full-size div ── */
  const handleDownload = async () => {
    if (!captureRef.current || generating) return;
    setGenerating(true);
    try {
      // ── Step 1: Inject QR code into the capture div BEFORE html2canvas runs ──
      // We do this imperatively (not via state) so we can await completion with certainty.
      if (f.showQR && f.upiId) {
        const qrImg = captureRef.current.querySelector("[data-qr]") as HTMLImageElement | null;
        if (qrImg) {
          const QRmod = await import("qrcode");
          const QR = (QRmod.default ?? QRmod) as {
            toDataURL: (text: string, opts: object) => Promise<string>;
          };
          const upiString = `upi://pay?pa=${encodeURIComponent(f.upiId)}&pn=${encodeURIComponent(f.fromName)}&cu=INR`;
          const dataUrl = await QR.toDataURL(upiString, {
            width: 200, margin: 2, color: { dark: "#000000", light: "#ffffff" },
          });
          // Set src and wait for the browser to paint the image
          await new Promise<void>((resolve) => {
            qrImg.onload = () => resolve();
            qrImg.onerror = () => resolve(); // resolve even on error so PDF still downloads
            qrImg.src = dataUrl;
            // Fallback: if onload doesn't fire within 1s (e.g. data URL already cached), resolve anyway
            setTimeout(resolve, 1000);
          });
        }
      }

      const [h2c, jsPDFmod] = await Promise.all([
        import("html2canvas").then((m) => m.default),
        import("jspdf").then((m) => m.jsPDF),
      ]);

      const el = captureRef.current;
      const canvas = await h2c(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: 794,
        windowHeight: el.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDFmod({ unit: "px", format: "a4", orientation: "portrait" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = pdfW * ratio;

      if (imgH <= pdfH) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, imgH);
      } else {
        // Paginate
        const pagePixelH = (pdfH / pdfW) * canvas.width;
        let offsetY = 0;
        let first = true;
        while (offsetY < canvas.height) {
          const sliceH = Math.min(pagePixelH, canvas.height - offsetY);
          const pg = document.createElement("canvas");
          pg.width = canvas.width;
          pg.height = sliceH;
          const ctx = pg.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pg.width, pg.height);
          ctx.drawImage(canvas, 0, -offsetY);
          if (!first) pdf.addPage();
          pdf.addImage(pg.toDataURL("image/png"), "PNG", 0, 0, pdfW, (sliceH / canvas.width) * pdfW);
          offsetY += pagePixelH;
          first = false;
        }
      }

      const docNum = f.docNumber || (f.mode === "order" ? "ORD-001" : "INV-001");
      const clientSlug = (f.clientName || "Client").replace(/[^a-z0-9]/gi, "_");
      pdf.save(`${f.mode === "order" ? "Order" : "Invoice"}-${docNum}-${clientSlug}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const inp = "w-full bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20";
  const lbl = "block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5";
  const toggle = (on: boolean) => (
    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${on ? "bg-yellow-400" : "bg-white/15"}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">

      {/* ── Hidden capture target (off-screen, no transform) ── */}
      {/* IMPORTANT: Do NOT use visibility:hidden OR opacity:0 on this wrapper or any ancestor —
          both prevent html2canvas from rendering content (produces blank white PDF).
          Simply positioning off-screen with left:-9999px is enough to hide it from users. */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <InvoiceDoc f={f} innerRef={captureRef} />
      </div>

      {/* ── Top nav ── */}
      <div className="flex-shrink-0 border-b border-white/8 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition-colors text-sm">← Back</Link>
          <span className="text-white/15">|</span>
          <div className="flex items-center gap-2">
            <SlLogo size={28} />
            <span className="font-black text-sm tracking-tight">StaplerLabs</span>
            <span className="text-white/30 text-sm font-normal">Invoice Generator</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg p-1">
          {(["invoice", "order"] as DocMode[]).map((m) => (
            <button key={m} onClick={() => set("mode", m)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${f.mode === m ? "bg-yellow-400 text-black" : "text-white/40 hover:text-white"}`}>
              {m === "invoice" ? "📄 Invoice" : "📦 Order"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── FORM ── */}
        <div className="w-[400px] flex-shrink-0 overflow-y-auto border-r border-white/8 p-5 space-y-5">

          {/* Your Details */}
          <div>
            <p className={lbl}>Your Details</p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className={lbl}>Name</label><input className={inp} value={f.fromName} onChange={(e) => set("fromName", e.target.value)} /></div>
                <div><label className={lbl}>Email</label><input className={inp} value={f.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={lbl}>Phone</label><input className={inp} value={f.fromPhone} onChange={(e) => set("fromPhone", e.target.value)} /></div>
                <div><label className={lbl}>GST / PAN</label><input className={inp} placeholder="Optional" value={f.fromGST} onChange={(e) => set("fromGST", e.target.value)} /></div>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/8" />

          {/* Client */}
          <div>
            <p className={lbl}>Client Details</p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className={lbl}>Client Name</label><input className={inp} placeholder="e.g. Apex Dental Care" value={f.clientName} onChange={(e) => set("clientName", e.target.value)} /></div>
                <div><label className={lbl}>Email</label><input className={inp} placeholder="Optional" value={f.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} /></div>
              </div>
              <div><label className={lbl}>Address</label><input className={inp} placeholder="e.g. Model Town, Rohtak" value={f.clientAddress} onChange={(e) => set("clientAddress", e.target.value)} /></div>
            </div>
          </div>

          <div className="h-px bg-white/8" />

          {/* Doc meta */}
          <div>
            <p className={lbl}>{f.mode === "invoice" ? "Invoice Details" : "Order Details"}</p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className={lbl}>{f.mode === "invoice" ? "Invoice No." : "Order No."}</label>
                  <input className={inp} placeholder={f.mode === "invoice" ? "INV-001" : "ORD-001"} value={f.docNumber} onChange={(e) => set("docNumber", e.target.value)} /></div>
                <div><label className={lbl}>Date</label><input type="date" className={inp} value={f.docDate} onChange={(e) => set("docDate", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={lbl}>{f.mode === "invoice" ? "Due Date" : "Est. Delivery"}</label>
                  <input type="date" className={inp} value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
                {f.mode === "order" && (
                  <div><label className={lbl}>Status</label>
                    <select className={inp} value={f.orderStatus} onChange={(e) => set("orderStatus", e.target.value as OrderStatus)}>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                    </select></div>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-white/8" />

          {/* Line items */}
          <div>
            <p className={lbl}>Line Items</p>
            <div className="grid grid-cols-[1fr_52px_76px_26px] gap-1.5 mb-1 px-0.5">
              {["Description", "Qty", "Rate ₹", ""].map((h, i) => (
                <span key={i} className="text-[9px] font-bold uppercase tracking-widest text-white/20">{h}</span>
              ))}
            </div>
            <div className="space-y-1.5">
              {f.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_52px_76px_26px] gap-1.5 items-center">
                  <input className={inp} placeholder="Item description" value={item.description} onChange={(e) => setItem(item.id, "description", e.target.value)} />
                  <input className={inp + " text-right"} type="number" min="0" value={item.qty} onChange={(e) => setItem(item.id, "qty", e.target.value)} />
                  <input className={inp + " text-right"} type="number" min="0" placeholder="0" value={item.rate} onChange={(e) => setItem(item.id, "rate", e.target.value)} />
                  <button onClick={() => removeItem(item.id)} className="h-9 w-6 flex items-center justify-center rounded text-white/20 hover:text-red-400 transition-colors text-lg">×</button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 w-full py-2 border border-dashed border-white/10 rounded-lg text-xs text-white/30 hover:border-yellow-400 hover:text-yellow-400 transition-colors">
              + Add Item
            </button>
          </div>

          <div className="h-px bg-white/8" />

          {/* Discount */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className={lbl + " mb-0"}>Discount</p>
              <div onClick={() => set("discountEnabled", !f.discountEnabled)}>{toggle(f.discountEnabled)}</div>
            </div>
            {f.discountEnabled && (
              <div className="grid grid-cols-2 gap-2">
                <div><label className={lbl}>Type</label>
                  <select className={inp} value={f.discountType} onChange={(e) => set("discountType", e.target.value as DiscountType)}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select></div>
                <div><label className={lbl}>{f.discountType === "percent" ? "Percent %" : "Amount ₹"}</label>
                  <input className={inp} type="number" min="0" placeholder={f.discountType === "percent" ? "10" : "500"} value={f.discountValue} onChange={(e) => set("discountValue", e.target.value)} /></div>
              </div>
            )}
          </div>

          {/* GST */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className={lbl + " mb-0"}>GST</p>
              <div onClick={() => set("gstEnabled", !f.gstEnabled)}>{toggle(f.gstEnabled)}</div>
            </div>
            {f.gstEnabled && (
              <div><label className={lbl}>Rate (%)</label>
                <input className={inp} type="number" min="0" max="100" value={f.gstRate} onChange={(e) => set("gstRate", e.target.value)} /></div>
            )}
          </div>

          <div className="h-px bg-white/8" />

          {/* Totals */}
          <div className="bg-white/3 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-white/40"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            {f.discountEnabled && discountAmt > 0 && <div className="flex justify-between text-red-400"><span>Discount</span><span>– {formatINR(discountAmt)}</span></div>}
            {f.gstEnabled && parseFloat(f.gstRate) > 0 && <div className="flex justify-between text-white/40"><span>GST ({f.gstRate}%)</span><span>{formatINR(gstAmt)}</span></div>}
            <div className="flex justify-between font-black text-base text-yellow-400 pt-2 border-t border-white/10">
              <span>Total</span><span>{formatINR(grand)}</span>
            </div>
          </div>

          <div className="h-px bg-white/8" />

          {/* Notes & Payment */}
          <div className="space-y-3">
            <p className={lbl}>Notes & Payment</p>
            <div><label className={lbl}>Notes</label>
              <textarea className={inp + " min-h-[60px] resize-y"} placeholder="Thank you for choosing StaplerLabs!" value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
            <div><label className={lbl}>Payment Details</label>
              <textarea className={inp + " min-h-[60px] resize-y"} placeholder={"UPI: gautam.robin333-8@okaxis"} value={f.payment} onChange={(e) => set("payment", e.target.value)} /></div>
          </div>

          <div className="h-px bg-white/8" />

          {/* QR toggle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className={lbl + " mb-0"}>UPI QR Code on Invoice</p>
              <div onClick={() => set("showQR", !f.showQR)}>{toggle(f.showQR)}</div>
            </div>
            {f.showQR && (
              <div><label className={lbl}>UPI ID</label>
                <input className={inp} value={f.upiId} onChange={(e) => set("upiId", e.target.value)} placeholder="yourname@upi" /></div>
            )}
          </div>

          {/* Download */}
          <button onClick={handleDownload} disabled={generating}
            className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 disabled:cursor-wait text-black font-black text-sm rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0">
            {generating ? "⏳ Generating PDF…" : "⬇ Download PDF"}
          </button>
          <div className="h-4" />
        </div>

        {/* ── LIVE PREVIEW ── */}
        <div className="flex-1 overflow-auto bg-[#111] p-8 flex flex-col items-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-5">Live Preview</p>
          <div style={{ transform: "scale(0.72)", transformOrigin: "top center", marginBottom: "-230px" }}>
            <InvoiceDoc f={f} />
          </div>
        </div>
      </div>
    </div>
  );
}
