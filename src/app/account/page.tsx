import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserContext, getBoardState, getMyTrades } from "@/lib/draft";
import TeamNameForm from "../_components/TeamNameForm";
import TradesPanel from "../_components/TradesPanel";
import { UsersIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { userId, myTeamId } = await getUserContext();
  if (!userId || !myTeamId) redirect("/");

  const db = supabaseServer();
  const [{ data: team }, board] = await Promise.all([
    db.from("teams").select("name").eq("id", myTeamId).single(),
    getBoardState(),
  ]);
  const roster = board.rosters[myTeamId] ?? [];

  const trades = await getMyTrades(myTeamId, board.teams, board.players);
  const toP = (ps: { id: string; name: string }[]) => ps.map((p) => ({ id: p.id, name: p.name }));
  const myRoster = toP(roster);
  const partners = board.teams
    .filter((t) => t.id !== myTeamId && (board.rosters[t.id]?.length ?? 0) > 0)
    .map((t) => ({ id: t.id, name: t.name, roster: toP(board.rosters[t.id] ?? []) }));
  const canTrade = board.draft.status !== "setup";

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
          <h2>My roster</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {roster.length
              ? `${roster.length} ${roster.length === 1 ? "player" : "players"} drafted, in pick order.`
              : "No picks yet. Players you draft will show up here."}
          </p>
          {roster.length > 0 && (
            <ol className="roster-list">
              {roster.map((p, i) => (
                <li key={p.id}>
                  <span className="num">{i + 1}</span>
                  <span>{p.name}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card reveal" style={{ ["--i" as string]: 2 }}>
          <h2>Trades</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Swap players with another team. Both sides must trade the same number of players.
          </p>
          {canTrade ? (
            <TradesPanel myRoster={myRoster} partners={partners} trades={trades} />
          ) : (
            <p className="muted" style={{ margin: 0 }}>Trading opens once the draft starts.</p>
          )}
        </section>
      </div>
    </>
  );
}
