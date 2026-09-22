"use client";

import { useMemo, useState, useTransition } from "react";
import { proposeTrade, respondTrade, cancelTrade } from "../actions";
import type { MyTrades, TradeView } from "@/lib/draft";
import { ArrowUpIcon, ArrowDownIcon, CheckIcon, XIcon } from "./Icons";

type P = { id: string; name: string };
type Partner = { id: string; name: string; roster: P[] };

export default function TradesPanel({
  myRoster,
  partners,
  trades,
}: {
  myRoster: P[];
  partners: Partner[];
  trades: MyTrades;
}) {
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [give, setGive] = useState<Set<string>>(new Set());
  const [get, setGet] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const partner = useMemo(
    () => partners.find((p) => p.id === partnerId) ?? null,
    [partners, partnerId],
  );

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const counts = `${give.size} for ${get.size}`;
  const canPropose =
    !!partner && give.size >= 1 && give.size === get.size && !pending;

  const run = (fn: () => Promise<{ error?: string }>, onOk?: () => void) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else onOk?.();
    });
  };

  const submit = () =>
    run(
      () => proposeTrade(partnerId, [...give], [...get]),
      () => {
        setGive(new Set());
        setGet(new Set());
      },
    );

  if (myRoster.length === 0) {
    return (
      <p className="muted" style={{ marginTop: 0 }}>
        You have no players to trade yet. Trading opens once you&apos;ve drafted someone.
      </p>
    );
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      {/* Incoming — awaiting my response */}
      {trades.incoming.length > 0 && (
        <div className="stack" style={{ gap: "0.6rem" }}>
          <h3 style={{ margin: 0 }}>Awaiting your response</h3>
          {trades.incoming.map((t) => (
            <TradeRow key={t.id} t={t}>
              <button
                type="button"
                className="btn-sm"
                disabled={pending}
                onClick={() => run(() => respondTrade(t.id, true))}
              >
                <CheckIcon size={14} /> Accept
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={pending}
                onClick={() => run(() => respondTrade(t.id, false))}
              >
                <XIcon size={14} /> Decline
              </button>
            </TradeRow>
          ))}
        </div>
      )}

      {/* Outgoing — my pending proposals */}
      {trades.outgoing.length > 0 && (
        <div className="stack" style={{ gap: "0.6rem" }}>
          <h3 style={{ margin: 0 }}>Your proposals</h3>
          {trades.outgoing.map((t) => (
            <TradeRow key={t.id} t={t}>
              <span className="badge badge-soft">Pending</span>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={pending}
                onClick={() => run(() => cancelTrade(t.id))}
              >
                <XIcon size={14} /> Cancel
              </button>
            </TradeRow>
          ))}
        </div>
      )}

      {/* Propose */}
      <div className="stack" style={{ gap: "0.6rem" }}>
        <h3 style={{ margin: 0 }}>Propose a trade</h3>
        {partners.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No other team has players to trade yet.</p>
        ) : (
          <>
            <div className="field" style={{ maxWidth: "20rem" }}>
              <label htmlFor="partner">Trade with</label>
              <select
                id="partner"
                value={partnerId}
                onChange={(e) => {
                  setPartnerId(e.target.value);
                  setGet(new Set());
                }}
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="trade-cols">
              <fieldset className="trade-col">
                <legend><ArrowUpIcon size={13} /> You give</legend>
                {myRoster.map((p) => (
                  <label key={p.id} className="trade-pick">
                    <input
                      type="checkbox"
                      checked={give.has(p.id)}
                      onChange={() => toggle(give, setGive, p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </fieldset>

              <fieldset className="trade-col">
                <legend><ArrowDownIcon size={13} /> You get</legend>
                {(partner?.roster ?? []).map((p) => (
                  <label key={p.id} className="trade-pick">
                    <input
                      type="checkbox"
                      checked={get.has(p.id)}
                      onChange={() => toggle(get, setGet, p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </fieldset>
            </div>

            <div className="row" style={{ alignItems: "center" }}>
              <button type="button" onClick={submit} disabled={!canPropose}>
                {pending ? "Sending…" : "Send trade"}
              </button>
              <span className="muted">
                {counts}
                {give.size !== get.size && " — both sides must trade the same number"}
              </span>
            </div>
          </>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {/* Recent resolved */}
      {trades.recent.length > 0 && (
        <div className="stack" style={{ gap: "0.6rem" }}>
          <h3 style={{ margin: 0 }}>Recent trades</h3>
          {trades.recent.map((t) => (
            <TradeRow key={t.id} t={t}>
              <span className={`badge ${t.status === "accepted" ? "badge-ok" : "badge-soft"}`}>
                {t.status}
              </span>
            </TradeRow>
          ))}
        </div>
      )}
    </div>
  );
}

function TradeRow({ t, children }: { t: TradeView; children: React.ReactNode }) {
  const names = (ps: { name: string }[]) => ps.map((p) => p.name).join(", ") || "—";
  return (
    <div className="card" style={{ padding: "0.75rem 0.9rem" }}>
      <div className="row" style={{ alignItems: "center", gap: "0.6rem" }}>
        <span style={{ flex: 1 }}>
          <strong>{t.partnerTeamName}</strong>
          <span className="muted"> — you give </span>{names(t.myPlayers)}
          <span className="muted"> for </span>{names(t.theirPlayers)}
        </span>
        {children}
      </div>
    </div>
  );
}
