"use client";
import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "../actions";
import { LockIcon } from "../_components/Icons";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending} style={{ width: "100%" }}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(signIn, {} as { error?: string });
  return (
    <div className="auth-shell">
      <div className="card auth-card pop">
        <p className="eyebrow"><LockIcon size={13} /> Admins only</p>
        <h1 style={{ fontSize: "2.2rem" }}>Sign in</h1>
        <form action={action} className="stack" style={{ marginTop: "0.5rem" }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <Submit />
          {state.error && <p className="error" role="alert">{state.error}</p>}
        </form>
        <p className="dim" style={{ marginTop: "1rem", marginBottom: 0 }}>
          Viewers don&apos;t need an account — the board is public.
        </p>
      </div>
    </div>
  );
}
