import { getPlayers } from "@/lib/season";
import PlayersSearch from "../_components/PlayersSearch";
import { UsersIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await getPlayers();

  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow"><UsersIcon size={13} /> Season</p>
        <h1 className="display-gradient">Players</h1>
        <p className="muted" style={{ margin: 0 }}>
          Search any player for their season total and weekly average. Sorted by total points.
        </p>
      </header>

      <section className="section" style={{ marginTop: "1rem" }}>
        {players.length > 0 ? (
          <PlayersSearch players={players} />
        ) : (
          <div className="empty">
            <p style={{ margin: 0 }}>No players yet.</p>
          </div>
        )}
      </section>
    </>
  );
}
