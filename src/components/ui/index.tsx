"use client";
import { useEffect, useRef } from "react";
import { Icon } from "./Icon";

export function cx(...a: (string | false | null | undefined)[]) { return a.filter(Boolean).join(" "); }

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "brand" | "secondary" | "ghost" | "ai";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};
export function Button({ variant = "secondary", size = "md", loading, className, children, disabled, ...p }: BtnProps) {
  const v = {
    primary: "bg-action text-action-ink hover:brightness-110 shadow-[var(--shadow-1)]",
    brand: "bg-brand text-brand-ink hover:opacity-90",
    secondary: "bg-surface text-ink border border-line hover:bg-sunk",
    ghost: "text-ink hover:bg-sunk",
    ai: "bg-ai-soft text-ai-ink hover:brightness-95 border border-ai/60",
  }[variant];
  const s = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-[15px]", lg: "h-14 px-7 text-base" }[size];
  return (
    <button {...p} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cx("inline-flex min-w-11 items-center justify-center gap-2 rounded-[10px] font-semibold transition-[background,transform,filter,opacity] duration-[160ms] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50", v, s, className)}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange}
      className="grid size-11 shrink-0 place-items-center rounded-full">
      <span className={cx("grid size-6 place-items-center rounded-full border-2 transition-all duration-[160ms]",
        checked ? "border-action bg-action text-action-ink" : "border-muted/60 hover:border-action")}>
        {checked && <Icon name="check" size={14} />}
      </span>
    </button>
  );
}

export function Meta({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return <span className="inline-flex items-center gap-1 text-sm text-muted">{icon && <Icon name={icon} size={14} />}{children}</span>;
}
export function ProjectLabel({ name }: { name: string }) {
  return <span className="inline-flex items-center gap-1.5 text-sm text-muted"><span className="size-1.5 rounded-full bg-action" aria-hidden />{name}</span>;
}
export function PriorityMark({ high }: { high: boolean }) {
  if (!high) return null;
  return <span className="rounded-md bg-warm-soft px-1.5 py-0.5 text-xs font-bold text-ink">Priority</span>;
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cx("rounded-[16px] border border-line bg-surface shadow-[var(--shadow-1)]", className)} />;
}

export function Skeleton({ className }: { className?: string }) { return <div className={cx("skeleton", className)} aria-hidden />; }

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-line bg-surface px-6 py-12 text-center">
      <Motif className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-70" />
      <h3 className="display relative text-3xl">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-sm text-muted">{body}</p>
      {action && <div className="relative mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[16px] border border-line bg-warm-soft p-5">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-muted">{body}</p>
      {onRetry && <Button className="mt-3" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** Signature ASAP motif: layered flowing landscape forms. Used sparingly. */
export function Motif({ className, tone = "light" }: { className?: string; tone?: "light" | "deep" }) {
  const a = tone === "deep" ? "#4f805b" : "var(--sage)";
  const b = tone === "deep" ? "#6a4fc1" : "var(--ai)";
  const c = tone === "deep" ? "#f2c6ad" : "var(--warm)";
  return (
    <svg viewBox="0 0 800 160" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M0 110 C120 60 220 140 360 100 S620 40 800 90 V160 H0Z" fill={b} opacity=".35" />
      <path d="M0 130 C140 90 260 150 400 120 S660 80 800 120 V160 H0Z" fill={a} opacity=".75" />
      <path d="M0 150 C160 120 300 160 460 140 S700 120 800 145 V160 H0Z" fill={c} opacity=".55" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5" aria-label="ASAP">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill={light ? "#C8B5ED" : "var(--brand)"} />
        <path d="M5 20c4-1 5-8 9-8s4 4 9 2" stroke="#4F805B" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M5 15c3 0 5-5 9-5" stroke={light ? "#252044" : "var(--brand-ink)"} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />
      </svg>
      <span className="text-lg font-extrabold tracking-tight">ASAP</span>
    </span>
  );
}

/** Modal (center) or drawer (right). Traps focus loosely, closes on Escape. */
export function Overlay({ open, onClose, title, variant = "modal", children }: {
  open: boolean; onClose: () => void; title: string; variant?: "modal" | "drawer"; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>("button,[href],input,textarea,select,[tabindex]:not([tabindex='-1'])");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("textarea,input,button")?.focus();
    return () => { document.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 fade-enter" role="presentation">
      <div className="absolute inset-0 bg-[#252044]/50" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={cx("absolute bg-surface shadow-[var(--shadow-3)] flex flex-col",
          variant === "modal"
            ? "left-1/2 top-1/2 max-h-[88dvh] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] page-enter"
            : "right-0 top-0 h-dvh w-[min(420px,100vw)] drawer-enter")}>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onClose }: {
  open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Overlay open={open} onClose={onClose} title={title}>
      <div className="p-6">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-muted">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </div>
      </div>
    </Overlay>
  );
}
