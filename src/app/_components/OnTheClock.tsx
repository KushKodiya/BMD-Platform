"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { autoPickIfExpired } from "../actions";
import { formatRemaining, isUrgent } from "@/lib/clock.mjs";
import { ClockIcon, CrownIcon, ZapIcon } from "./Icons";

type Props = {
  teamName: string;
  round: number;
  pickNumber: number;      // 1-based overall pick
  totalPicks: number;
  deadline: number | null; // epoch ms the turn expires; null = no limit
  serverNow: number;       // DB clock when this page was rendered
  pickSeconds: number | null;
  pickIndex: number;       // the turn this clock is counting down
  isMyTurn: boolean;
  isChampion?: boolean;       // defending champion -> gold instead of brand gradient
  children?: React.ReactNode; // the pick UI, shown when it's your turn
};

const POLL_MS = 15_000;  // keep the board fresh for everyone watching
const RETRY_MS = 10_000; // if the expiry call didn't land, try again
const TICK_MS = 250;

const R = 70;                       // dial radius in viewBox units
const C = 2 * Math.PI * R;          // circumference, for stroke-dash math

/**
 * The board's live element: counts the on-clock team down and, at zero, asks
 * the server to auto-pick. Vercel has no long-running process to fire a timer,
 * so the open page is the trigger -- but it is only a trigger: the RPC re-checks
 * the deadline against the DB clock under a row lock, so nothing here can force
 * a pick early, and the cron backstop covers the case where nobody is watching.
 *
 * Elapsed time is measured from mount rather than from the device clock, so a
 * viewer whose computer clock is wrong still sees the real remaining time.
 */
export default function OnTheClock({
  teamName, round, pickNumber, totalPicks, deadline, serverNow,
  pickSeconds, pickIndex, isMyTurn, isChampion = false, children,
}: Props) {
  const initial = deadline == null ? null : Math.max(0, deadline - serverNow);
  const [remaining, setRemaining] = useState<number | null>(initial);
  const [expired, setExpired] = useState(initial === 0 && deadline != null);
  const router = useRouter();

  // Refs so the timers below never re-subscribe on every tick.
  const mountedAt = useRef(0);
  const lastTry = useRef(0);
  const busy = useRef(false);

  // Count down. Resets whenever the turn changes (new pickIndex = new clock).
  useEffect(() => {
    if (deadline == null) {
      setRemaining(null);
      setExpired(false);
      return;
    }
    mountedAt.current = Date.now();
    const base = Math.max(0, deadline - serverNow);
    setRemaining(base);
    setExpired(base === 0);

    const id = setInterval(() => {
      const left = Math.max(0, base - (Date.now() - mountedAt.current));
      setRemaining(left);
      if (left === 0) setExpired(true);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [deadline, serverNow, pickIndex]);

  // On expiry, ask the server to auto-pick. Jittered so nine open tabs don't
  // all fire the same instant; only one can win the row lock anyway.
  useEffect(() => {
    if (!expired || deadline == null) return;
    lastTry.current = 0;

    const attempt = async () => {
      if (busy.current || Date.now() - lastTry.current < RETRY_MS) return;
      busy.current = true;
      lastTry.current = Date.now();
      try {
        await autoPickIfExpired(pickIndex);
        router.refresh();
      } catch {
        // Offline or transient: the retry interval and the cron backstop
        // both still cover this turn.
      } finally {
        busy.current = false;
      }
    };

    const jitter = setTimeout(attempt, Math.random() * 2000);
    const retry = setInterval(attempt, RETRY_MS);
    return () => { clearTimeout(jitter); clearInterval(retry); };
  }, [expired, deadline, pickIndex, router]);

  // Poll so every watcher sees picks land without hitting refresh. (Replaced by
  // a Supabase Realtime subscription when the live board arrives -- see README.)
  useEffect(() => {
    const id = setInterval(() => { if (!busy.current) router.refresh(); }, POLL_MS);
    return () => clearInterval(id);
  }, [router]);

  const urgent = remaining != null && isUrgent(remaining, pickSeconds);
  const fraction =
    remaining != null && pickSeconds ? Math.min(1, remaining / (pickSeconds * 1000)) : 0;
  const pct = totalPicks > 0 ? Math.round(((pickNumber - 1) / totalPicks) * 100) : 0;

  return (
    <section className={`clock-panel${urgent ? " is-urgent" : ""}`} aria-label="Current turn">
      <div className="clock-panel-main">
        <p className="eyebrow">
          <span className="dot" style={{ marginRight: "0.4rem" }} />
          On the clock · Round {round} · Pick {pickNumber} of {totalPicks}
        </p>

        <h2 className={`clock-team ${isChampion ? "champion-text" : "display-gradient"}`}>
          {isChampion && (
            <>
              <CrownIcon size={30} className="crown" />
              <span className="sr-only">Defending champion: </span>
            </>
          )}
          {teamName}
        </h2>

        <div className="progress" role="presentation">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="dim" style={{ marginTop: "0.35rem" }}>
          {pickNumber - 1} of {totalPicks} picks made · {pct}% complete
        </p>

        {isMyTurn ? (
          <div className="stack" style={{ marginTop: "0.9rem" }}>
            <p className="row" style={{ margin: 0, fontWeight: 700 }}>
              <span className="badge badge-live"><ZapIcon size={12} /> Your pick</span>
              {deadline != null && !expired && <span>Draft someone before the clock runs out.</span>}
              {deadline != null && expired && <span>Time&apos;s up — assigning a random player…</span>}
              {deadline == null && <span>Take your time — no clock is set.</span>}
            </p>
            {children}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: "0.8rem", marginBottom: 0 }}>
            Waiting on {teamName} to make their pick.
          </p>
        )}
      </div>

      {deadline != null && remaining != null ? (
        <div className={`clock-dial${urgent ? " is-urgent" : ""}`}>
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <defs>
              <linearGradient id="clockGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={urgent ? "#ff3b5c" : "#9d6fe0"} />
                <stop offset="100%" stopColor={urgent ? "#a6192e" : "#d42441"} />
              </linearGradient>
            </defs>
            <circle className="clock-dial-track" cx="80" cy="80" r={R} />
            <circle
              className="clock-dial-fill"
              cx="80" cy="80" r={R}
              stroke="url(#clockGradient)"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - fraction)}
            />
          </svg>
          <div className="clock-dial-face">
            {expired ? (
              <>
                <span className="clock-digits clock-expired">0:00</span>
                <span className="clock-label">Auto-picking</span>
              </>
            ) : (
              <>
                <span className="clock-digits">{formatRemaining(remaining)}</span>
                <span className="clock-label">Remaining</span>
              </>
            )}
          </div>
          {/* One atomic status line rather than an announcement every tick. */}
          <span role="status" aria-atomic="true" className="sr-only">
            {expired
              ? `${teamName} ran out of time, assigning a random player`
              : `${teamName} has ${formatRemaining(remaining)} left to pick`}
          </span>
        </div>
      ) : (
        <div className="clock-dial-none">
          <span className="badge badge-soft"><ClockIcon size={12} /> No time limit</span>
        </div>
      )}
    </section>
  );
}
