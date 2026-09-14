"use client";
import { useFormState } from "react-dom";
import { addPlayer } from "../actions";

export default function AddPlayerForm() {
  const [state, action] = useFormState(addPlayer, {} as { error?: string });
  return (
    <form action={action} className="inline">
      <input name="name" placeholder="Name (required)" required />
      <input name="year_in_school" placeholder="Year (optional)" />
      <input name="major" placeholder="Major (optional)" />
      <button type="submit">Add player</button>
      {state.error && <span className="error">{state.error}</span>}
    </form>
  );
}
