import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/draft";
import EmailForm from "../_components/EmailForm";
import TeamNameForm from "../_components/TeamNameForm";

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
      <h1>My account</h1>

      <h2>Team name</h2>
      <TeamNameForm current={team?.name ?? ""} />

      <h2>Notification email</h2>
      <p>Where you&apos;ll be nudged if you&apos;re on the clock for over 4 hours.</p>
      <EmailForm current={profile?.email ?? null} />
    </>
  );
}
