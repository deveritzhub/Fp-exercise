import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Field({ label, hint, error, children, className, htmlFor, optional }: { label?: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string; htmlFor?: string; optional?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="label flex items-baseline justify-between">
          <span>{label}</span>
          {optional && <span className="text-2xs font-normal text-ink-400">{optional}</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12.5px] text-bad" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: ReactNode; error?: string | null; optional?: string; leading?: ReactNode; containerClassName?: string };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, optional, className, id, leading, containerClassName, ...rest }, ref) {
  const gen = useId();
  const iid = id ?? gen;
  const input = (
    <div className={cn('relative', containerClassName)}>
      {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">{leading}</span>}
      <input ref={ref} id={iid} aria-invalid={error ? true : undefined} className={cn('input', leading ? 'pl-9' : undefined, className)} {...rest} />
    </div>
  );
  if (!label && !hint && !error) return input;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={iid} optional={optional}>
      {input}
    </Field>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; hint?: ReactNode; error?: string | null; optional?: string };
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, optional, className, id, rows = 3, ...rest }, ref) {
  const gen = useId();
  const iid = id ?? gen;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={iid} optional={optional}>
      <textarea ref={ref} id={iid} rows={rows} aria-invalid={error ? true : undefined} className={cn('input resize-y leading-relaxed', className)} {...rest} />
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; hint?: ReactNode; error?: string | null; optional?: string };
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, optional, className, id, children, ...rest }, ref) {
  const gen = useId();
  const iid = id ?? gen;
  const el = (
    <select
      ref={ref}
      id={iid}
      className={cn(
        'input appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2020%2020%27%20fill=%27%2369736f%27%3E%3Cpath%20d=%27M5.5%207.5l4.5%204.5%204.5-4.5%27%20stroke=%27%2369736f%27%20stroke-width=%271.5%27%20fill=%27none%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
  if (!label && !hint && !error) return el;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={iid} optional={optional}>
      {el}
    </Field>
  );
});

export function Checkbox({ label, description, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-ink-300 text-accent focus:ring-accent/30 accent-[rgb(var(--accent))]" {...rest} />
      <label htmlFor={id} className="text-sm leading-snug text-ink-800">
        {label}
        {description && <span className="mt-0.5 block text-[13px] text-ink-500">{description}</span>}
      </label>
    </div>
  );
}
