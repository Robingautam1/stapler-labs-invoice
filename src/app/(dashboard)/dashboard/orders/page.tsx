"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Order {
    id: string;
    order_number: string;
    status: string;
    priority: string;
    total_amount: number;
    created_at: string;
    client: { company_name: string } | null;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [search, setSearch] = useState("");
    const limit = 15;

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        let query = supabase
            .from("orders")
            .select("id, order_number, status, priority, total_amount, created_at, client:clients(company_name)", { count: "exact" })
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (statusFilter) query = query.eq("status", statusFilter);
        if (priorityFilter) query = query.eq("priority", priorityFilter);
        if (search) query = query.ilike("order_number", `%${search}%`);

        const { data, count: total } = await query;
        setOrders((data as unknown as Order[]) || []);
        setCount(total || 0);
        setLoading(false);
    }, [page, statusFilter, priorityFilter, search]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const statusColors: Record<string, string> = {
        draft: "bg-gray-500/20 text-gray-400",
        confirmed: "bg-blue-500/20 text-blue-400",
        in_production: "bg-purple-500/20 text-purple-400",
        dispatched: "bg-orange-500/20 text-orange-400",
        delivered: "bg-green-500/20 text-green-400",
        closed: "bg-white/10 text-white/40",
    };

    const priorityBadge: Record<string, string> = {
        urgent: "bg-orange-500/15 text-orange-400 border-orange-500/20",
        critical: "bg-red-500/15 text-red-400 border-red-500/20",
    };

    const formatINR = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0 });
    const totalPages = Math.ceil(count / limit);

    return (
        <div className="p-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Orders</h1>
                    <p className="text-white/40 text-sm mt-1">{count} total orders</p>
                </div>
                <Link
                    href="/dashboard/orders/new"
                    className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                    + New Order
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
                <input
                    type="text"
                    placeholder="Search order number..."
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
                    {["draft", "confirmed", "in_production", "dispatched", "delivered", "closed"].map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                </select>
                <select
                    value={priorityFilter}
                    onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                    className="bg-white/[0.05] border border-white/10 rounded-lg text-sm px-3 py-2 text-white outline-none focus:border-yellow-400 transition-colors"
                >
                    <option value="">All Priorities</option>
                    {["normal", "urgent", "critical"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            {["Order #", "Client", "Status", "Priority", "Amount", "Date"].map((h) => (
                                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-white/30">Loading...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-white/30">No orders found</td></tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                    <td className="px-4 py-3">
                                        <Link href={`/dashboard/orders/${order.id}`} className="text-sm font-medium text-yellow-400 hover:underline">
                                            {order.order_number}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white/60">
                                        {order.client?.company_name || "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${statusColors[order.status]}`}>
                                            {order.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {order.priority !== "normal" && (
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${priorityBadge[order.priority]}`}>
                                                {order.priority}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold">{formatINR(Number(order.total_amount))}</td>
                                    <td className="px-4 py-3 text-xs text-white/30">
                                        {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-white/30">
                        Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, count)} of {count}
                    </span>
                    <div className="flex gap-1">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30">
                            ← Prev
                        </button>
                        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-white/50 hover:bg-white/10 disabled:opacity-30">
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
