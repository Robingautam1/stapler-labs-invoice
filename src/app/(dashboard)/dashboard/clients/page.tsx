"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Client {
    id: string;
    company_name: string;
    contact_person: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    gst_number: string | null;
    created_at: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        company_name: "", gst_number: "", billing_address: "", shipping_address: "",
        contact_person: "", contact_email: "", contact_phone: "",
    });
    const [saving, setSaving] = useState(false);
    const limit = 15;

    const fetchClients = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        let query = supabase
            .from("clients")
            .select("*", { count: "exact" })
            .eq("is_active", true)
            .order("company_name")
            .range((page - 1) * limit, page * limit - 1);

        if (search) {
            query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%,contact_email.ilike.%${search}%`);
        }

        const { data, count: total } = await query;
        setClients((data as Client[]) || []);
        setCount(total || 0);
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    const handleSave = async () => {
        if (!formData.company_name) return;
        setSaving(true);
        const supabase = createClient();
        const { error } = await supabase.from("clients").insert(formData);
        if (!error) {
            setShowForm(false);
            setFormData({ company_name: "", gst_number: "", billing_address: "", shipping_address: "", contact_person: "", contact_email: "", contact_phone: "" });
            fetchClients();
        }
        setSaving(false);
    };

    const totalPages = Math.ceil(count / limit);
    const inp = "w-full bg-white/[0.05] border border-white/10 rounded-lg text-sm px-3 py-2.5 text-white outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20";

    return (
        <div className="p-6 max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Clients</h1>
                    <p className="text-white/40 text-sm mt-1">{count} active clients</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                    {showForm ? "Cancel" : "+ New Client"}
                </button>
            </div>

            {/* New Client Form */}
            {showForm && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-5 space-y-3">
                    <h3 className="text-sm font-bold">Add New Client</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Company Name *</label>
                            <input className={inp} value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="e.g. Apex Dental Care" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">GST Number</label>
                            <input className={inp} value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} placeholder="Optional" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Contact Person</label>
                            <input className={inp} value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Email</label>
                            <input className={inp} type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Phone</label>
                            <input className={inp} value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Billing Address</label>
                            <input className={inp} value={formData.billing_address} onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })} />
                        </div>
                    </div>
                    <button onClick={handleSave} disabled={saving || !formData.company_name} className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition-all">
                        {saving ? "Saving…" : "Save Client"}
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="mb-5">
                <input
                    type="text"
                    placeholder="Search clients..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="bg-white/[0.05] border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20 w-72"
                />
            </div>

            {/* Table */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            {["Company", "Contact", "Email", "Phone", "GST", "Added"].map((h) => (
                                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-white/30">Loading...</td></tr>
                        ) : clients.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-white/30">No clients found</td></tr>
                        ) : (
                            clients.map((client) => (
                                <tr key={client.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                    <td className="px-4 py-3">
                                        <Link href={`/dashboard/clients/${client.id}`} className="text-sm font-medium text-yellow-400 hover:underline">{client.company_name}</Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white/60">{client.contact_person || "—"}</td>
                                    <td className="px-4 py-3 text-sm text-white/40">{client.contact_email || "—"}</td>
                                    <td className="px-4 py-3 text-sm text-white/40">{client.contact_phone || "—"}</td>
                                    <td className="px-4 py-3 text-xs text-white/30 font-mono">{client.gst_number || "—"}</td>
                                    <td className="px-4 py-3 text-xs text-white/20">
                                        {new Date(client.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-white/30">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, count)} of {count}</span>
                    <div className="flex gap-1">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30">← Prev</button>
                        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30">Next →</button>
                    </div>
                </div>
            )}
        </div>
    );
}
