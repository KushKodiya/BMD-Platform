"use client";
import { useState, useTransition } from "react";
import { setOrder, randomizeOrder, startDraft } from "../actions";
import type { Team } from "@/lib/draft";

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
    <div>
      <ol>
        {ids.map((id, i) => (
          <li key={id}>
            {byId.get(id)?.name ?? id}{" "}
            <button onClick={() => move(i, -1)} disabled={i === 0 || pending}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === ids.length - 1 || pending}>↓</button>
          </li>
        ))}
      </ol>
      <div className="inline">
        <button onClick={() => run(() => setOrder(ids))} disabled={pending}>Save order</button>
        <button onClick={() => run(() => randomizeOrder())} disabled={pending}>Randomize</button>
        <button onClick={() => run(() => startDraft())} disabled={pending}>Start draft</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
