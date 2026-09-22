"use client";
import { useFormState, useFormStatus } from "react-dom";
import { addPlayer } from "../actions";
import { PlusIcon } from "./Icons";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      <PlusIcon size={15} /> {pending ? "Adding…" : "Add player"}
    </button>
  );
}

export default function AddPlayerForm() {
  const [state, action] = useFormState(addPlayer, {} as { error?: string });
  return (
    <form action={action} className="stack">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: "1 1 12rem" }}>
          <label htmlFor="p-name">Name</label>
          <input id="p-name" name="name" placeholder="Full name" required />
        </div>
        <div className="field" style={{ flex: "1 1 8rem" }}>
          <label htmlFor="p-year">Year</label>
          <input id="p-year" name="year_in_school" placeholder="Optional" />
        </div>
        <div className="field" style={{ flex: "1 1 10rem" }}>
          <label htmlFor="p-major">Major</label>
          <input id="p-major" name="major" placeholder="Optional" />
        </div>
        <Submit />
      </div>
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}
