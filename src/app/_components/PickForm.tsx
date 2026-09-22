"use client";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { pickPlayer } from "../actions";
import type { Player } from "@/lib/draft";
import { SearchIcon, ZapIcon } from "./Icons";

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

const subtitle = (p: Player) =>
  [p.year_in_school, p.major].filter(Boolean).join(" · ");

function SubmitButton({ disabled }: { disabled: boolean }) {
  // Submit feedback: the button reports its own pending state rather than
  // leaving the click looking like it did nothing.
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-hot" disabled={disabled || pending}>
      <ZapIcon size={15} />
      {pending ? "Drafting…" : "Draft player"}
    </button>
  );
}

/**
 * On-clock pick UI. A filterable list beats a <select> once the pool passes a
 * dozen names -- you can find someone by typing, and the choice stays visible
 * while you confirm it. The server action contract is unchanged: one hidden
 * player_id posted to make_pick.
 */
export default function PickForm({ available }: { available: Player[] }) {
  const [state, action] = useFormState(pickPlayer, {} as { error?: string });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((p) =>
      `${p.name} ${p.year_in_school ?? ""} ${p.major ?? ""}`.toLowerCase().includes(q)
    );
  }, [available, query]);

  const chosen = available.find((p) => p.id === selected) ?? null;

  return (
    <form action={action} className="stack">
      <div className="row" style={{ gap: "0.5rem" }}>
        <div className="search-wrap" style={{ flex: "1 1 14rem" }}>
          <SearchIcon size={15} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the pool by name, year, or major"
            aria-label="Search available players"
          />
        </div>
        <input type="hidden" name="player_id" value={selected ?? ""} />
        <SubmitButton disabled={!selected} />
      </div>

      <p className="dim" style={{ margin: 0 }}>
        {chosen
          ? `Selected: ${chosen.name}`
          : `Pick a name below to arm the draft button · ${matches.length} shown`}
      </p>

      {matches.length > 0 ? (
        <ul className="player-grid scroll-list">
          {matches.map((p, i) => (
            <li key={p.id} className="reveal" style={{ ["--i" as string]: i }}>
              <button
                type="button"
                className="player-row"
                aria-pressed={selected === p.id}
                onClick={() => setSelected(selected === p.id ? null : p.id)}
              >
                <span className="player-avatar" aria-hidden="true">{initials(p.name)}</span>
                <span className="player-meta">
                  <span className="player-name">{p.name}</span>
                  {subtitle(p) && <span className="player-sub">{subtitle(p)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ margin: 0 }}>No one in the pool matches “{query}”.</p>
      )}

      {state.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}
