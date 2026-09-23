import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { getUserContext } from "@/lib/draft";
import { signOut } from "./actions";
import { ListIcon, LogOutIcon, SettingsIcon, UsersIcon } from "./_components/Icons";
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

          <nav className="nav" aria-label="Main">
            <Link href="/" className="nav-link">
              <ListIcon size={14} /> Board
            </Link>
            {isOwner && (
              <Link href="/setup" className="nav-link">
                <SettingsIcon size={14} /> Setup
              </Link>
            )}
            {myTeamId && (
              <Link href="/account" className="nav-link">
                <UsersIcon size={14} /> My team
              </Link>
            )}
            {userId ? (
              <form action={signOut}>
                <button type="submit" className="btn-ghost btn-sm">
                  <LogOutIcon size={14} /> Sign out
                </button>
              </form>
            ) : (
              <Link href="/login" className="nav-link">Sign in</Link>
            )}
          </nav>
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
