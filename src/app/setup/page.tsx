import { redirect } from "next/navigation";
import { getBoardState, getUserContext } from "@/lib/draft";
import { getSeasonMeta } from "@/lib/season";
import AddPlayerForm from "../_components/AddPlayerForm";
import OrderEditor from "../_components/OrderEditor";
import PickTimerForm from "../_components/PickTimerForm";
import ChampionPicker from "../_components/ChampionPicker";
import RosterEditor from "../_components/RosterEditor";
import SeasonControls from "../_components/SeasonControls";
import RemovePlayerButton from "../_components/RemovePlayerButton";
import { CalendarIcon, ClockIcon, CrownIcon, LockIcon, SettingsIcon, UsersIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

export default async function SetupPage() {
  const { isOwner } = await getUserContext();
  if (!isOwner) redirect("/");

  const { draft, teams, players, orderedTeams, rosters, available } = await getBoardState();
  const { weeks, opened } = await getSeasonMeta();
  const locked = draft.status !== "setup";
  // Undrafted players may be pruned mid-draft; drafted ones are the RosterEditor's domain.
  const availableIds = new Set(available.map((p) => p.id));
  const canRemove = (id: string) => draft.status !== "complete" && (!locked || availableIds.has(id));

  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow"><SettingsIcon size={13} /> Owner controls</p>
        <h1 className="display-gradient">Draft setup</h1>
        {locked && (
          <p className="error" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <LockIcon size={14} /> The draft has started — the pool and order are locked.
          </p>
        )}
      </header>

      <div className="stack section" style={{ gap: "1rem" }}>
        {/* --- Pick clock: the one setting that stays editable mid-draft --- */}
        <section className="card reveal" style={{ ["--i" as string]: 0 }}>
          <h2><ClockIcon size={19} /> Pick clock</h2>
          {draft.status === "complete" ? (
            <p className="muted" style={{ margin: 0 }}>
              The draft is complete — the clock no longer applies.
            </p>
          ) : (
            <>
              <PickTimerForm current={draft.pick_seconds} />
              {locked && (
                <p className="dim" style={{ marginBottom: 0 }}>
                  This is the one setting you can still change mid-draft. A new limit applies to
                  the turn already running, measured from when that turn started.
                </p>
              )}
            </>
          )}
        </section>

        {/* --- Defending champion: independent of draft status --- */}
        <section className="card reveal" style={{ ["--i" as string]: 1 }}>
          <h2><CrownIcon size={19} /> Defending champion</h2>
          <ChampionPicker
            teams={teams}
            current={teams.find((t) => t.is_champion)?.id ?? null}
          />
        </section>

        {/* --- Player pool --- */}
        <section className="card reveal" style={{ ["--i" as string]: 2 }}>
          <div className="section-head" style={{ marginBottom: "0.6rem" }}>
            <h2 style={{ margin: 0 }}>Player pool</h2>
            <span className="badge badge-soft">{players.length} players</span>
          </div>

          {!locked && <AddPlayerForm />}

          {players.length > 0 ? (
            <ul className="player-grid" style={{ marginTop: "0.9rem" }}>
              {players.map((p, i) => (
                <li key={p.id} className="player-row reveal" style={{ ["--i" as string]: i }}>
                  <span className="player-avatar" aria-hidden="true">{initials(p.name)}</span>
                  <span className="player-meta">
                    <span className="player-name">{p.name}</span>
                    {(p.year_in_school || p.major) && (
                      <span className="player-sub">
                        {[p.year_in_school, p.major].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  {canRemove(p.id) && <RemovePlayerButton id={p.id} name={p.name} />}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty" style={{ marginTop: "0.9rem" }}>
              <p style={{ margin: 0 }}>The pool is empty — add players before starting.</p>
            </div>
          )}
        </section>

        {/* --- Draft order --- */}
        <section className="card reveal" style={{ ["--i" as string]: 3 }}>
          <h2>Draft order</h2>
          {locked ? (
            <ol className="order-list">
              {draft.team_order.map((id, i) => (
                <li key={id} className="order-item">
                  <span className="order-pos" aria-hidden="true">{i + 1}</span>
                  <span className="order-name">{teams.find((t) => t.id === id)?.name ?? id}</span>
                </li>
              ))}
            </ol>
          ) : (
            <OrderEditor
              key={draft.team_order.join(",")}
              teams={teams}
              currentOrder={draft.team_order}
            />
          )}
        </section>

        {/* --- Season: schedule + opening weeks (available once the draft is done) --- */}
        <section className="card reveal" style={{ ["--i" as string]: 4 }}>
          <h2><CalendarIcon size={19} /> Season</h2>
          <SeasonControls
            draftComplete={draft.status === "complete"}
            weeks={weeks}
            opened={[...opened]}
          />
        </section>

        {/* --- Roster corrections: only meaningful once picks exist --- */}
        {locked && (
          <section className="card reveal" style={{ ["--i" as string]: 5 }}>
            <h2><UsersIcon size={19} /> Roster corrections</h2>
            <RosterEditor
              teams={orderedTeams.length ? orderedTeams : teams}
              rosters={rosters}
              available={available}
            />
          </section>
        )}
      </div>
    </>
  );
}
