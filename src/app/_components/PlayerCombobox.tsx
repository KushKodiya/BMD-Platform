"use client";
import { useMemo, useRef, useState } from "react";
import { SearchIcon } from "./Icons";

type P = { id: string; name: string };

// Searchable player picker: type to filter, click to select. Replaces a long
// dropdown. `value` is the selected player's id ("" = none); `onSelect` sets it.
export default function PlayerCombobox({
  players, value, onSelect, placeholder = "Search players",
}: {
  players: P[];
  value: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();

  const selected = players.find((p) => p.id === value) ?? null;
  const text = selected ? selected.name : query;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? players.filter((p) => p.name.toLowerCase().includes(q)) : players).slice(0, 8);
  }, [players, query]);

  return (
    <div className="combo">
      <div className="search-wrap">
        <SearchIcon size={15} />
        <input
          type="search"
          value={text}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            if (selected) onSelect("");
            setQuery(e.target.value);
            setOpen(true);
          }}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="combo-list">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="combo-item"
                onMouseDown={(e) => e.preventDefault()} // keep focus so click registers before blur
                onClick={() => { onSelect(p.id); setQuery(""); setOpen(false); }}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
