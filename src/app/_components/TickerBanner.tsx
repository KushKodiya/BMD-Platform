import { getTickerItems, type TickerItem, type TickerKind } from "@/lib/ticker";
import { ShuffleIcon, TrophyIcon, ZapIcon } from "./Icons";

const ICONS: Record<TickerKind, typeof ShuffleIcon> = {
  trade: ShuffleIcon,
  points: TrophyIcon,
  stat: ZapIcon,
};

function Item({ item }: { item: TickerItem }) {
  const Icon = ICONS[item.kind] ?? ZapIcon;
  return (
    <span className={`ticker-item ticker-${item.kind}`}>
      <Icon size={13} className="ticker-icon" />
      {item.segments.map((seg, i) =>
        seg.strong ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>
      )}
    </span>
  );
}

/**
 * Site-wide news ticker. No client JS: the marquee is a CSS animation over the
 * item list rendered twice, translating -50% so the second copy lands exactly
 * where the first began and the loop is seamless.
 *
 * The duration scales with how much text there is, so two items don't fly past
 * while twelve crawl. Hovering (or tabbing into it) pauses it, and under
 * prefers-reduced-motion it becomes a static, horizontally scrollable strip
 * rather than snapping to the end of the animation -- see globals.css.
 */
export default async function TickerBanner() {
  const items = await getTickerItems();
  if (items.length === 0) return null; // nothing to say -> no empty bar

  const chars = items.reduce(
    (n, it) => n + it.segments.reduce((m, s) => m + s.text.length, 0),
    0
  );
  // ~1s per 5 characters, floored so short feeds don't whip past.
  const seconds = Math.min(180, Math.max(24, Math.round(chars / 5)));

  return (
    <div className="ticker">
      <span className="ticker-label">
        <span className="dot" /> Latest
      </span>

      <div className="ticker-viewport">
        <div
          className="ticker-track"
          style={{ ["--ticker-duration" as string]: `${seconds}s` }}
        >
          <span className="ticker-run">
            {items.map((it) => <Item key={it.id} item={it} />)}
          </span>
          {/* Second copy purely for the seamless wrap -- hidden from AT so the
              feed isn't announced twice. */}
          <span className="ticker-run ticker-run-clone" aria-hidden="true">
            {items.map((it) => <Item key={`${it.id}-clone`} item={it} />)}
          </span>
        </div>
      </div>
    </div>
  );
}
