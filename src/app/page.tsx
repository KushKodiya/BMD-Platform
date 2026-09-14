import { getBoardState, getUserContext } from "@/lib/draft";
import PickForm from "./_components/PickForm";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const board = await getBoardState();
  const { myTeamId } = await getUserContext();
  const { draft, orderedTeams, rosters, available, grid, onClockTeamId, teams } = board;
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "—";
  const isMyTurn = !!myTeamId && myTeamId === onClockTeamId;

  return (
    <>
      <h1>Draft Board</h1>
      <p>
        Status: <strong>{draft.status}</strong>
        {draft.status === "in_progress" && (
          <> · On the clock: <span className="badge">{teamName(onClockTeamId)}</span></>
        )}
        {draft.status === "complete" && <> · Draft complete 🎉</>}
      </p>

      {isMyTurn && (
        <p>
          <strong>It&apos;s your turn.</strong>{" "}
          {available.length > 0 && <PickForm available={available} />}
        </p>
      )}

      {orderedTeams.length > 0 ? (
        <div className="grid-wrap">
          <table>
            <thead>
              <tr>
                <th>Round</th>
                {orderedTeams.map((t) => (
                  <th key={t.id} className={t.id === onClockTeamId ? "on-clock" : ""}>{t.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r}>
                  <td>{r + 1}</td>
                  {row.map((cell, c) => (
                    <td key={c}>{cell ? cell.name : ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>The draft order hasn&apos;t been set yet.</p>
      )}

      <h2>Rosters</h2>
      <div className="grid-wrap">
        <table>
          <thead><tr>{orderedTeams.map((t) => <th key={t.id}>{t.name}</th>)}</tr></thead>
          <tbody>
            <tr>
              {orderedTeams.map((t) => (
                <td key={t.id} style={{ verticalAlign: "top" }}>
                  <ol>{(rosters[t.id] ?? []).map((p) => <li key={p.id}>{p.name}</li>)}</ol>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Available players ({available.length})</h2>
      <ul>{available.map((p) => (
        <li key={p.id}>
          {p.name}{p.year_in_school ? ` — ${p.year_in_school}` : ""}{p.major ? `, ${p.major}` : ""}
        </li>
      ))}</ul>
    </>
  );
}
