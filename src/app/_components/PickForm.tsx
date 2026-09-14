"use client";
import { useFormState } from "react-dom";
import { pickPlayer } from "../actions";
import type { Player } from "@/lib/draft";

export default function PickForm({ available }: { available: Player[] }) {
  const [state, action] = useFormState(pickPlayer, {} as { error?: string });
  return (
    <form action={action} className="inline">
      <select name="player_id" required>
        {available.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.year_in_school ? ` — ${p.year_in_school}` : ""}
            {p.major ? `, ${p.major}` : ""}
          </option>
        ))}
      </select>
      <button type="submit">Draft player</button>
      {state.error && <span className="error">{state.error}</span>}
    </form>
  );
}
