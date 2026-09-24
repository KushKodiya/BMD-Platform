"use client";
import { useFormState, useFormStatus } from "react-dom";
import { removePlayer } from "../actions";
import { XIcon } from "./Icons";

function Submit({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-ghost btn-icon"
      disabled={pending}
      aria-label={`Remove ${name} from the pool`}
    >
      <XIcon size={15} />
    </button>
  );
}

/** Remove control for a single pool player. Surfaces the RPC error (e.g. a
 *  player drafted out from under the button mid-draft) instead of failing silently. */
export default function RemovePlayerButton({ id, name }: { id: string; name: string }) {
  const [state, action] = useFormState(removePlayer, {} as { error?: string });
  return (
    <form action={action} style={{ marginLeft: "auto" }}>
      <input type="hidden" name="id" value={id} />
      <Submit name={name} />
      {state.error && (
        <span className="error" role="alert" style={{ marginLeft: "0.4rem" }}>
          {state.error}
        </span>
      )}
    </form>
  );
}
