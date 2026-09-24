"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "../actions";
import {
  ListIcon, SwordsIcon, CalendarIcon, ChartIcon,
  SettingsIcon, UsersIcon, LogOutIcon,
} from "./Icons";

// Main nav. Client-side so it can mark the active route via usePathname; the
// links it shows depend on the flags the server layout passes in.
export default function MainNav({
  userId, isOwner, myTeamId,
}: {
  userId: string | null;
  isOwner: boolean;
  myTeamId: string | null;
}) {
  const path = usePathname();
  const link = (href: string) =>
    "nav-link" + ((href === "/" ? path === "/" : path.startsWith(href)) ? " active" : "");

  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" className={link("/")}><ListIcon size={14} /> Board</Link>
      <Link href="/matchups" className={link("/matchups")}><SwordsIcon size={14} /> Matchups</Link>
      <Link href="/schedule" className={link("/schedule")}><CalendarIcon size={14} /> Schedule</Link>
      <Link href="/standings" className={link("/standings")}><ChartIcon size={14} /> Standings</Link>
      {isOwner && (
        <Link href="/setup" className={link("/setup")}><SettingsIcon size={14} /> Setup</Link>
      )}
      {myTeamId && (
        <Link href="/account" className={link("/account")}><UsersIcon size={14} /> My team</Link>
      )}
      {userId ? (
        <form action={signOut}>
          <button type="submit" className="btn-ghost btn-sm"><LogOutIcon size={14} /> Sign out</button>
        </form>
      ) : (
        <Link href="/login" className={link("/login")}>Sign in</Link>
      )}
    </nav>
  );
}
