import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold tracking-widest text-muted uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "h-12 w-full rounded-lg border border-line bg-bg px-3 text-base text-fg placeholder:text-faint";

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <select
          className={cn(controlClass, "appearance-none pe-10")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </div>
    </Field>
  );
}

export function Chip({
  on,
  tone,
  children,
  onClick,
}: {
  on: boolean;
  tone: "danger" | "ok" | "accent";
  children: ReactNode;
  onClick: () => void;
}) {
  const active = {
    danger: "border-danger bg-danger-soft text-fg",
    ok: "border-ok bg-ok-soft text-fg",
    accent: "border-accent bg-accent text-ink",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "min-h-11 rounded-lg border px-3 py-2 text-start text-sm font-semibold transition-colors",
        on ? active : "border-line bg-surface-2 text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function Segment<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors",
            value === option.id
              ? "border-accent bg-accent text-ink"
              : "border-line bg-surface-2 text-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  label,
  hint,
  value,
  onChange,
  onBump,
  tone,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  onBump: (dir: -1 | 1) => void;
  tone: "danger" | "ok" | "plain";
}) {
  const color = tone === "danger" ? "text-danger" : tone === "ok" ? "text-ok" : "text-fg";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        {hint ? <span className="text-xs text-faint">{hint}</span> : null}
      </div>
      <div dir="ltr" className="flex items-center gap-2">
        <button
          type="button"
          className="grid size-12 place-items-center rounded-lg border border-line bg-surface-2 text-xl text-fg"
          onClick={() => onBump(-1)}
          aria-label="-"
        >
          −
        </button>
        <input
          inputMode="decimal"
          className={cn(
            "h-12 w-full rounded-lg border border-line bg-bg text-center font-mono text-xl font-semibold",
            color,
          )}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
        />
        <button
          type="button"
          className="grid size-12 place-items-center rounded-lg border border-line bg-surface-2 text-xl text-fg"
          onClick={() => onBump(1)}
          aria-label="+"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12.04 3C7.31 3 3.5 6.8 3.5 11.5c0 1.49.39 2.94 1.14 4.22L3.4 21l5.45-1.43a8.6 8.6 0 0 0 4.19 1.07h.01c4.73 0 8.54-3.8 8.54-8.5C21.59 6.8 16.77 3 12.04 3zm4.9 12.02c-.2.58-1.2 1.08-1.67 1.15-.43.06-.97.09-1.56-.1-.36-.11-.82-.27-1.41-.52-2.48-1.07-4.1-3.58-4.22-3.74-.13-.17-1.02-1.36-1.02-2.6s.65-1.84.88-2.09.5-.32.67-.32h.48c.15 0 .36-.06.56.43.21.5.71 1.74.77 1.86.06.13.1.28.02.44-.08.17-.12.27-.23.42-.12.15-.25.33-.35.44-.12.11-.24.24-.1.48.14.23.6.98 1.28 1.58.88.78 1.62 1.02 1.85 1.14.23.11.36.1.49-.06.13-.16.57-.66.72-.89.15-.23.3-.19.51-.11.21.07 1.32.62 1.55.74.23.11.37.17.43.26.06.09.06.55-.15 1.13z" />
    </svg>
  );
}
