import type { Metadata } from "next";
import { Syne, Roboto_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "StaplerLabs | We run your digital office",
    template: "%s | StaplerLabs"
  },
  description: "Web. Automation. Onboarding. SEO. Ads. All of it. So you can do the thing you're actually good at.",
  keywords: ["Digital agency", "Web development", "Business automation", "SEO", "Ads", "StaplerLabs"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "StaplerLabs | We run your digital office",
    description: "Web. Automation. Onboarding. SEO. Ads. All of it. So you can do the thing you're actually good at.",
    url: "https://staplerlabs.com",
    siteName: "StaplerLabs",
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${syne.variable} ${robotoMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Navbar />
        {children}
        <Footer />
        <FloatingWhatsApp />
      </body>
    </html>
  );
}
