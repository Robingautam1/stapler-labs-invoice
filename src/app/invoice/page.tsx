"use client";

import { useState, useRef, useCallback } from "react";
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
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function formatINR(n: number) {
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function dueIn30() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

function fmtDate(str: string) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function newItem(): LineItem {
  return { id: uid(), description: "", qty: "1", rate: "" };
}

/* ─────────────────────────────────────────────
   DEFAULT STATE
───────────────────────────────────────────── */
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
  docDate: today(),
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
};

/* ─────────────────────────────────────────────
   INVOICE PREVIEW COMPONENT (captured by html2canvas)
───────────────────────────────────────────── */
function InvoicePreview({
  f,
  previewRef,
}: {
  f: FormData;
  previewRef: React.RefObject<HTMLDivElement | null>;
}) {
  const subtotal = f.items.reduce((s, item) => {
    return s + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
  }, 0);

  let discountAmount = 0;
  if (f.discountEnabled && f.discountValue) {
    if (f.discountType === "percent") {
      discountAmount = subtotal * (parseFloat(f.discountValue) / 100);
    } else {
      discountAmount = parseFloat(f.discountValue) || 0;
    }
  }

  const afterDiscount = subtotal - discountAmount;
  const gstAmt = f.gstEnabled
    ? afterDiscount * ((parseFloat(f.gstRate) || 0) / 100)
    : 0;
  const grand = afterDiscount + gstAmt;

  const isOrder = f.mode === "order";

  return (
    <div
      ref={previewRef}
      style={{
        width: "794px",
        minHeight: "1123px",
        background: "#ffffff",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: "#1a1a1a",
        fontSize: "13px",
        lineHeight: "1.5",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Yellow top bar */}
      <div style={{ height: "10px", background: "#F5C842" }} />

      {/* Main content */}
      <div style={{ padding: "40px 48px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "900", color: "#0A0A0A", letterSpacing: "-0.5px" }}>
              {f.fromName || "StaplerLabs"}
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
              {[f.fromEmail, f.fromPhone, f.fromGST ? `GST: ${f.fromGST}` : ""]
                .filter(Boolean)
                .join("  ·  ")}
            </div>
            {isOrder && (
              <div style={{ marginTop: "10px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 14px",
                    borderRadius: "100px",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background: f.orderStatus === "confirmed" ? "#E8F5E9" : "#FFF9E6",
                    color: f.orderStatus === "confirmed" ? "#2E7D32" : "#A67C00",
                  }}
                >
                  {f.orderStatus === "confirmed" ? "✓ Confirmed" : "⏳ Pending"}
                </span>
              </div>
            )}
          </div>
          <div
            style={{
              background: "#0A0A0A",
              color: "#F5C842",
              fontSize: "11px",
              fontWeight: "800",
              padding: "7px 18px",
              borderRadius: "5px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {isOrder ? "Order Confirmation" : "Invoice"}
          </div>
        </div>

        {/* Yellow divider */}
        <div style={{ height: "3px", background: "#F5C842", borderRadius: "2px", marginBottom: "28px" }} />

        {/* Meta row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "28px" }}>
          {[
            { label: isOrder ? "Order No." : "Invoice No.", value: f.docNumber || (isOrder ? "ORD-001" : "INV-001"), large: true },
            { label: isOrder ? "Order Date" : "Invoice Date", value: fmtDate(f.docDate) },
            { label: isOrder ? "Est. Delivery" : "Due Date", value: fmtDate(f.dueDate) },
          ].map((m, i) => (
            <div key={i}>
              <div style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#999", marginBottom: "4px" }}>
                {m.label}
              </div>
              <div style={{ fontSize: m.large ? "18px" : "13px", fontWeight: m.large ? "800" : "500", color: "#0A0A0A" }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Client block */}
        <div style={{ background: "#F8F8F8", borderRadius: "8px", padding: "16px 20px", marginBottom: "28px" }}>
          <div style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#999", marginBottom: "6px" }}>
            {isOrder ? "Order For" : "Billed To"}
          </div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#0A0A0A", marginBottom: "2px" }}>
            {f.clientName || "—"}
          </div>
          {f.clientEmail && <div style={{ fontSize: "12px", color: "#666" }}>{f.clientEmail}</div>}
          {f.clientAddress && <div style={{ fontSize: "12px", color: "#666" }}>{f.clientAddress}</div>}
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr style={{ background: "#0A0A0A" }}>
              {["Description", "Qty", "Rate", "Amount"].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: "10px 14px",
                    textAlign: i === 0 ? "left" : "right",
                    fontSize: "9px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#F5C842",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {f.items.map((item, idx) => {
              const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
              return (
                <tr key={item.id} style={{ background: idx % 2 === 1 ? "#FAFAFA" : "#fff", borderBottom: "1px solid #F0F0F0" }}>
                  <td style={{ padding: "11px 14px", fontSize: "13px", color: "#333" }}>
                    {item.description || <span style={{ color: "#ccc" }}>—</span>}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", textAlign: "right", color: "#555" }}>
                    {item.qty || 0}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", textAlign: "right", color: "#555" }}>
                    {item.rate ? formatINR(parseFloat(item.rate)) : "₹0.00"}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", textAlign: "right", fontWeight: "700", color: "#0A0A0A" }}>
                    {formatINR(amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "260px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "13px", color: "#666" }}>
              <span>Subtotal</span><span>{formatINR(subtotal)}</span>
            </div>
            {f.discountEnabled && discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "13px", color: "#666" }}>
                <span>Discount {f.discountType === "percent" ? `(${f.discountValue}%)` : ""}</span>
                <span style={{ color: "#E53935" }}>– {formatINR(discountAmount)}</span>
              </div>
            )}
            {f.gstEnabled && parseFloat(f.gstRate) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "13px", color: "#666" }}>
                <span>GST ({f.gstRate}%)</span><span>{formatINR(gstAmt)}</span>
              </div>
            )}
            <div style={{ borderTop: "2px solid #0A0A0A", marginTop: "8px", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "800", color: "#0A0A0A" }}>
              <span>Total</span>
              <span style={{ color: "#F5C842" }}>{formatINR(grand)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {f.notes && (
          <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #ECECEC" }}>
            <div style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#999", marginBottom: "6px" }}>Notes</div>
            <div style={{ fontSize: "12px", color: "#555", whiteSpace: "pre-line" }}>{f.notes}</div>
          </div>
        )}

        {/* Payment */}
        {f.payment && (
          <div style={{ marginTop: "16px", padding: "16px 18px", background: "#FFF9E6", borderRadius: "6px", borderLeft: "4px solid #F5C842" }}>
            <div style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: "6px" }}>Payment Details</div>
            <div style={{ fontSize: "12px", color: "#333", whiteSpace: "pre-line" }}>{f.payment}</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          background: "#0A0A0A",
          padding: "14px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "10px", color: "#888" }}>
          {f.fromName} · {f.fromEmail}
        </span>
        <span style={{ fontSize: "10px", color: "#555" }}>staplerlabs.com</span>
      </div>
      <div style={{ height: "6px", background: "#F5C842" }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function InvoicePage() {
  const [f, setF] = useState<FormData>(defaults);
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  /* ── field helpers ── */
  const set = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setF((prev) => ({ ...prev, [key]: val }));
  }, []);

  const setItem = useCallback((id: string, key: keyof LineItem, val: string) => {
    setF((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, [key]: val } : it)),
    }));
  }, []);

  const addItem = () => setF((p) => ({ ...p, items: [...p.items, newItem()] }));
  const removeItem = (id: string) =>
    setF((p) => ({ ...p, items: p.items.length > 1 ? p.items.filter((it) => it.id !== id) : p.items }));

  /* ── computed totals ── */
  const subtotal = f.items.reduce(
    (s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0),
    0
  );
  const discountAmount =
    f.discountEnabled && f.discountValue
      ? f.discountType === "percent"
        ? subtotal * (parseFloat(f.discountValue) / 100)
        : parseFloat(f.discountValue) || 0
      : 0;
  const afterDiscount = subtotal - discountAmount;
  const gstAmt = f.gstEnabled ? afterDiscount * ((parseFloat(f.gstRate) || 0) / 100) : 0;
  const grand = afterDiscount + gstAmt;

  /* ── PDF generation ── */
  const handleDownload = async () => {
    if (!previewRef.current || generating) return;
    setGenerating(true);
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pdfW;

      if (imgH <= pdfH) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, imgH);
      } else {
        // Multi-page: slice canvas into A4-height chunks
        const pageHeightPx = (pdfH / pdfW) * canvas.width;
        let offsetY = 0;
        let first = true;
        while (offsetY < canvas.height) {
          const sliceH = Math.min(pageHeightPx, canvas.height - offsetY);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          const ctx = pageCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, -offsetY);
          if (!first) pdf.addPage();
          pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, (sliceH / canvas.width) * pdfW);
          offsetY += pageHeightPx;
          first = false;
        }
      }

      const isOrder = f.mode === "order";
      const docNum = f.docNumber || (isOrder ? "ORD-001" : "INV-001");
      const clientSlug = (f.clientName || "Client").replace(/[^a-z0-9]/gi, "_");
      pdf.save(`${isOrder ? "Order" : "Invoice"}-${docNum}-${clientSlug}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  /* ── shared input class ── */
  const inp =
    "w-full bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20";
  const lbl = "block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Top nav */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
            ← Back
          </Link>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-yellow-400 rounded-md flex items-center justify-center text-black text-xs font-black">SL</div>
            <span className="font-bold text-sm">Invoice Generator</span>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {(["invoice", "order"] as DocMode[]).map((m) => (
            <button
              key={m}
              onClick={() => set("mode", m)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                f.mode === m ? "bg-yellow-400 text-black" : "text-white/50 hover:text-white"
              }`}
            >
              {m === "invoice" ? "📄 Invoice" : "📦 Order Confirmation"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-0 h-[calc(100vh-57px)]">
        {/* ── FORM PANEL ── */}
        <div className="w-[420px] flex-shrink-0 overflow-y-auto border-r border-white/10 p-5 space-y-4">

          {/* Your Details */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Your Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Business Name</label>
                  <input className={inp} value={f.fromName} onChange={(e) => set("fromName", e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Email</label>
                  <input className={inp} value={f.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Phone</label>
                  <input className={inp} value={f.fromPhone} onChange={(e) => set("fromPhone", e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>GST / PAN</label>
                  <input className={inp} placeholder="Optional" value={f.fromGST} onChange={(e) => set("fromGST", e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-white/8" />

          {/* Client */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Client Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Client Name</label>
                  <input className={inp} placeholder="e.g. Apex Dental Care" value={f.clientName} onChange={(e) => set("clientName", e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Client Email</label>
                  <input className={inp} placeholder="Optional" value={f.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={lbl}>Address / City</label>
                <input className={inp} placeholder="e.g. Model Town, Rohtak" value={f.clientAddress} onChange={(e) => set("clientAddress", e.target.value)} />
              </div>
            </div>
          </section>

          <div className="border-t border-white/8" />

          {/* Doc details */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
              {f.mode === "invoice" ? "Invoice Details" : "Order Details"}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>{f.mode === "invoice" ? "Invoice No." : "Order No."}</label>
                  <input className={inp} placeholder={f.mode === "invoice" ? "INV-001" : "ORD-001"} value={f.docNumber} onChange={(e) => set("docNumber", e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>{f.mode === "invoice" ? "Invoice Date" : "Order Date"}</label>
                  <input type="date" className={inp} value={f.docDate} onChange={(e) => set("docDate", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>{f.mode === "invoice" ? "Due Date" : "Est. Delivery"}</label>
                  <input type="date" className={inp} value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
                </div>
                {f.mode === "order" && (
                  <div>
                    <label className={lbl}>Order Status</label>
                    <select className={inp} value={f.orderStatus} onChange={(e) => set("orderStatus", e.target.value as OrderStatus)}>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="border-t border-white/8" />

          {/* Line Items */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Line Items</h3>

            {/* Header */}
            <div className="grid grid-cols-[1fr_56px_80px_28px] gap-1.5 mb-1 px-1">
              {["Description", "Qty", "Rate (₹)", ""].map((h, i) => (
                <span key={i} className="text-[9px] font-bold uppercase tracking-widest text-white/20">
                  {h}
                </span>
              ))}
            </div>

            <div className="space-y-1.5">
              {f.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_56px_80px_28px] gap-1.5 items-center">
                  <input
                    className={inp}
                    placeholder="e.g. Website Development"
                    value={item.description}
                    onChange={(e) => setItem(item.id, "description", e.target.value)}
                  />
                  <input
                    className={inp + " text-right"}
                    type="number"
                    min="0"
                    value={item.qty}
                    onChange={(e) => setItem(item.id, "qty", e.target.value)}
                  />
                  <input
                    className={inp + " text-right"}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={item.rate}
                    onChange={(e) => setItem(item.id, "rate", e.target.value)}
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-7 h-7 rounded-md border border-white/10 text-white/30 hover:border-red-400 hover:text-red-400 transition-colors text-base flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="mt-2 w-full py-2 border border-dashed border-white/15 rounded-lg text-sm text-white/40 hover:border-yellow-400 hover:text-yellow-400 transition-colors"
            >
              + Add Item
            </button>
          </section>

          <div className="border-t border-white/8" />

          {/* Discount */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Discount</h3>
              <button
                onClick={() => set("discountEnabled", !f.discountEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  f.discountEnabled ? "bg-yellow-400" : "bg-white/15"
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${f.discountEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {f.discountEnabled && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Type</label>
                  <select className={inp} value={f.discountType} onChange={(e) => set("discountType", e.target.value as DiscountType)}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>{f.discountType === "percent" ? "Discount %" : "Amount (₹)"}</label>
                  <input
                    className={inp}
                    type="number"
                    min="0"
                    placeholder={f.discountType === "percent" ? "e.g. 10" : "e.g. 500"}
                    value={f.discountValue}
                    onChange={(e) => set("discountValue", e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          {/* GST */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">GST</h3>
              <button
                onClick={() => set("gstEnabled", !f.gstEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  f.gstEnabled ? "bg-yellow-400" : "bg-white/15"
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${f.gstEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {f.gstEnabled && (
              <div>
                <label className={lbl}>GST Rate (%)</label>
                <input
                  className={inp}
                  type="number"
                  min="0"
                  max="100"
                  value={f.gstRate}
                  onChange={(e) => set("gstRate", e.target.value)}
                />
              </div>
            )}
          </section>

          <div className="border-t border-white/8" />

          {/* Totals summary */}
          <div className="bg-white/3 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-white/50">
              <span>Subtotal</span><span>{formatINR(subtotal)}</span>
            </div>
            {f.discountEnabled && discountAmount > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Discount {f.discountType === "percent" ? `(${f.discountValue}%)` : ""}</span>
                <span>– {formatINR(discountAmount)}</span>
              </div>
            )}
            {f.gstEnabled && parseFloat(f.gstRate) > 0 && (
              <div className="flex justify-between text-white/50">
                <span>GST ({f.gstRate}%)</span><span>{formatINR(gstAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-yellow-400 pt-2 border-t border-white/10">
              <span>Total</span><span>{formatINR(grand)}</span>
            </div>
          </div>

          <div className="border-t border-white/8" />

          {/* Notes & Payment */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Notes & Payment</h3>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Notes / Thank you message</label>
                <textarea
                  className={inp + " min-h-[70px] resize-y"}
                  placeholder="e.g. Thank you for choosing StaplerLabs!"
                  value={f.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Payment Details (Bank / UPI)</label>
                <textarea
                  className={inp + " min-h-[70px] resize-y"}
                  placeholder={"UPI: staplerlabs@upi\nBank: HDFC | A/C: 1234567890"}
                  value={f.payment}
                  onChange={(e) => set("payment", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={generating}
            className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 disabled:cursor-wait text-black font-black text-sm rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {generating ? "Generating PDF…" : "⬇ Download PDF"}
          </button>

          <div className="h-4" />
        </div>

        {/* ── PREVIEW PANEL ── */}
        <div className="flex-1 overflow-auto bg-[#111] flex items-start justify-center p-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-4 text-center">Live Preview</p>
            <div
              className="shadow-2xl"
              style={{ transform: "scale(0.85)", transformOrigin: "top center", marginBottom: "-150px" }}
            >
              <InvoicePreview f={f} previewRef={previewRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
