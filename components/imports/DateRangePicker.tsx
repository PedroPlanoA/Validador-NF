"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * A compact calendar popover for picking either a date range (click a start
 * day, click an end day) or a single day (double-click one day). Built
 * custom instead of pulling in a calendar library, since the only need here
 * is "pick a range or a single day" for the import-date filter.
 */
export function DateRangePicker({
  dataInicio,
  dataFim,
  onChange,
}: {
  dataInicio?: string;
  dataFim?: string;
  onChange: (dataInicio: string | undefined, dataFim: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (dataFim ? fromISODate(dataFim) : new Date()));
  const [pendingStart, setPendingStart] = useState<string | undefined>(dataInicio);
  const [pendingEnd, setPendingEnd] = useState<string | undefined>(dataFim);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  function isInRange(d: Date) {
    if (!pendingStart) return false;
    const iso = toISODate(d);
    const end = pendingEnd ?? pendingStart;
    const [lo, hi] = pendingStart <= end ? [pendingStart, end] : [end, pendingStart];
    return iso >= lo && iso <= hi;
  }

  function isEdge(d: Date) {
    const iso = toISODate(d);
    return iso === pendingStart || iso === pendingEnd;
  }

  function handleClick(d: Date) {
    const iso = toISODate(d);
    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(iso);
      setPendingEnd(undefined);
    } else {
      if (iso < pendingStart) {
        setPendingEnd(pendingStart);
        setPendingStart(iso);
      } else {
        setPendingEnd(iso);
      }
    }
  }

  function handleDoubleClick(d: Date) {
    const iso = toISODate(d);
    setPendingStart(iso);
    setPendingEnd(iso);
  }

  function apply() {
    onChange(pendingStart, pendingEnd ?? pendingStart);
    setOpen(false);
  }

  function clear() {
    setPendingStart(undefined);
    setPendingEnd(undefined);
    onChange(undefined, undefined);
    setOpen(false);
  }

  const label =
    dataInicio && dataFim && dataInicio !== dataFim
      ? `${dataInicio.split("-").reverse().join("/")} – ${dataFim.split("-").reverse().join("/")}`
      : dataInicio
        ? dataInicio.split("-").reverse().join("/")
        : "Data de importação";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm border border-ink/10 rounded-input px-4 py-2.5 bg-white hover:border-mint transition-colors"
      >
        <CalendarIcon className="w-4 h-4 text-ink/40" /> {label}
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-2 bg-white border border-ink/10 rounded-card-sm shadow-card-hover p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-1.5 text-ink/40 hover:text-ink rounded-input hover:bg-paper-alt/60"
            >
              ‹
            </button>
            <span className="text-sm font-bold text-ink">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-1.5 text-ink/40 hover:text-ink rounded-input hover:bg-paper-alt/60"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-ink/40 uppercase">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) =>
              d ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleClick(d)}
                  onDoubleClick={() => handleDoubleClick(d)}
                  className={`h-8 text-xs rounded-input transition-colors ${
                    isEdge(d)
                      ? "bg-mint text-deep font-bold"
                      : isInRange(d)
                        ? "bg-mint/15 text-ink"
                        : "text-ink/70 hover:bg-paper-alt/60"
                  }`}
                >
                  {d.getDate()}
                </button>
              ) : (
                <div key={i} />
              ),
            )}
          </div>

          <p className="text-[10px] text-ink/40 mt-3">
            Clique duas datas para um intervalo, ou dê duplo clique numa data para selecionar só ela.
          </p>

          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-ink/8">
            <button
              type="button"
              onClick={clear}
              className="text-xs font-semibold text-ink/50 hover:text-ink px-3 py-1.5"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={apply}
              className="text-xs font-bold text-white bg-mint-600 hover:bg-mint-700 rounded-pill px-4 py-1.5"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
