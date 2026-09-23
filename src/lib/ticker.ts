import { supabaseServer } from "@/lib/supabase/server";
import { getPublicTrades, type TradeFeedItem } from "@/lib/draft";

/**
 * The site-wide news ticker.
 *
 * Every source normalises to a TickerItem, so adding one later (team point
 * additions, streaks, high scorers) means writing a `<source>TickerItems()`
 * mapper and passing it to mergeTicker() -- the banner itself never changes.
 */
export type TickerKind = "trade" | "points" | "stat";

/** A run of text; `strong` marks the parts worth emphasising (team names). */
export type TickerSegment = { text: string; strong?: boolean };

export type TickerItem = {
  id: string;
  kind: TickerKind;
  at: string | null;  // ISO timestamp, for ordering; nulls sort last
  segments: TickerSegment[];
};

/** Newest first, nulls last, capped. */
export function mergeTicker(sources: TickerItem[][], limit = 12): TickerItem[] {
  return sources
    .flat()
    .sort((a, b) => {
      if (a.at === b.at) return 0;
      if (a.at === null) return 1;
      if (b.at === null) return -1;
      return Date.parse(b.at) - Date.parse(a.at);
    })
    .slice(0, limit);
}

/** Accepted trades -> ticker items. */
export function tradeTickerItems(trades: TradeFeedItem[]): TickerItem[] {
  return trades.map((t) => ({
    id: `trade-${t.id}`,
    kind: "trade" as const,
    at: t.resolvedAt,
    segments: [
      { text: t.fromTeam, strong: true },
      { text: ` sent ${t.fromPlayers.join(", ")} to ` },
      { text: t.toTeam, strong: true },
      { text: ` for ${t.toPlayers.join(", ")}` },
    ],
  }));
}

/**
 * Everything the banner shows. Its own small read (ids and names only) rather
 * than threading board state through the layout, so the banner works on every
 * page without each one having to supply it.
 */
export async function getTickerItems(limit = 12): Promise<TickerItem[]> {
  const db = supabaseServer();
  const [{ data: teams }, { data: players }] = await Promise.all([
    db.from("teams").select("id, name"),
    db.from("players").select("id, name"),
  ]);

  const trades = await getPublicTrades(teams ?? [], players ?? [], limit);

  // Add further sources here as they land, e.g.
  //   mergeTicker([tradeTickerItems(trades), pointsTickerItems(awards)], limit)
  return mergeTicker([tradeTickerItems(trades)], limit);
}
