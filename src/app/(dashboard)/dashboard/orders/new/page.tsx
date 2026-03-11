"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Client { id: string; company_name: string; }

export default function NewOrderPage() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        client_id: "",
        priority: "normal" as "normal" | "urgent" | "critical",
        estimated_delivery: "",
        internal_notes: "",
        discount_type: "" as "" | "percent" | "fixed",
        discount_value: 0,
        tax_rate: 18,
        items: [{ product_name: "", sku: "", quantity: 1, unit_price: 0, tax_rate: 0, discount_percent: 0 }],
    });

    const fetchClients = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase.from("clients").select("id, company_name").eq("is_active", true).order("company_name");
        setClients(data || []);
    }, []);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    const addItem = () => {
        setForm({ ...form, items: [...form.items, { product_name: "", sku: "", quantity: 1, unit_price: 0, tax_rate: 0, discount_percent: 0 }] });
    };

    const removeItem = (idx: number) => {
        if (form.items.length <= 1) return;
        setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
    };

    const updateItem = (idx: number, key: string, value: string | number) => {
        const items = [...form.items];
        items[idx] = { ...items[idx], [key]: value };
        setForm({ ...form, items });
    };

    // Calculate totals
    const subtotal = form.items.reduce((sum, item) => {
        return sum + item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100);
    }, 0);
    const discountAmount = form.discount_type === "percent"
        ? subtotal * (form.discount_value / 100)
        : form.discount_type === "fixed" ? form.discount_value : 0;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (form.tax_rate / 100);
    const total = afterDiscount + taxAmount;

    const formatINR = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.client_id) { setError("Please select a client"); return; }
        if (form.items.some(i => !i.product_name || i.unit_price <= 0)) { setError("All items need a name and price"); return; }

        setSaving(true);
        setError("");

        try {
            const res = await fetch("/api/v1/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    discount_type: form.discount_type || null,
                }),
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error?.message || "Failed to create order");

            router.push(`/dashboard/orders/${data.data.id}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create order");
        } finally {
            setSaving(false);
        }
    };

    const inp = "w-full bg-white/[0.05] border border-white/10 rounded-lg text-sm px-3 py-2.5 text-white outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20";
    const lbl = "block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1";

    return (
        <div className="p-6 max-w-4xl">
            <h1 className="text-2xl font-black tracking-tight mb-6">New Order</h1>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client & Priority */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold">Order Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Client *</label>
                            <select className={inp} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                                <option value="">Select client...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Priority</label>
                            <select className={inp} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "normal" | "urgent" | "critical" })}>
                                <option value="normal">Normal</option>
                                <option value="urgent">Urgent</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Est. Delivery</label>
                            <input type="date" className={inp} value={form.estimated_delivery} onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })} />
                        </div>
                        <div>
                            <label className={lbl}>GST Rate (%)</label>
                            <input type="number" className={inp} value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Internal Notes</label>
                        <textarea className={inp + " min-h-[60px]"} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} placeholder="Private notes..." />
                    </div>
                </div>

                {/* Line Items */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-bold">Line Items</h3>
                    <div className="grid grid-cols-[1fr_80px_60px_100px_30px] gap-2 text-[9px] font-bold uppercase tracking-widest text-white/30 px-1">
                        <span>Product</span><span>SKU</span><span>Qty</span><span>Price ₹</span><span></span>
                    </div>
                    {form.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_80px_60px_100px_30px] gap-2 items-center">
                            <input className={inp} placeholder="Product name" value={item.product_name} onChange={(e) => updateItem(idx, "product_name", e.target.value)} />
                            <input className={inp} placeholder="SKU" value={item.sku} onChange={(e) => updateItem(idx, "sku", e.target.value)} />
                            <input type="number" min="1" className={inp + " text-right"} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                            <input type="number" min="0" className={inp + " text-right"} value={item.unit_price || ""} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} placeholder="0" />
                            <button type="button" onClick={() => removeItem(idx)} className="h-9 w-6 flex items-center justify-center rounded text-white/20 hover:text-red-400 text-lg">×</button>
                        </div>
                    ))}
                    <button type="button" onClick={addItem} className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs text-white/30 hover:border-yellow-400 hover:text-yellow-400 transition-colors">
                        + Add Item
                    </button>
                </div>

                {/* Totals */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                    <div className="w-64 ml-auto space-y-1.5 text-sm">
                        <div className="flex justify-between text-white/40"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
                        {discountAmount > 0 && <div className="flex justify-between text-red-400"><span>Discount</span><span>– {formatINR(discountAmount)}</span></div>}
                        {form.tax_rate > 0 && <div className="flex justify-between text-white/40"><span>GST ({form.tax_rate}%)</span><span>{formatINR(taxAmount)}</span></div>}
                        <div className="flex justify-between font-black text-lg text-yellow-400 pt-2 border-t border-white/10">
                            <span>Total</span><span>{formatINR(total)}</span>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={saving} className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-black font-black text-sm rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0">
                    {saving ? "⏳ Creating Order…" : "✓ Create Order"}
                </button>
            </form>
        </div>
    );
}
