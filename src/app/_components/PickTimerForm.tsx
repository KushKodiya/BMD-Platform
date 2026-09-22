"use client";
import { useState, useTransition } from "react";
import { setPickSeconds } from "../actions";
import { CLOCK_PRESETS, MIN_PICK_SECONDS, MAX_PICK_SECONDS, describeLimit } from "@/lib/clock.mjs";
import { CheckIcon, ClockIcon } from "./Icons";

const CUSTOM = "custom";
const keyOf = (seconds: number | null) => (seconds === null ? "none" : String(seconds));

/**
 * Owner-only control for how long each team gets on the clock. Presets are
 * chips so the common choices are one tap; "Custom" opens a minutes field for
 * anything else. The RPC re-checks ownership and the range -- this is just the
 * control.
 */
export default function PickTimerForm({ current }: { current: number | null }) {
  const isPreset = CLOCK_PRESETS.some((p) => p.seconds === current);
  const [choice, setChoice] = useState<string>(isPreset ? keyOf(current) : CUSTOM);
  const [customMin, setCustomMin] = useState<string>(
    current != null && !isPreset ? String(current / 60) : "2"
  );
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const choose = (key: string) => { setChoice(key); setSaved(false); setError(undefined); };

  const save = () => {
    setSaved(false);
    let seconds: number | null;
    if (choice === "none") {
      seconds = null;
    } else if (choice === CUSTOM) {
      const minutes = Number(customMin);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        setError("Enter how many minutes each team gets.");
        return;
      }
      seconds = Math.round(minutes * 60);
      if (seconds < MIN_PICK_SECONDS || seconds > MAX_PICK_SECONDS) {
        setError(`The pick clock must be between ${MIN_PICK_SECONDS} seconds and 24 hours.`);
        return;
      }
    } else {
      seconds = Number(choice);
    }
    start(async () => {
      const res = await setPickSeconds(seconds);
      setError(res.error);
      setSaved(!res.error);
    });
  };

  return (
    <div className="stack">
      <p className="row" style={{ margin: 0 }}>
        <span className="badge badge-soft"><ClockIcon size={12} /> {describeLimit(current)}</span>
        <span className="muted">
          {current == null
            ? "Teams can take as long as they like."
            : "When a team's time runs out they're given a random player from the pool and the draft moves on."}
        </span>
      </p>

      <div className="row" role="group" aria-label="Time per pick">
        {CLOCK_PRESETS.map((p) => (
          <button
            key={keyOf(p.seconds)}
            type="button"
            className="chip"
            aria-pressed={choice === keyOf(p.seconds)}
            disabled={pending}
            onClick={() => choose(keyOf(p.seconds))}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={choice === CUSTOM}
          disabled={pending}
          onClick={() => choose(CUSTOM)}
        >
          Custom…
        </button>
      </div>

      {choice === CUSTOM && (
        <div className="field" style={{ maxWidth: "14rem" }}>
          <label htmlFor="custom-minutes">Minutes per pick</label>
          <input
            id="custom-minutes"
            type="number"
            min="0.5"
            step="0.5"
            value={customMin}
            onChange={(e) => { setCustomMin(e.target.value); setSaved(false); }}
            disabled={pending}
          />
        </div>
      )}

      <div className="row">
        <button type="button" className="btn-primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save pick clock"}
        </button>
        {saved && !pending && (
          <span className="badge badge-ok"><CheckIcon size={12} /> Saved</span>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
