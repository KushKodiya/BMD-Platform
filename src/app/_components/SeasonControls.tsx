"use client";
import { useState, useTransition } from "react";
import { generateSchedule } from "../actions";
import { PlayIcon, CheckIcon } from "./Icons";

// Owner-only: generate the season schedule once the draft is complete. Weeks are
// scored directly by moderators afterward (no separate "open week" step), so this
// is now just the schedule trigger.
export default function SeasonControls({
  draftComplete, scheduled,
}: {
  draftComplete: boolean;
  scheduled: boolean;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  if (scheduled) {
    return (
      <p className="muted" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
        <CheckIcon size={14} /> The schedule is set. Moderators enter weekly and exam/IM points from the Scores tab.
      </p>
    );
  }

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        {draftComplete
          ? "Generate the season schedule: a randomized round-robin where every team byes once and faces each other once."
          : "The schedule can be generated once the draft is complete."}
      </p>
      <div className="row">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setError(undefined);
            start(async () => setError((await generateSchedule()).error));
          }}
          disabled={pending || !draftComplete}
        >
          <PlayIcon size={14} /> {pending ? "Generating…" : "Generate schedule"}
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
