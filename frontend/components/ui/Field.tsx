"use client";

import { forwardRef, useId } from "react";

export function Field({ label, hint, error, required, children, className = "" }: {
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 flex items-baseline gap-1 text-sm font-medium text-fg">
        {label}
        {required ? <span className="text-danger" aria-hidden>*</span> : null}
        {hint ? <span className="ml-auto text-xs font-normal text-subtle">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props }, ref
) {
  return <input ref={ref} className={`field ${className}`} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = "", ...props }, ref
) {
  return <textarea ref={ref} className={`field h-auto py-2 ${className}`} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", children, ...props }, ref
) {
  return (
    <select ref={ref} className={`field appearance-none bg-[length:14px] bg-[right_8px_center] bg-no-repeat pr-8 ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236C736E' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Checkbox({ label, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const id = useId();
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 shrink-0 cursor-pointer rounded border border-strongline bg-surface accent-[rgb(var(--accent))]"
        {...props}
      />
      {label ? <label htmlFor={id} className="cursor-pointer select-none text-sm">{label}</label> : null}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? "border-transparent bg-accent" : "border-hairline bg-sunken"}`}
    >
      <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export function SegmentedControl<T extends string>({ value, onChange, options, size = "md" }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className="inline-flex items-center gap-0.5 rounded-md border border-hairline bg-sunken p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`rounded ${size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-sm"} font-medium transition-colors ${
              active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
