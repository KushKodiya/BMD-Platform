import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/draft";
import EmailForm from "../_components/EmailForm";
import TeamNameForm from "../_components/TeamNameForm";
import { UsersIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { userId, myTeamId } = await getUserContext();
  if (!userId || !myTeamId) redirect("/");

  const db = supabaseServer();
  const [{ data: profile }, { data: team }] = await Promise.all([
    db.from("profiles").select("email").eq("id", userId).single(),
    db.from("teams").select("name").eq("id", myTeamId).single(),
  ]);

  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow"><UsersIcon size={13} /> Your team</p>
        <h1 className="display-gradient">My account</h1>
      </header>

      <div className="stack section" style={{ gap: "1rem" }}>
        <section className="card reveal" style={{ ["--i" as string]: 0 }}>
          <h2>Team name</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            How your team appears on the board and in the draft order.
          </p>
          <TeamNameForm current={team?.name ?? ""} />
        </section>

        <section className="card reveal" style={{ ["--i" as string]: 1 }}>
          <h2>Notifications</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Where you&apos;re nudged when you&apos;re on the clock and time is running down.
          </p>
          <EmailForm current={profile?.email ?? null} />
        </section>
      </div>
    </>
  );
}
