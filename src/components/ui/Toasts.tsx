"use client";
import { useApp } from "@/lib/store";
export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2 lg:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="page-enter pointer-events-auto flex items-center gap-4 rounded-[12px] bg-brand px-4 py-3 text-brand-ink shadow-[var(--shadow-2)]">
          <span className="text-sm font-semibold">{t.text}</span>
          {t.undo && <button className="text-sm font-bold underline underline-offset-2" onClick={() => { t.undo?.(); dismissToast(t.id); }}>Undo</button>}
        </div>
      ))}
    </div>
  );
}
