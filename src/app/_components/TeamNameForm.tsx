"use client";
import { useFormState } from "react-dom";
import { updateMyTeamName } from "../actions";

export default function TeamNameForm({ current }: { current: string }) {
  const [state, action] = useFormState(updateMyTeamName, {} as { error?: string });
  return (
    <form action={action} className="inline">
      <input name="name" defaultValue={current} placeholder="Team name" required />
      <button type="submit">Save team name</button>
      {state.error && <span className="error">{state.error}</span>}
    </form>
  );
}
