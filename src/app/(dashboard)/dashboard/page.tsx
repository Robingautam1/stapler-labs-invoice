import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
    const supabase = await createClient();

    // Fetch dashboard stats
    const [ordersRes, invoicesRes, clientsRes, recentOrdersRes] = await Promise.all([
        supabase.from("orders").select("id, status, total_amount, priority", { count: "exact" }).eq("is_deleted", false),
        supabase.from("invoices").select("id, payment_status, total_amount, amount_due, amount_paid", { count: "exact" }).eq("is_deleted", false),
        supabase.from("clients").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("orders").select("id, order_number, status, priority, total_amount, created_at, client:clients(company_name)").eq("is_deleted", false).order("created_at", { ascending: false }).limit(5),
    ]);

    const orders = ordersRes.data || [];
    const invoices = invoicesRes.data || [];
    const totalClients = clientsRes.count || 0;
    const recentOrders = recentOrdersRes.data || [];

    // Calculate metrics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalRevenue = (invoices as any[]).reduce((sum: number, i: any) => sum + Number(i.amount_paid || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outstanding = (invoices as any[]).reduce((sum: number, i: any) => sum + Number(i.amount_due || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeOrders = (orders as any[]).filter((o: any) => !["delivered", "closed"].includes(o.status)).length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdueInvoices = (invoices as any[]).filter((i: any) => i.payment_status === "overdue").length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unpaidInvoices = (invoices as any[]).filter((i: any) => i.payment_status === "unpaid").length;

    const ordersByStatus: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orders as any[]).forEach((o: any) => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });

    const formatINR = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const statusColors: Record<string, string> = {
        draft: "bg-gray-500/20 text-gray-400",
        confirmed: "bg-blue-500/20 text-blue-400",
        in_production: "bg-purple-500/20 text-purple-400",
        dispatched: "bg-orange-500/20 text-orange-400",
        delivered: "bg-green-500/20 text-green-400",
        closed: "bg-white/10 text-white/40",
    };

    const priorityColors: Record<string, string> = {
        normal: "text-white/40",
        urgent: "text-orange-400",
        critical: "text-red-400",
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
                <p className="text-white/40 text-sm mt-1">Business overview at a glance</p>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Revenue", value: formatINR(totalRevenue), icon: "💰", color: "border-green-500/30", subtext: `${invoices.length} invoices` },
                    { label: "Outstanding", value: formatINR(outstanding), icon: "⏳", color: "border-yellow-500/30", subtext: `${unpaidInvoices} unpaid` },
                    { label: "Active Orders", value: activeOrders.toString(), icon: "📦", color: "border-blue-500/30", subtext: `${orders.length} total` },
                    { label: "Clients", value: totalClients.toString(), icon: "👥", color: "border-purple-500/30", subtext: overdueInvoices > 0 ? `${overdueInvoices} overdue invoices` : "All caught up" },
                ].map((card) => (
                    <div
                        key={card.label}
                        className={`bg-white/[0.03] border border-white/[0.06] ${card.color} rounded-xl p-5 hover:bg-white/[0.05] transition-colors`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{card.label}</p>
                                <p className="text-2xl font-black mt-1">{card.value}</p>
                                <p className="text-xs text-white/30 mt-1">{card.subtext}</p>
                            </div>
                            <span className="text-2xl">{card.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order pipeline */}
                <div className="lg:col-span-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                    <h3 className="text-sm font-bold mb-4">Order Pipeline</h3>
                    <div className="space-y-2">
                        {["draft", "confirmed", "in_production", "dispatched", "delivered", "closed"].map((status) => (
                            <div key={status} className="flex items-center justify-between">
                                <span className={`text-xs px-2 py-1 rounded-md ${statusColors[status]}`}>
                                    {status.replace("_", " ")}
                                </span>
                                <span className="text-sm font-bold">{ordersByStatus[status] || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent orders */}
                <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                    <h3 className="text-sm font-bold mb-4">Recent Orders</h3>
                    {recentOrders.length === 0 ? (
                        <p className="text-white/30 text-sm py-8 text-center">No orders yet. Create your first order to get started.</p>
                    ) : (
                        <div className="space-y-2">
                            {recentOrders.map((order) => (
                                <a
                                    key={order.id}
                                    href={`/dashboard/orders/${order.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-1 rounded-md ${statusColors[order.status]}`}>
                                            {order.status.replace("_", " ")}
                                        </span>
                                        <div>
                                            <span className="text-sm font-medium group-hover:text-yellow-400 transition-colors">
                                                {order.order_number}
                                            </span>
                                            <span className="text-xs text-white/30 ml-2">
                                                {(order.client as unknown as { company_name: string } | null)?.company_name}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs ${priorityColors[order.priority]}`}>
                                            {order.priority !== "normal" ? order.priority : ""}
                                        </span>
                                        <span className="text-sm font-bold">{formatINR(Number(order.total_amount))}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
