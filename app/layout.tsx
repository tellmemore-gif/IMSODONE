import type { Metadata } from "next";

import { EvidenceProvider } from "@/components/evidence/evidence-provider";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/ui/footer";
import { YearFilterProvider } from "@/components/year-filter/year-filter-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Who Funds Maxine Dexter?",
  description: "Investigative campaign finance archive focused on Maxine Dexter, 2023-2026."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <body className="bg-bg text-text">
        <div className="scanlines" />
        <YearFilterProvider>
          <EvidenceProvider>
            <div className="relative z-10 min-h-screen">
              <Navigation />
              <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</main>
              <Footer />
            </div>
          </EvidenceProvider>
        </YearFilterProvider>
      </body>
    </html>
  );
}
