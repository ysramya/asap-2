"use client";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui";
import { GardenArt, gardenCaption } from "@/components/garden/Garden";

const GROWTH = [
  ["A seed", "when you start working on a task"],
  ["A seedling", "when you finish a step"],
  ["A flower", "when you complete a task"],
  ["A tree", "when you finish a whole project"],
  ["A fern", "when you come back after a break"],
];

export default function GardenPage() {
  const { state, dispatch } = useApp();
  const on = state.settings.garden !== false;
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Optional</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">Your garden</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">A quiet picture of the work you have done. It never needs tending, and it only ever grows.</p>
      </header>
      {on ? (
        <>
          <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
            <div className="aspect-[4/3] w-full sm:aspect-[1200/640]"><GardenArt garden={state.garden} full /></div>
          </div>
          <p className="text-center text-lg">{gardenCaption(state.garden)}</p>
          <section aria-labelledby="how-h" className="rounded-[16px] border border-line bg-surface p-5">
            <h2 id="how-h" className="text-lg font-bold">How it grows</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {GROWTH.map(([a, b]) => <li key={a} className="text-[15px]"><span className="font-semibold">{a}</span> <span className="text-muted">{b}</span></li>)}
            </ul>
            <p className="mt-4 text-sm text-muted">Nothing wilts, resets or expires. Take as long as you need; it will look just as it did.</p>
          </section>
          <div><Button variant="ghost" onClick={() => dispatch({ type: "settings", patch: { garden: false } })}>Hide the garden</Button></div>
        </>
      ) : (
        <div className="rounded-[16px] border border-dashed border-line px-6 py-10 text-center">
          <p className="font-bold">The garden is hidden.</p>
          <p className="mx-auto mt-1 max-w-sm text-muted">Your progress is kept safe and will be here whenever you want it back.</p>
          <Button variant="primary" className="mt-4" onClick={() => dispatch({ type: "settings", patch: { garden: true } })}>Show the garden</Button>
        </div>
      )}
      <Link href="/" className="text-[15px] font-semibold text-muted hover:text-ink">← Back to Home</Link>
    </div>
  );
}
