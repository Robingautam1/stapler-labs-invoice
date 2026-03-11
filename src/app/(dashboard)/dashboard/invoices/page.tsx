"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Invoice {
    id: string;
    invoice_number: string;
    payment_status: string;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    issue_date: string;
    due_date: string;
    client: { company_name: string } | null;
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const limit = 15;

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        let query = supabase
            .from("invoices")
            .select("id, invoice_number, payment_status, total_amount, amount_paid, amount_due, issue_date, due_date, client:clients(company_name)", { count: "exact" })
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (statusFilter) query = query.eq("payment_status", statusFilter);
        if (search) query = query.ilike("invoice_number", `%${search}%`);

        const { data, count: total } = await query;
        setInvoices((data as unknown as Invoice[]) || []);
        setCount(total || 0);
        setLoading(false);
    }, [page, statusFilter, search]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const paymentStatusColors: Record<string, string> = {
        unpaid: "bg-red-500/20 text-red-400",
        partially_paid: "bg-yellow-500/20 text-yellow-400",
        paid: "bg-green-500/20 text-green-400",
        overdue: "bg-red-600/20 text-red-500",
    };

    const formatINR = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0 });
    const totalPages = Math.ceil(count / limit);

    return (
        <div className="p-6 max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Invoices</h1>
                    <p className="text-white/40 text-sm mt-1">{count} total invoices</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-5">
                <input
                    type="text"
                    placeholder="Search invoice number..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="bg-white/[0.05] border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20 w-56"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="bg-white/[0.05] border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-yellow-400 transition-colors"
                >
                    <option value="">All Statuses</option>
                    {["unpaid", "partially_paid", "paid", "overdue"].map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            {["Invoice #", "Client", "Status", "Total", "Paid", "Due", "Issue Date", "Due Date"].map((h) => (
                                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="px-4 py-12 text-center text-white/30">Loading...</td></tr>
                        ) : invoices.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-12 text-center text-white/30">No invoices found</td></tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                    <td className="px-4 py-3">
                                        <Link href={`/dashboard/invoices/${inv.id}`} className="text-sm font-medium text-yellow-400 hover:underline">
                                            {inv.invoice_number}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white/60">{inv.client?.company_name || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${paymentStatusColors[inv.payment_status]}`}>
                                            {inv.payment_status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold">{formatINR(Number(inv.total_amount))}</td>
                                    <td className="px-4 py-3 text-sm text-green-400">{formatINR(Number(inv.amount_paid))}</td>
                                    <td className="px-4 py-3 text-sm text-red-400">{formatINR(Number(inv.amount_due))}</td>
                                    <td className="px-4 py-3 text-xs text-white/30">
                                        {new Date(inv.issue_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-white/30">
                                        {new Date(inv.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-white/30">
                        Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, count)} of {count}
                    </span>
                    <div className="flex gap-1">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30">← Prev</button>
                        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30">Next →</button>
                    </div>
                </div>
            )}
        </div>
    );
}
