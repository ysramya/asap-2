import type { Garden, YardItem, YardKind } from "@/types";

export type Def = { kind: YardKind; label: string; cost: number; group: "Plants" | "Furnishings"; max: number; blurb: string };
/** max > 0 means the item is alive: it starts as a seed and grows one stage per completed task. */
export const CATALOG: Def[] = [
  { kind: "flower", label: "Flower", cost: 1, group: "Plants", max: 2, blurb: "Seed, sprout, bloom" },
  { kind: "shrub", label: "Shrub", cost: 2, group: "Plants", max: 2, blurb: "A soft green mound" },
  { kind: "creeper", label: "Creeper", cost: 2, group: "Plants", max: 2, blurb: "Climbs its own trellis" },
  { kind: "tree", label: "Tree", cost: 3, group: "Plants", max: 3, blurb: "Seed to shade tree" },
  { kind: "lantern", label: "Lantern", cost: 1, group: "Furnishings", max: 0, blurb: "A warm garden light" },
  { kind: "planter", label: "Planter", cost: 1, group: "Furnishings", max: 0, blurb: "A box of blooms" },
  { kind: "bench", label: "Bench", cost: 3, group: "Furnishings", max: 0, blurb: "A place to sit" },
  { kind: "table", label: "Picnic table", cost: 4, group: "Furnishings", max: 0, blurb: "Seats for a few" },
  { kind: "firepit", label: "Fire pit", cost: 5, group: "Furnishings", max: 0, blurb: "Quiet evenings" },
  { kind: "bbq", label: "BBQ grill", cost: 5, group: "Furnishings", max: 0, blurb: "For the weekends" },
  { kind: "pond", label: "Pond", cost: 6, group: "Furnishings", max: 0, blurb: "Lily pads and ripples" },
  { kind: "gazebo", label: "Gazebo", cost: 8, group: "Furnishings", max: 0, blurb: "Shade and shelter" },
];
export const DEF = Object.fromEntries(CATALOG.map((d) => [d.kind, d])) as Record<YardKind, Def>;

/** Seeds are earned once per completed task, plus a bonus for each finished project. Nothing expires. */
export const earned = (g: Garden) => Object.values(g.plants).filter((s) => s === 3).length + g.trees.length * 3;
export const spent = (g: Garden) => g.yard.reduce((a, i) => a + DEF[i.kind].cost, 0);
export const wallet = (g: Garden) => Math.max(0, earned(g) - spent(g));

/** One completed task nudges the oldest living item that is not fully grown. */
export function advanceYard(yard: YardItem[]): YardItem[] {
  const i = yard.findIndex((y) => DEF[y.kind].max > 0 && y.growth < DEF[y.kind].max);
  return i < 0 ? yard : yard.map((y, k) => (k === i ? { ...y, growth: y.growth + 1 } : y));
}
export const isLiving = (k: YardKind) => DEF[k].max > 0;
export const stageWord = (it: YardItem) => {
  const max = DEF[it.kind].max;
  return it.growth >= max ? "Fully grown" : it.growth === 0 ? "Just a seed" : "Growing";
};
export const LAWN = { x0: 50, x1: 1150, y0: 468, y1: 628 };
export const depthScale = (y: number) => 0.8 + ((y - 440) / 190) * 0.8;
