"use client";
import { useFormState, useFormStatus } from "react-dom";
import { updateMyEmail } from "../actions";
import { MailIcon } from "./Icons";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save email"}</button>;
}

export default function EmailForm({ current }: { current: string | null }) {
  const [state, action] = useFormState(updateMyEmail, {} as { error?: string });
  return (
    <form action={action} className="stack">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: "1 1 16rem" }}>
          <label htmlFor="notify-email"><MailIcon size={12} /> Notification email</label>
          <input
            id="notify-email" name="email" type="email"
            defaultValue={current ?? ""} placeholder="you@example.com" required
          />
        </div>
        <Submit />
      </div>
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}
