"use client";
import { useState, useTransition } from "react";
import { generateSchedule, openWeek } from "../actions";
import { CheckIcon, PlayIcon } from "./Icons";

// Owner-only: generate the season schedule once the draft is complete, then open
// each week to snapshot rosters. The RPCs enforce owner + preconditions; this is
// just the trigger surface.
export default function SeasonControls({
  draftComplete, weeks, opened,
}: {
  draftComplete: boolean;
  weeks: number[];
  opened: number[];
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const openedSet = new Set(opened);

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(undefined);
    start(async () => {
      const res = await fn();
      setError(res.error);
    });
  };

  if (weeks.length === 0) {
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
            onClick={() => run(generateSchedule)}
            disabled={pending || !draftComplete}
          >
            <PlayIcon size={14} /> {pending ? "Generating…" : "Generate schedule"}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Open a week to lock in each team&apos;s current roster for that week&apos;s scoring. A trade
        after a week is opened won&apos;t change that week.
      </p>
      <ul className="order-list">
        {weeks.map((w) => (
          <li key={w} className="order-item">
            <span className="order-pos" aria-hidden="true">{w}</span>
            <span className="order-name">Week {w}</span>
            {openedSet.has(w) ? (
              <span className="badge badge-ok" style={{ marginLeft: "auto" }}>
                <CheckIcon size={12} /> Opened
              </span>
            ) : (
              <button
                type="button"
                className="btn-ghost btn-sm"
                style={{ marginLeft: "auto" }}
                onClick={() => run(() => openWeek(w))}
                disabled={pending}
              >
                Open week
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
