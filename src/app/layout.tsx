import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/store";
import { AppShell } from "@/components/navigation/AppShell";

const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap", fallback: ["Georgia", "Times New Roman", "serif"] });

export const metadata: Metadata = {
  title: "ASAP — Know what matters. Know where to start.",
  description: "An AI-assisted personal productivity system that turns intention into progress.",
};
export const viewport: Viewport = { themeColor: "#252044" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={serif.variable}>
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
