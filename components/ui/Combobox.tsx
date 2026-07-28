"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

const FIELD_CLASSES =
  "w-full pl-9 pr-4 py-2.5 text-sm border border-ink/10 rounded-input outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint transition-all bg-white";

/**
 * A styled searchable combobox: type to filter a floating list of column
 * names, navigate with arrow keys, select with Enter/click. Still accepts
 * any typed value (not just one from `options`) — needed in edit mode when
 * a saved mapping references a column that isn't in a newly uploaded sample.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [value, options]);

  function selectOption(option: string) {
    onChange(option);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlighted]) {
        e.preventDefault();
        selectOption(filtered[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/30 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Digite para pesquisar..."}
          autoComplete="off"
          className={`${FIELD_CLASSES} ${className}`}
        />
      </div>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-ink/10 rounded-input shadow-card-hover max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink/40 italic">Nenhuma coluna encontrada.</p>
          ) : (
            filtered.map((option, i) => (
              <button
                key={option}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  selectOption(option);
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                  i === highlighted ? "bg-mint/10 text-ink" : "text-ink/75"
                }`}
              >
                {option}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
