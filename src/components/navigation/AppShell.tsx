"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { useMedia } from "@/hooks/useMedia";
import { Logo, Mark, Overlay, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { Toasts } from "@/components/ui/Toasts";
import { AskPanel } from "@/components/assistant/AskPanel";
import { BrainDump } from "@/components/modals/BrainDump";

const NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/work", label: "My Tasks", icon: "work" },
  { href: "/planner", label: "Planner", icon: "clock" },
  { href: "/focus", label: "Focus", icon: "focus" },
  { href: "/garden", label: "Garden", icon: "garden" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state, dispatch } = useApp();
  const wide = useMedia("(min-width: 1280px)");
  const [drawer, setDrawer] = useState(false);
  const focusMode = path === "/focus";
  const settingsPage = path === "/settings";
  const onAskPage = path === "/ask";
  const showPanel = wide && state.settings.askOpen && !focusMode && !onAskPage;
  const nav = NAV.filter((n) => n.href !== "/garden" || state.settings.garden !== false);
  const isActive = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  if (!state.hydrated)
    return <div className="grid min-h-dvh place-items-center"><div className="skeleton h-6 w-32" role="status" aria-label="Loading" /></div>;

  if (focusMode) return (<><main id="main" className="min-h-dvh">{children}</main><Toasts /><BrainDump /></>);

  const toggleAsk = () => (wide ? dispatch({ type: "settings", patch: { askOpen: !state.settings.askOpen } }) : setDrawer(true));

  return (
    <div className="min-h-dvh md:pl-[72px] lg:pl-[248px]">
      {/* Sidebar: icons-only on tablet, full on desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden flex-col bg-nav text-[#f4f0e8] md:flex md:w-[72px] lg:w-[248px]">
        <div className="flex h-20 items-center px-5 lg:px-6"><span className="hidden lg:block"><Logo light /></span><span className="lg:hidden"><Mark size={30} tone="dark" /></span></div>
        <nav aria-label="Primary" className="flex flex-col gap-1 px-3 lg:px-4">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined} title={n.label}
              className={cx("flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-semibold transition-colors duration-[160ms]",
                isActive(n.href) ? "bg-[#dce8d9] text-[#252044]" : "text-[#e6e2d8] hover:bg-white/10")}>
              <Icon name={n.icon} /><span className="hidden lg:inline">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 px-3 pb-5 lg:px-4">
          <Link href="/settings" aria-current={settingsPage ? "page" : undefined} title="Settings"
            className={cx("flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-semibold hover:bg-white/10", settingsPage && "bg-white/15")}>
            <Icon name="settings" /><span className="hidden lg:inline">Settings</span>
          </Link>
          <button onClick={() => dispatch({ type: "settings", patch: { theme: state.settings.theme === "dark" ? "light" : "dark" } })}
            title={state.settings.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] hover:bg-white/10">
            <Icon name={state.settings.theme === "dark" ? "sun" : "moon"} /><span className="hidden lg:inline">{state.settings.theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <div className="hidden items-center gap-3 px-3 py-2 lg:flex">
            <span className="grid size-8 place-items-center rounded-full bg-[#4f805b] text-sm font-bold" aria-hidden>{(state.settings.name || "Me").slice(0, 1).toUpperCase()}</span>
            <span className="truncate text-sm text-[#e6e2d8]">{state.settings.name || "Your profile"}</span>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur md:hidden">
        <Logo />
        <div className="flex">
          <button onClick={() => setDrawer(true)} aria-label="Open AI Coach" className="grid size-11 place-items-center rounded-full text-ai-ink hover:bg-ai-soft"><Icon name="spark" /></button>
          <Link href="/settings" aria-label="Settings" className="grid size-11 place-items-center rounded-full hover:bg-sunk"><Icon name="settings" /></Link>
        </div>
      </header>

      <div className={cx("flex", showPanel && "xl:pr-[360px]")}>
        <main id="main" key={path} className="page-enter mx-auto w-full max-w-[860px] px-4 pb-32 pt-8 sm:px-8 md:pb-16 md:pt-12">
          {children}
        </main>
      </div>

      {showPanel && (
        <aside className="fixed inset-y-0 right-0 z-20 hidden w-[360px] border-l border-line xl:block">
          <AskPanel onClose={() => dispatch({ type: "settings", patch: { askOpen: false } })} />
        </aside>
      )}

      {/* Reopen button when panel is closed */}
      {!showPanel && !onAskPage && (
        <button onClick={toggleAsk} aria-label="Open AI Coach"
          className="fixed bottom-24 right-4 z-20 hidden size-12 items-center justify-center rounded-full bg-action text-action-ink shadow-[var(--shadow-2)] transition-transform hover:scale-105 md:bottom-6 md:right-6 md:flex">
          <Icon name="spark" />
        </button>
      )}

      <Overlay open={drawer && !showPanel} onClose={() => setDrawer(false)} title="AI Coach" variant="drawer">
        <AskPanel onClose={() => setDrawer(false)} />
      </Overlay>

      {/* Mobile bottom nav */}
      <nav aria-label="Primary" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }} className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}
            className={cx("flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold", isActive(n.href) ? "text-action" : "text-muted")}>
            <Icon name={n.icon} /><span>{n.label}</span>
          </Link>
        ))}
      </nav>
      <Toasts />
      <BrainDump />
    </div>
  );
}
