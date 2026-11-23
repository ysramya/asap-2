"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { newId } from "@/lib/planner";
import { Button, cx } from "@/components/ui";
import { GardenArt, ItemPreview, freeSpot } from "@/components/garden/Garden";
import { CATALOG, DEF, isLiving, stageWord, wallet } from "@/lib/yard";
import type { YardKind } from "@/types";

export default function GardenPage() {
  const { state, dispatch, toast } = useApp();
  const g = state.garden;
  const on = state.settings.garden !== false;
  const [placing, setPlacing] = useState<YardKind | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const seeds = wallet(g);
  const sel = g.yard.find((i) => i.id === selectedId);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setPlacing(null); setMoving(false); setSelectedId(null); } };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  const place = (kind: YardKind, x: number, y: number) => {
    const id = newId();
    dispatch({ type: "yardPlace", id, kind, x, y });
    setPlacing(null);
    setSelectedId(id);
    toast(isLiving(kind) ? `${DEF[kind].label} planted. It grows as you finish tasks.` : `${DEF[kind].label} placed`);
  };
  const onPoint = (x: number, y: number) => {
    if (placing) place(placing, x, y);
    else if (moving && sel) { dispatch({ type: "yardMove", id: sel.id, x, y }); setMoving(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Optional</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">Your backyard</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">Each finished task earns a seed. Spend seeds on plants and furnishings, and arrange the yard however you like. Nothing wilts, expires or needs tending.</p>
      </header>

      {on ? (
        <>
          <div ref={stage} className="relative scroll-mt-4 overflow-hidden rounded-[20px] border border-line bg-surface">
            <div className="aspect-[4/3] w-full sm:aspect-[1200/640]">
              <GardenArt garden={g} edit={{ placing, selectedId, moving, onPoint, onSelect: (id) => { setSelectedId(id); setMoving(false); } }} />
            </div>
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1.5 text-sm font-bold shadow-[var(--shadow-1)] backdrop-blur"><span className="tnum">{seeds}</span> seed{seeds === 1 ? "" : "s"} to spend</div>
          </div>

          {(placing || moving) && (
            <div role="status" className="fade-enter flex flex-wrap items-center gap-3 rounded-[14px] border border-action bg-action-soft px-4 py-3">
              <p className="flex-1 font-semibold">{placing ? `Tap the lawn to place your ${DEF[placing].label.toLowerCase()}.` : `Tap the lawn to move your ${sel ? DEF[sel.kind].label.toLowerCase() : "item"}.`}</p>
              {placing && <Button size="sm" variant="primary" onClick={() => { const s = freeSpot(g.yard); place(placing, s.x, s.y); }}>Place it for me</Button>}
              <Button size="sm" onClick={() => { setPlacing(null); setMoving(false); }}>Cancel</Button>
            </div>
          )}

          {sel && !placing && !moving && (
            <section aria-label="Selected item" className="fade-enter flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3">
              <div className="flex-1">
                <p className="font-bold">{DEF[sel.kind].label}</p>
                <p className="text-sm text-muted">{isLiving(sel.kind) ? (sel.growth >= DEF[sel.kind].max ? "Fully grown. It will stay this way." : `${stageWord(sel)}. Grows a little with each task you finish.`) : "Furnishing"}</p>
              </div>
              <Button size="sm" onClick={() => setMoving(true)}>Move</Button>
              <Button size="sm" variant="ghost" onClick={() => { const it = sel; dispatch({ type: "yardRemove", id: it.id }); setSelectedId(null); toast(`${DEF[it.kind].label} removed. Seeds returned.`); }}>Remove (get seeds back)</Button>
              <Button size="sm" onClick={() => setSelectedId(null)}>Done</Button>
            </section>
          )}

          {(["Plants", "Furnishings"] as const).map((group) => (
            <section key={group} aria-labelledby={`${group}-h`}>
              <h2 id={`${group}-h`} className="mb-2 text-xl font-bold">{group}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CATALOG.filter((d) => d.group === group).map((d) => {
                  const afford = seeds >= d.cost;
                  return (
                    <li key={d.kind}>
                      <button disabled={!afford} aria-pressed={placing === d.kind} onClick={() => { setSelectedId(null); setMoving(false); setPlacing(d.kind); stage.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }}
                        className={cx("flex h-full w-full flex-col items-center gap-1 rounded-[14px] border bg-surface p-3 text-center transition-colors",
                          placing === d.kind ? "border-action bg-action-soft" : "border-line hover:bg-sunk", !afford && "opacity-55")}>
                        <ItemPreview kind={d.kind} />
                        <span className="font-semibold">{d.label}</span>
                        <span className="text-xs text-muted">{d.blurb}</span>
                        <span className="tnum mt-1 rounded-full bg-sunk px-2 py-0.5 text-xs font-bold">{d.cost} seed{d.cost === 1 ? "" : "s"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {seeds === 0 && <p className="text-center text-muted">Out of seeds for now. Finish a task and you will earn another. Your yard stays exactly as it is.</p>}

          <section aria-labelledby="how-h" className="rounded-[16px] border border-line bg-surface p-5">
            <h2 id="how-h" className="text-lg font-bold">How it works</h2>
            <ul className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
              <li><span className="font-semibold">Earn seeds</span> <span className="text-muted">one for each task you finish, three more when you complete a whole project.</span></li>
              <li><span className="font-semibold">Plant</span> <span className="text-muted">flowers, shrubs, creepers and trees start as a seed.</span></li>
              <li><span className="font-semibold">Grow</span> <span className="text-muted">every finished task grows your oldest unfinished plant by one stage.</span></li>
              <li><span className="font-semibold">Furnish</span> <span className="text-muted">benches, a gazebo, a BBQ grill, a pond and more. Move or remove anything and get seeds back.</span></li>
            </ul>
            <p className="mt-4 text-sm text-muted">No streaks, no timers, no penalties. Take as long as you need; it will look just as you left it.</p>
          </section>
          <div><Button variant="ghost" onClick={() => dispatch({ type: "settings", patch: { garden: false } })}>Hide the backyard</Button></div>
        </>
      ) : (
        <div className="rounded-[16px] border border-dashed border-line px-6 py-10 text-center">
          <p className="font-bold">The backyard is hidden.</p>
          <p className="mx-auto mt-1 max-w-sm text-muted">Your seeds and everything you have built are kept safe and will be here whenever you want it back.</p>
          <Button variant="primary" className="mt-4" onClick={() => dispatch({ type: "settings", patch: { garden: true } })}>Show the backyard</Button>
        </div>
      )}
      <Link href="/" className="text-[15px] font-semibold text-muted hover:text-ink">← Back to Home</Link>
    </div>
  );
}
