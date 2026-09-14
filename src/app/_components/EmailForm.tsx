"use client";
import { useFormState } from "react-dom";
import { updateMyEmail } from "../actions";

export default function EmailForm({ current }: { current: string | null }) {
  const [state, action] = useFormState(updateMyEmail, {} as { error?: string });
  return (
    <form action={action} className="inline">
      <input name="email" type="email" defaultValue={current ?? ""} placeholder="you@example.com" required />
      <button type="submit">Save email</button>
      {state.error && <span className="error">{state.error}</span>}
    </form>
  );
}
