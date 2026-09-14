"use client";
import { useFormState } from "react-dom";
import { signIn } from "../actions";

export default function LoginPage() {
  const [state, action] = useFormState(signIn, {} as { error?: string });
  return (
    <>
      <h1>Sign in</h1>
      <form action={action} style={{ display: "grid", gap: "0.5rem", maxWidth: 320 }}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Sign in</button>
        {state.error && <span className="error">{state.error}</span>}
      </form>
      <p>Viewers don&apos;t need to sign in — the board is public.</p>
    </>
  );
}
