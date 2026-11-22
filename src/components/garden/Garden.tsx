"use client";
import type { Garden as G } from "@/types";

const FOREST = "#344f3b", SAGE = "#4f805b", LEAF = "#8fb69a", MIST = "#c9dccb", PEACH = "#f2b8a0", PEACH_D = "#e39a7e", IVORY = "#faf7f2";

function Seed() {
  return (<g><path d="M-9 0 Q0 -7 9 0Z" fill="#8b7a63" opacity=".55" /><ellipse cx="0" cy="-4" rx="3.2" ry="2.2" fill={PEACH_D} /></g>);
}
function Stem({ h, lean = 0 }: { h: number; lean?: number }) {
  return <path d={`M0 0 Q${lean} ${-h / 2} ${lean * 1.4} ${-h}`} stroke={SAGE} strokeWidth="2" fill="none" strokeLinecap="round" />;
}
const leaf = (x: number, y: number, r: number, s = 1, c = LEAF) => (
  <path key={`${x}${y}${r}`} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} d="M0 0 Q9 -6 18 0 Q9 6 0 0Z" fill={c} />
);
function Sprout() {
  return (<g><Seed /><Stem h={26} lean={2} />{leaf(1, -14, -35)}{leaf(1, -20, -150, 0.85, SAGE)}</g>);
}
function Bloom({ petals = 5 }: { petals?: number }) {
  return (
    <g>
      <Seed /><Stem h={46} lean={-3} />{leaf(-1, -18, -30, 1.1)}{leaf(-1, -28, -150, 0.95, SAGE)}
      <g transform="translate(-4 -48)">
        {Array.from({ length: petals }, (_, i) => <ellipse key={i} cx="0" cy="-8" rx="4.6" ry="8" fill={i % 2 ? PEACH : "#f7cdb8"} transform={`rotate(${(360 / petals) * i})`} />)}
        <circle r="3.6" fill={IVORY} /><circle r="1.5" fill={PEACH_D} />
      </g>
    </g>
  );
}
function Tree() {
  return (
    <g>
      <path d="M-3 0 Q-2 -30 -6 -56 M3 0 Q2 -24 8 -48" stroke="#6b5a47" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="0" cy="-70" rx="26" ry="22" fill={FOREST} /><ellipse cx="-16" cy="-56" rx="17" ry="14" fill={SAGE} /><ellipse cx="17" cy="-58" rx="16" ry="13" fill={LEAF} />
      <circle cx="-6" cy="-72" r="2.4" fill={PEACH} /><circle cx="10" cy="-62" r="2" fill={PEACH} />
    </g>
  );
}
function Fern() {
  return (
    <g>
      <path d="M0 0 Q14 -26 38 -34" stroke={SAGE} strokeWidth="2" fill="none" strokeLinecap="round" />
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((t, i) => { const x = 38 * t * 1.1, y = -34 * t * 1.1 - 4; return <g key={i}>{leaf(x, y, -70, 0.5 - t * 0.2, MIST)}{leaf(x, y, 40, 0.5 - t * 0.2, LEAF)}</g>; })}
    </g>
  );
}

const slot = (i: number) => ({ x: 48 + ((i * 0.618034) % 1) * 544, y: 188 - ((i * 0.37) % 1) * 16 });

/** Decorative illustration of cumulative progress. No numbers, no pressure. */
export function GardenArt({ garden, full = false }: { garden: G; full?: boolean }) {
  const list = garden.order.map((id) => garden.plants[id]);
  const cap = full ? 36 : 9;
  const visible = list.slice(-cap);
  const base = list.length - visible.length;
  const items = [
    ...garden.trees.map((_, i) => ({ k: `t${i}`, kind: "tree", i: 40 + i * 5 })),
    ...Array.from({ length: Math.min(garden.ferns, full ? 6 : 2) }, (_, i) => ({ k: `f${i}`, kind: "fern", i: 70 + i * 7 })),
    ...visible.map((st, i) => ({ k: `p${base + i}`, kind: st === 3 ? "bloom" : st === 2 ? "sprout" : "seed", i: base + i })),
  ].map((o) => ({ ...o, ...slot(o.i) })).sort((a, b) => a.y - b.y);

  const empty = items.length === 0;
  return (
    <svg viewBox="0 0 640 220" role="img" className="garden-svg h-full w-full"
      aria-label={empty ? "An empty garden bed, ready for the first seed." : "Your garden: a quiet bed of plants that keeps growing."}>
      <defs><linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={MIST} stopOpacity=".35" /><stop offset="1" stopColor={IVORY} stopOpacity="0" /></linearGradient></defs>
      <rect width="640" height="220" fill="url(#g-sky)" />
      <path d="M0 196 Q160 182 320 192 T640 186 V220 H0Z" fill={SAGE} opacity=".16" />
      <path d="M0 204 Q200 194 400 204 T640 200 V220 H0Z" fill={FOREST} opacity=".14" />
      {empty && <circle cx="320" cy="186" r="3.5" fill={PEACH} />}
      {items.map((o, n) => (
        <g key={o.k} transform={`translate(${o.x} ${o.y})`}>
          <g className="sway" style={{ animationDelay: `${(n % 7) * -0.9}s` }}>
            {o.kind === "tree" ? <Tree /> : o.kind === "fern" ? <Fern /> : o.kind === "bloom" ? <Bloom petals={5 + (o.i % 3)} /> : o.kind === "sprout" ? <Sprout /> : <Seed />}
          </g>
        </g>
      ))}
    </svg>
  );
}

export function gardenCaption(g: G): string {
  if (!g.order.length && !g.trees.length) return "Your garden begins with your first seed.";
  if (g.trees.length) return "A tree has taken root. Your garden is growing.";
  if (Object.values(g.plants).includes(3)) return "Something has bloomed. Your garden is growing.";
  return "New growth is on its way.";
}
