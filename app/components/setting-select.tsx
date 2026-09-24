/** Строка настройки как в «Приватности»: название с подсказкой слева, select справа. */
export default function SettingSelect<T extends string | number>({
  label,
  hint,
  options,
  value,
  onChange,
  selectClassName,
}: {
  label: string;
  hint: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Например, одинаковая ширина у соседних селектов: иначе нативный select подстраивается под самый длинный вариант. */
  selectClassName?: string;
}) {
  return (
    <label className="flex gap-3 text-zinc-300 items-center justify-between">
      <span className="flex flex-grow flex-col">
        <span>{label}</span>
        <span className="text-xs text-zinc-500">{hint}</span>
      </span>
      <select
        value={String(value)}
        onChange={(event) => {
          const picked = options.find((option) => String(option.value) === event.target.value);
          if (picked) onChange(picked.value);
        }}
        className={`h-10 cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 px-3 text-white outline-none ${selectClassName ?? ''}`}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
