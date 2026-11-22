import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/store";
import { AppShell } from "@/components/navigation/AppShell";

const sans = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap", fallback: ["system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"] });

export const metadata: Metadata = {
  title: "ASAP — Know what matters. Know where to start.",
  description: "An AI-assisted personal productivity system that turns intention into progress.",
};
export const viewport: Viewport = { themeColor: "#252044" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={sans.variable}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink">
          Skip to content
        </a>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
