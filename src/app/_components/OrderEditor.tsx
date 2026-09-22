"use client";
import { useState, useTransition } from "react";
import { setOrder, randomizeOrder, startDraft } from "../actions";
import type { Team } from "@/lib/draft";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, PlayIcon, ShuffleIcon } from "./Icons";

// Manual arrange (up/down) + save, randomize, and start. The order and start
// rules are re-enforced server-side in the RPCs; this is just the control.
export default function OrderEditor({ teams, currentOrder }: { teams: Team[]; currentOrder: string[] }) {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const initial = currentOrder.length ? currentOrder : teams.map((t) => t.id);
  const [ids, setIds] = useState<string[]>(initial);
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    setIds(next);
  };

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => setError((await fn()).error));

  return (
    <div className="stack">
      <ol className="order-list">
        {ids.map((id, i) => (
          <li key={id} className="order-item reveal" style={{ ["--i" as string]: i }}>
            <span className="order-pos" aria-hidden="true">{i + 1}</span>
            <span className="order-name">{byId.get(id)?.name ?? id}</span>
            <button
              type="button"
              className="btn-ghost btn-icon"
              onClick={() => move(i, -1)}
              disabled={i === 0 || pending}
              aria-label={`Move ${byId.get(id)?.name ?? "team"} up`}
            >
              <ArrowUpIcon size={15} />
            </button>
            <button
              type="button"
              className="btn-ghost btn-icon"
              onClick={() => move(i, 1)}
              disabled={i === ids.length - 1 || pending}
              aria-label={`Move ${byId.get(id)?.name ?? "team"} down`}
            >
              <ArrowDownIcon size={15} />
            </button>
          </li>
        ))}
      </ol>

      <div className="row">
        <button type="button" onClick={() => run(() => setOrder(ids))} disabled={pending}>
          <CheckIcon size={15} /> Save order
        </button>
        <button type="button" onClick={() => run(() => randomizeOrder())} disabled={pending}>
          <ShuffleIcon size={15} /> Randomize
        </button>
        <button type="button" className="btn-primary" onClick={() => run(() => startDraft())} disabled={pending}>
          <PlayIcon size={15} /> Start draft
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
