import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice Generator",
  description:
    "Create professional invoices and order confirmations. Fill in the form and download a branded PDF in seconds.",
  openGraph: {
    title: "Invoice Generator | StaplerLabs",
    url: "https://staplerlabs.com/invoice",
    images: [{ url: "/og-image.png" }],
  },
  alternates: { canonical: "https://staplerlabs.com/invoice" },
};

export default function InvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
