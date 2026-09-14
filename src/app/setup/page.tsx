import { redirect } from "next/navigation";
import { getBoardState, getUserContext } from "@/lib/draft";
import AddPlayerForm from "../_components/AddPlayerForm";
import OrderEditor from "../_components/OrderEditor";
import { removePlayer } from "../actions";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const { isOwner } = await getUserContext();
  if (!isOwner) redirect("/");

  const { draft, teams, players } = await getBoardState();
  const locked = draft.status !== "setup";

  return (
    <>
      <h1>Draft Setup</h1>
      {locked && <p className="error">The draft has started — the pool and order are locked.</p>}

      <h2>Player pool ({players.length})</h2>
      {!locked && <AddPlayerForm />}
      <ul className="plain">
        {players.map((p) => (
          <li key={p.id}>
            <span>{p.name}{p.year_in_school ? ` — ${p.year_in_school}` : ""}{p.major ? `, ${p.major}` : ""}</span>
            {!locked && (
              <form action={removePlayer} className="inline">
                <input type="hidden" name="id" value={p.id} />
                <button type="submit">Remove</button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <h2>Draft order</h2>
      {locked ? (
        <ol>{draft.team_order.map((id) => <li key={id}>{teams.find((t) => t.id === id)?.name ?? id}</li>)}</ol>
      ) : (
        <OrderEditor key={draft.team_order.join(",")} teams={teams} currentOrder={draft.team_order} />
      )}
    </>
  );
}
