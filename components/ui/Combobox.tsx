import { useId } from "react";

const FIELD_CLASSES =
  "w-full px-4 py-2.5 text-sm border border-ink/10 rounded-input outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint transition-all bg-white";

/**
 * A text input with a native <datalist> of suggestions — lets the analyst
 * type to search/filter column names instead of scrolling a long <select>,
 * while still accepting any typed value (useful in edit mode when the
 * saved mapping references a column not present in a newly uploaded sample).
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
  const listId = useId();

  return (
    <>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Digite para pesquisar..."}
        autoComplete="off"
        className={`${FIELD_CLASSES} ${className}`}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
