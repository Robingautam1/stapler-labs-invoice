"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface DashboardShellProps {
    user: { id: string; email: string; full_name: string; role: string };
    children: React.ReactNode;
}

const NAV_ITEMS = [
    { href: "/dashboard", icon: "📊", label: "Dashboard", roles: ["admin", "staff", "client"] },
    { href: "/dashboard/orders", icon: "📦", label: "Orders", roles: ["admin", "staff", "client"] },
    { href: "/dashboard/invoices", icon: "📄", label: "Invoices", roles: ["admin", "staff", "client"] },
    { href: "/dashboard/clients", icon: "👥", label: "Clients", roles: ["admin", "staff"] },
    { href: "/dashboard/reports", icon: "📈", label: "Reports", roles: ["admin"] },
    { href: "/dashboard/audit-logs", icon: "🔒", label: "Audit Logs", roles: ["admin"] },
];

export function DashboardShell({ user, children }: DashboardShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    const visibleNavItems = NAV_ITEMS.filter((item) =>
        item.roles.includes(user.role)
    );

    const roleBadgeColor = {
        admin: "bg-red-500/20 text-red-400 border-red-500/30",
        staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        client: "bg-green-500/20 text-green-400 border-green-500/30",
    }[user.role] || "bg-white/10 text-white/60";

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex">
            {/* Sidebar */}
            <aside
                className={`${collapsed ? "w-[68px]" : "w-[240px]"
                    } flex-shrink-0 border-r border-white/[0.06] flex flex-col transition-all duration-300 bg-[#0A0A0A]`}
            >
                {/* Logo area */}
                <div className="h-14 flex items-center px-4 border-b border-white/[0.06] gap-2.5">
                    <svg width="28" height="28" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                        <rect width="200" height="200" fill="#F0F0F0" rx="40" />
                        <rect x="22" y="134" width="156" height="30" rx="9" fill="#333" />
                        <path d="M 22 134 L 22 88 Q 22 72 38 68 L 140 62 Q 160 60 168 76 L 174 96 L 174 134 Z" fill="#555" />
                        <circle cx="170" cy="112" r="20" fill="#F0F0F0" />
                        <circle cx="170" cy="112" r="20" fill="none" stroke="#C8A800" strokeWidth="4.5" />
                        <circle cx="170" cy="112" r="9.5" fill="#D4A800" />
                        <circle cx="170" cy="112" r="3.5" fill="#F0F0F0" />
                        <rect x="22" y="118" width="146" height="16" fill="#F0F0F0" />
                        <rect x="32" y="110" width="52" height="10" rx="5" fill="#D4A800" />
                        <rect x="32" y="110" width="10" height="32" rx="5" fill="#D4A800" />
                        <rect x="74" y="110" width="10" height="32" rx="5" fill="#D4A800" />
                    </svg>
                    {!collapsed && (
                        <span className="font-black text-sm tracking-tight whitespace-nowrap">
                            StaplerLabs
                        </span>
                    )}
                </div>

                {/* Nav items */}
                <nav className="flex-1 py-3 px-2 space-y-0.5">
                    {visibleNavItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                                        : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                                    }`}
                            >
                                <span className="text-base flex-shrink-0">{item.icon}</span>
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}

                    <div className="pt-2">
                        <Link
                            href="/invoice"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.04] transition-all"
                        >
                            <span className="text-base flex-shrink-0">✏️</span>
                            {!collapsed && <span>Invoice Generator</span>}
                        </Link>
                    </div>
                </nav>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="mx-2 mb-2 p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all text-xs"
                >
                    {collapsed ? "→" : "← Collapse"}
                </button>

                {/* User info */}
                <div className="border-t border-white/[0.06] p-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-xs flex-shrink-0">
                            {user.full_name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{user.full_name || user.email}</div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${roleBadgeColor}`}>
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <button
                            onClick={handleLogout}
                            className="mt-3 w-full text-xs text-white/30 hover:text-red-400 transition-colors py-1.5 rounded-lg hover:bg-red-500/5"
                        >
                            Sign Out
                        </button>
                    )}
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
