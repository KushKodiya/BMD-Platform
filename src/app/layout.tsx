import "./globals.css";
import Link from "next/link";
import { getUserContext } from "@/lib/draft";
import { signOut } from "./actions";

export const metadata = { title: "BMD Draft", description: "Team drafting platform" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId, isOwner, myTeamId } = await getUserContext();
  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/"><strong>BMD Draft</strong></Link>
          {isOwner && <Link href="/setup">Setup</Link>}
          {myTeamId && <Link href="/account">My account</Link>}
          <span style={{ flex: 1 }} />
          {userId ? (
            <form action={signOut}><button type="submit">Sign out</button></form>
          ) : (
            <Link href="/login">Sign in</Link>
          )}
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
