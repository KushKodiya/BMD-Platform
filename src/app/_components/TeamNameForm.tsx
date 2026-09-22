"use client";
import { useFormState, useFormStatus } from "react-dom";
import { updateMyTeamName } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save team name"}</button>;
}

export default function TeamNameForm({ current }: { current: string }) {
  const [state, action] = useFormState(updateMyTeamName, {} as { error?: string });
  return (
    <form action={action} className="stack">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: "1 1 16rem" }}>
          <label htmlFor="team-name">Team name</label>
          <input id="team-name" name="name" defaultValue={current} placeholder="Team name" required />
        </div>
        <Submit />
      </div>
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}
