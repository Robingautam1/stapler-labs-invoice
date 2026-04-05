"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        email: "",
        password: "",
        full_name: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const supabase = createClient();

            if (isLogin) {
                const { error: loginErr } = await supabase.auth.signInWithPassword({
                    email: form.email,
                    password: form.password,
                });
                if (loginErr) throw loginErr;
            } else {
                const { error: signUpErr } = await supabase.auth.signUp({
                    email: form.email,
                    password: form.password,
                    options: { data: { full_name: form.full_name, role: "admin" } },
                });
                if (signUpErr) throw signUpErr;
            }

            router.push("/dashboard");
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-400/3 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <svg width="40" height="40" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <rect width="200" height="200" fill="#F0F0F0" rx="40" />
                            <rect x="22" y="134" width="156" height="30" rx="9" fill="#333" />
                            <path d="M 22 134 L 22 88 Q 22 72 38 68 L 140 62 Q 160 60 168 76 L 174 96 L 174 134 Z" fill="#555" />
                            <path d="M 22 88 Q 22 72 38 68 L 140 62 Q 160 60 168 76 L 168 90 L 22 90 Z" fill="#444" />
                            <circle cx="170" cy="112" r="20" fill="#F0F0F0" />
                            <circle cx="170" cy="112" r="20" fill="none" stroke="#C8A800" strokeWidth="4.5" />
                            <circle cx="170" cy="112" r="9.5" fill="#D4A800" />
                            <circle cx="170" cy="112" r="3.5" fill="#F0F0F0" />
                            <rect x="22" y="118" width="146" height="16" fill="#F0F0F0" />
                            <rect x="32" y="110" width="52" height="10" rx="5" fill="#D4A800" />
                            <rect x="32" y="110" width="10" height="32" rx="5" fill="#D4A800" />
                            <rect x="74" y="110" width="10" height="32" rx="5" fill="#D4A800" />
                        </svg>
                        <span className="text-2xl font-black text-white tracking-tight">StaplerLabs</span>
                    </div>
                    <p className="text-white/40 text-sm">Business Operations Platform</p>
                </div>

                {/* Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
                    {/* Tab toggle */}
                    <div className="flex bg-white/[0.05] rounded-xl p-1 mb-6">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${isLogin ? "bg-yellow-400 text-black" : "text-white/40 hover:text-white"
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isLogin ? "bg-yellow-400 text-black" : "text-white/40 hover:text-white"
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required={!isLogin}
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm px-4 py-3 outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20"
                                    placeholder="Robin Gautam"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm px-4 py-3 outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20"
                                placeholder="work@staplerlabs.com"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm px-4 py-3 outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 disabled:cursor-wait text-black font-black text-sm rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 mt-2"
                        >
                            {loading ? "Please wait…" : isLogin ? "Sign In →" : "Create Account →"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-white/20 text-xs mt-6">
                    © {new Date().getFullYear()} StaplerLabs. All rights reserved.
                </p>
            </div>
        </div>
    );
}
