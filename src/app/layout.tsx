import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { getUserContext } from "@/lib/draft";
import MainNav from "./_components/MainNav";
import TickerBanner from "./_components/TickerBanner";

// Bebas Neue for the scoreboard voice, Source Sans 3 for everything readable.
// next/font self-hosts both at build time -- no render-blocking Google request,
// and `display: swap` + the fallback stack keep text visible while they load.
const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const body = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "BMD Draft · Indiana Alpha",
  description: "Balanced Man Draft board — Sigma Phi Epsilon, Indiana Alpha.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0612",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId, isOwner, myTeamId } = await getUserContext();

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <header className="app-header">
          <Link href="/" className="brand" aria-label="BMD Draft home">
            <span className="brand-mark" aria-hidden="true">ΣΦΕ</span>
            <span className="brand-text">
              <span className="brand-title">BMD Draft</span>
              <span className="brand-sub">Indiana Alpha</span>
            </span>
          </Link>

          <span style={{ flex: 1 }} />

          <MainNav userId={userId} isOwner={isOwner} myTeamId={myTeamId} />
        </header>

        <TickerBanner />

        <main>{children}</main>

        <footer className="app-footer">
          Sigma Phi Epsilon · Indiana Alpha · Balanced Man Draft
        </footer>
      </body>
    </html>
  );
}
