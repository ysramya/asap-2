"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Garden as G } from "@/types";
import { useApp } from "@/lib/store";
import { DEF, LAWN, depthScale, isLiving, stageWord, wallet } from "@/lib/yard";
import type { YardKind } from "@/types";

/**
 * An illustrated, layered backyard with one coherent breeze.
 *
 * Artwork is generated from seeded randomness so every tree, leaf cluster and
 * flower is unique but stable between renders. Movement is a single wind model
 * (see `wind()` and the `.w` rules in globals.css): every swaying part pivots
 * at its own base and nests inside its parent, so a twig moves with its branch,
 * its branch with its limb, and the trunk stays still.
 */

/* ───────────── seeded randomness and path helpers ───────────── */
type R = () => number;
function rng(seed: number): R {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r: R, a: number, b: number) => a + (b - a) * r();
const f1 = (n: number) => Math.round(n * 10) / 10;
const rad = Math.PI / 180;
type Pt = [number, number];
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const pt = (p: Pt) => `${f1(p[0])} ${f1(p[1])}`;

/** Local frame: origin (x,y), axis angle a in degrees (0 = up, clockwise). */
function frame(x: number, y: number, a: number) {
  const s = Math.sin(a * rad), c = Math.cos(a * rad);
  return (u: number, v: number) => `${f1(x + u * s + v * c)} ${f1(y - u * c + v * s)}`;
}
/** A leaf outline, optionally curved by `bend`. */
function leaf(x: number, y: number, a: number, L: number, W: number, bend = 0) {
  const p = frame(x, y, a);
  return `M${p(0, 0)}C${p(L * 0.28, -W + bend)} ${p(L * 0.72, -W * 0.85 + bend)} ${p(L, bend * 1.3)}C${p(L * 0.72, W * 0.85 + bend)} ${p(L * 0.28, W + bend)} ${p(0, 0)}Z`;
}
/** A tapered, leaning grass blade rising from (x, y). */
function blade(x: number, y: number, h: number, lean: number, bw: number) {
  return `M${f1(x - bw)} ${f1(y)}Q${f1(x + lean * 0.2 - bw * 0.4)} ${f1(y - h * 0.55)} ${f1(x + lean)} ${f1(y - h)}Q${f1(x + lean * 0.3 + bw * 0.7)} ${f1(y - h * 0.5)} ${f1(x + bw)} ${f1(y)}Z`;
}
/** A soft, irregular closed shape. */
function blob(cx: number, cy: number, rx: number, ry: number, r: R, n = 9, j = 0.2) {
  const p: Pt[] = Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2, k = 1 + (r() - 0.5) * 2 * j;
    return [cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k];
  });
  const m = (i: number) => mid(p[i], p[(i + 1) % n]);
  let d = `M${pt(m(n - 1))}`;
  for (let i = 0; i < n; i++) d += `Q${pt(p[i])} ${pt(m(i))}`;
  return d + "Z";
}
function through(p: Pt[]) {
  let d = "";
  for (let i = 1; i < p.length - 1; i++) d += `Q${pt(p[i])} ${pt(mid(p[i], p[i + 1]))}`;
  return d + `L${pt(p[p.length - 1])}`;
}
const dot = (x: number, y: number, r: number) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(r * 2)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-r * 2)} 0Z`;

/* ───────────── the wind ─────────────
 * One direction (left to right), one travelling phase. Each part gets an
 * amplitude (degrees), a period, and a phase set by where it stands, so the
 * breeze visibly crosses the scene. A second, slower, unrelated cycle is
 * layered on top, which makes gusts without any visible loop point. */
type Css = CSSProperties & Record<string, string | number>;
function wind(r: R, amp: number, period: number, worldX: number): Css {
  const ta = period * between(r, 0.92, 1.08);
  const tb = ta * between(r, 1.45, 1.9);
  return {
    "--a": f1(amp * between(r, 0.85, 1.15)),
    "--ta": `${f1(ta)}s`,
    "--da": `${f1(-(ta * (1 - worldX / 2400)) + between(r, -0.5, 0.5))}s`,
    "--tb": `${f1(tb)}s`,
    "--db": `${f1(-r() * tb)}s`,
  };
}

/* ───────────── foliage, trees ───────────── */
function clusterData(r: R, radius: number) {
  const tones = ["", "", ""];
  const n = Math.round(radius * 0.75) + 8;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * radius * 0.92;
    const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.82;
    const dir = Math.atan2(x, -y) / rad + between(r, -55, 55);
    const L = between(r, radius * 0.26, radius * 0.44), W = L * between(r, 0.26, 0.42);
    const score = (x * 0.55 - y * 0.85) / radius + (r() - 0.5) * 0.6;
    tones[score > 0.36 ? 2 : score > -0.2 ? 1 : 0] += leaf(x, y, dir, L, W, between(r, -2.5, 2.5));
  }
  return { blob: blob(0, 0, radius * 0.9, radius * 0.74, r, 10, 0.16), tones };
}

type TreeOpts = { ox: number; maxD: number; kids: number[]; tipRad: number; grow: boolean };

function cluster(r: R, x: number, y: number, radius: number, o: TreeOpts, key: string): ReactNode {
  const c = clusterData(r, radius);
  return (
    <g key={key} transform={`translate(${f1(x)} ${f1(y)})`}>
      <g className={o.grow ? "fol" : undefined}>
        <g className="w" style={wind(r, 1.7, 8.5, o.ox)}>
          <path d={c.blob} fill="var(--g-l0)" />
          {c.tones.map((d, i) => i === 0
            ? <path key={i} d={d} fill="var(--g-l0)" />
            : <g key={i} className="w1" style={wind(r, 2.7, 6.5, o.ox)}><path d={d} fill={`var(--g-l${i})`} /></g>)}
        </g>
      </g>
    </g>
  );
}

const WIND_BY_DEPTH = [
  { a: 0, T: 1 },
  { a: 0.5, T: 13 },   // large limbs: barely move
  { a: 0.85, T: 10 },  // branches
  { a: 1.25, T: 8 },   // twigs
];

function limb(r: R, depth: number, len: number, w: number, o: TreeOpts): ReactNode[] {
  const curve = between(r, -0.16, 0.16) * len;
  const tip: Pt = [curve * 0.6, -len];
  const out: ReactNode[] = [];
  out.push(<path key="p" d={`M0 0Q${f1(curve)} ${f1(-len / 2)} ${pt(tip)}`} stroke="var(--g-trunk)" strokeWidth={f1(w)} strokeLinecap="round" fill="none" />);
  if (depth <= 1) out.push(<path key="h" d={`M${f1(w * 0.2)} 0Q${f1(curve + w * 0.2)} ${f1(-len / 2)} ${f1(tip[0] + w * 0.2)} ${f1(tip[1])}`} stroke="var(--g-trunk-hi)" strokeWidth={f1(w * 0.3)} strokeLinecap="round" fill="none" opacity=".5" />);
  if (depth < o.maxD) {
    const n = o.kids[depth];
    for (let i = 0; i < n; i++) {
      const t = between(r, 0.42 + (0.5 * i) / n, 0.5 + (0.5 * i) / n);
      const bx = 2 * (1 - t) * t * curve + t * t * tip[0], by = -len * t;
      const side = i % 2 ? 1 : -1;
      const ang = side * between(r, 20, 46);
      const cl = len * between(r, 0.62, 0.78), cw = w * 0.62;
      const wd = WIND_BY_DEPTH[Math.min(depth + 1, 3)];
      out.push(
        <g key={`k${i}`} transform={`translate(${f1(bx)} ${f1(by)})`}>
          <g className="w" style={wind(r, wd.a, wd.T, o.ox + bx)}>
            <g transform={`rotate(${f1(ang)})`}>{limb(r, depth + 1, cl, cw, o)}</g>
          </g>
        </g>,
      );
    }
  }
  if (depth >= 1 && depth < o.maxD) {
    const t = 0.58, mx = 2 * (1 - t) * t * curve + t * t * tip[0], my = -len * t;
    out.push(cluster(r, mx + between(r, -6, 6), my, o.tipRad * between(r, 0.8, 1.0), o, "m"));
  }
  if (depth >= o.maxD - 1) {
    const big = depth === o.maxD ? 1 : 1.18;
    out.push(cluster(r, tip[0], tip[1], o.tipRad * big * between(r, 0.85, 1.12), o, "c"));
  }
  return out;
}

function Tree({ seed, ox, anchor = false, grow = false }: { seed: number; ox: number; anchor?: boolean; grow?: boolean }) {
  const r = rng(seed);
  const o: TreeOpts = anchor
    ? { ox, maxD: 3, kids: [5, 2, 2], tipRad: 31, grow }
    : { ox, maxD: 2, kids: [3, 2], tipRad: 26, grow };
  const len = anchor ? 138 : 96, w0 = anchor ? 34 : 19, w1 = anchor ? 14 : 8;
  const curve = between(r, -10, 10) * (anchor ? 1 : 0.7);
  const N = 8, Lp: Pt[] = [], Rp: Pt[] = [], Hp: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, cx = 2 * (1 - t) * t * curve + t * t * curve * 0.6, cy = -len * t;
    const e = (1 - t) ** 1.2;
    const hw = (w0 / 2) * e + (w1 / 2) * (1 - e) + w0 * 0.4 * Math.exp(-t * 9);
    Lp.push([cx - hw, cy]); Rp.push([cx + hw, cy]); Hp.push([cx + hw * 0.2, cy]);
  }
  const body = `M${pt(Lp[0])}${through(Lp)}L${pt(Rp[N])}${through([...Rp].reverse())}Z`;
  const hi = `M${pt(Hp[0])}${through(Hp)}L${pt(Rp[N])}${through([...Rp].reverse())}Z`;
  const bark = [0.28, 0.6, 0.8].map((k, i) => {
    const pts: Pt[] = [];
    for (let j = 1; j <= 6; j++) { const t = (j / 6) * (0.55 + i * 0.1) + 0.04, cx = 2 * (1 - t) * t * curve + t * t * curve * 0.6; pts.push([cx - (w0 / 2) * (1 - t) * (1 - k * 1.1) + between(r, -.6, .6), -len * t]); }
    return `M${pt(pts[0])}${through(pts)}`;
  });
  const limbs: ReactNode[] = [];
  const n = o.kids[0];
  const ts = anchor ? [0.55, 0.62, 0.78, 0.86, 1] : [0.6, 0.78, 1];
  const as = anchor ? [-50, 38, -26, 24, 0] : [-42, 34, 0];
  for (let i = 0; i < n; i++) {
    const t = ts[i], bx = 2 * (1 - t) * t * curve + t * t * curve * 0.6, by = -len * t;
    const ll = len * (anchor ? between(r, 0.66, 0.8) : between(r, 0.7, 0.86));
    const wd = WIND_BY_DEPTH[1];
    limbs.push(
      <g key={`L${i}`} transform={`translate(${f1(bx)} ${f1(by)})`}>
        <g className="w" style={wind(r, wd.a, wd.T, ox + bx)}>
          <g transform={`rotate(${f1(as[i] + between(r, -7, 7))})`}>{limb(r, 1, ll, w1 * 0.78, o)}</g>
        </g>
      </g>,
    );
  }
  return (
    <g>
      <ellipse cx={f1(curve * 0.5 + 14)} cy="3" rx={anchor ? 120 : 62} ry={anchor ? 13 : 7} fill="var(--g-shadow)" opacity=".2" />
      <path d={body} fill="var(--g-trunk)" />
      <path d={hi} fill="var(--g-trunk-hi)" opacity=".42" />
      <path d={bark.join("")} stroke="var(--g-trunk-dk)" strokeWidth=".9" fill="none" opacity=".5" strokeLinecap="round" />
      {limbs}
    </g>
  );
}

/* ───────────── background silhouettes ───────────── */
const ridge = (base: number, a1: number, a2: number, p1: number, p2: number) => (x: number) =>
  base + a1 * Math.sin(x / 210 + p1) + a2 * Math.sin(x / 83 + p2);
function ridgePath(fn: (x: number) => number) {
  let d = `M-20 ${f1(fn(-20))}`;
  for (let x = -8; x <= 1220; x += 12) d += `L${x} ${f1(fn(x))}`;
  return d + "V660H-20Z";
}
function silTree(r: R, x: number, y: number, h: number, fill: string, key: string): ReactNode {
  const wdt = h * between(r, 0.34, 0.5);
  const d = blob(0, -h * 0.66, wdt, h * 0.36, r, 8, 0.2) + blob(-wdt * 0.5, -h * 0.5, wdt * 0.6, h * 0.26, r, 7, 0.2) + blob(wdt * 0.5, -h * 0.55, wdt * 0.62, h * 0.27, r, 7, 0.2);
  return (
    <g key={key} transform={`translate(${f1(x)} ${f1(y)})`}>
      <g className="w1" style={wind(r, 0.5, 15, x)}>
        <path d={`M0 0V${f1(-h * 0.5)}`} stroke={fill} strokeWidth={f1(Math.max(1.4, h * 0.05))} />
        <path d={d} fill={fill} />
      </g>
    </g>
  );
}

/* ───────────── ground, path, grasses ───────────── */
function tuft(r: R, h: number, blades: number, spread: number) {
  let d = "";
  for (let i = 0; i < blades; i++) {
    const t = blades === 1 ? 0 : i / (blades - 1) - 0.5;
    const hh = h * between(r, 0.55, 1.05) * (1 - Math.abs(t) * 0.35);
    d += blade(t * spread + between(r, -2, 2), 0, hh, t * h * 0.5 + between(r, -h * 0.18, h * 0.22), between(r, 0.9, 1.7) * (h / 40 + 0.5));
  }
  return d;
}

function Grass({ r, x, y, h, blades, a, T, tones, k, wx }: { r: R; x: number; y: number; h: number; blades: number; a: number; T: number; tones: [string, string, string]; k: string; wx?: number }) {
  return (
    <g key={k} transform={`translate(${f1(x)} ${f1(y)})`}>
      {tones.map((c, i) => (
        <g key={i} className="w" style={wind(r, a * between(r, 0.8, 1.3), T * between(r, 0.8, 1.2), wx ?? x)}>
          <path d={tuft(r, h * between(r, 0.8, 1.1), blades, h * 0.55)} fill={c} transform={`translate(${f1((i - 1) * h * 0.22)} 0)`} />
        </g>
      ))}
    </g>
  );
}

function shrub(r: R, x: number, y: number, s: number, key: string): ReactNode {
  const o: TreeOpts = { ox: x, maxD: 0, kids: [], tipRad: 0, grow: false };
  const parts: ReactNode[] = [];
  const spots: Pt[] = [[-30, -22], [0, -34], [30, -20], [-12, -14], [16, -12]];
  spots.forEach(([cx, cy], i) => parts.push(cluster(r, cx + between(r, -4, 4), cy, between(r, 20, 28), o, `s${i}`)));
  return (
    <g key={key} transform={`translate(${f1(x)} ${f1(y)}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="62" ry="8" fill="var(--g-shadow)" opacity=".2" />
      {parts}
    </g>
  );
}

/* ───────────── flowers ───────────── */
const PALETTES: [string, string][] = [
  ["var(--g-peach)", "var(--g-peachL)"],
  ["var(--g-peach2)", "var(--g-peach)"],
  ["var(--g-ivory)", "var(--g-peachL)"],
];

function Head({ kind, r }: { kind: number; r: R }) {
  const [c1, c2] = PALETTES[Math.floor(r() * PALETTES.length)];
  if (kind === 0) {
    const n = 7 + Math.floor(r() * 3), L = between(r, 13, 17);
    let a = "", b = "";
    for (let k = 0; k < n; k++) { const d = leaf(0, 0, (k * 360) / n + between(r, -6, 6), L * between(r, 0.9, 1.1), L * 0.36, between(r, -1.4, 1.4)); if (k % 2) b += d; else a += d; }
    return (<g transform="scale(1 .86)"><path d={a} fill={c1} /><path d={b} fill={c2} /><circle r="3.5" fill="var(--g-center)" /><circle cx=".9" cy="-.9" r="1.3" fill="var(--g-ivory)" opacity=".6" /></g>);
  }
  if (kind === 1) {
    const w = between(r, 8, 10);
    return (
      <g transform="translate(0 4)">
        <path d={`M${-w} 1C${-w - 3} -11 ${-w * 0.5} -20 -1 -24C0 -12 0 -4 ${-w * 0.2} 3Z`} fill="var(--g-peach2)" />
        <path d={`M${w} 1C${w + 3} -11 ${w * 0.5} -20 1 -24C0 -12 0 -4 ${w * 0.2} 3Z`} fill="var(--g-peach2)" />
        <path d={`M${-w * 0.85} 2C${-w} -12 -3 -20 0 -25C3 -20 ${w} -12 ${w * 0.85} 2C${w * 0.4} 6 ${-w * 0.4} 6 ${-w * 0.85} 2Z`} fill={c1} />
        <path d={`M${-w * 0.3} -3C${-w * 0.3} -12 -1 -19 1 -22C1 -14 ${w * 0.1} -8 ${w * 0.2} -3Z`} fill="var(--g-ivory)" opacity=".5" />
      </g>
    );
  }
  if (kind === 2) {
    let a = "", b = "";
    for (let j = 0; j < 11; j++) {
      const side = j % 2 ? 1 : -1, y = -4 + j * 3, rr = Math.max(1.1, 2.6 - j * 0.12), x = side * (1.6 + (1 - j / 11) * 3.4);
      const d = `M${f1(x - rr)} ${f1(y)}a${f1(rr)} ${f1(rr * 1.25)} 0 1 0 ${f1(rr * 2)} 0a${f1(rr)} ${f1(rr * 1.25)} 0 1 0 ${f1(-rr * 2)} 0Z`;
      if (j % 3) a += d; else b += d;
    }
    return (<g><path d={a} fill="var(--g-indigo)" /><path d={b} fill="var(--g-indigo2)" /></g>);
  }
  let a = "";
  for (let k = 0; k < 5; k++) a += leaf(0, 0, k * 72 + between(r, -8, 8), between(r, 11, 14), 8.6, between(r, -1, 1));
  return (<g transform="scale(1 .88)"><path d={a} fill="var(--g-ivory)" stroke={c1} strokeWidth=".9" strokeLinejoin="round" /><circle r="3.1" fill="var(--g-indigo)" /><circle r="5" fill="none" stroke="var(--g-indigo)" strokeWidth=".7" strokeDasharray="1 1.6" opacity=".7" /></g>);
}

function Seed() {
  return (
    <g>
      <path d="M-10 0Q-5 -6 0 -6Q6 -6 10 0Z" fill="var(--g-soil)" />
      <path d="M-4 -2.5Q0 -5 5 -2.5" stroke="var(--g-shadow)" strokeWidth=".8" fill="none" opacity=".4" />
      <ellipse cx=".5" cy="-6.2" rx="2.6" ry="1.9" fill="var(--g-peach2)" />
      <ellipse cx="-.2" cy="-6.7" rx="1" ry=".6" fill="var(--g-peachL)" opacity=".8" />
    </g>
  );
}

function Plant({ stage, idx, x }: { stage: number; idx: number; x: number }) {
  if (stage <= 1) return <Seed />;
  const r = rng(idx * 7919 + 101);
  const h = stage === 2 ? between(r, 26, 34) : between(r, 66, 98);
  const lean = between(r, -13, 13) * (h / 80);
  const stem = `M0 0Q${f1(lean * 0.6)} ${f1(-h * 0.5)} ${f1(lean)} ${f1(-h)}`;
  const at = (t: number): Pt => [2 * (1 - t) * t * lean * 0.6 + t * t * lean, -h * t];
  let la = "", lb = "";
  const nl = stage === 2 ? 2 : 3;
  for (let i = 0; i < nl; i++) {
    const t = 0.2 + i * 0.2 + between(r, -0.03, 0.03), p = at(t), side = i % 2 ? 1 : -1;
    const d = leaf(p[0], p[1], side * between(r, 38, 66), stage === 2 ? between(r, 12, 17) : between(r, 20, 32), stage === 2 ? 4 : 5.2, side * between(r, 1, 3));
    if (i % 2) la += d; else lb += d;
  }
  const tilt = (lean / h) * 40;
  return (
    <g className="w" style={wind(r, stage === 2 ? 1.8 : 2.3, between(r, 7.5, 11), x)}>
      <Seed />
      <path d={stem} stroke="var(--g-stem)" strokeWidth={stage === 2 ? 2 : 2.4} strokeLinecap="round" fill="none" />
      <path d={la} fill="var(--g-l1)" /><path d={lb} fill="var(--g-l2)" />
      {stage === 2 ? (
        <g transform={`translate(${f1(lean)} ${f1(-h)})`}>
          <path d={leaf(0, 0, -34, 10, 3.6, -1) + leaf(0, 0, 34, 10, 3.6, 1)} fill="var(--g-l2)" />
          <path d={leaf(0, 0, 0, 9, 3, 0)} fill="var(--g-l1)" />
        </g>
      ) : (
        <g transform={`translate(${f1(lean)} ${f1(-h)})`}>
          <g className="w" style={wind(r, 3.2, between(r, 5.5, 8.5), x)}>
            <g transform={`rotate(${f1(tilt)})`}><g className="head-in"><Head kind={idx % 4} r={r} /></g></g>
          </g>
        </g>
      )}
    </g>
  );
}

/* ───────────── yard items ───────────── */
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const Shadow = ({ rx, ry = 6 }: { rx: number; ry?: number }) => <ellipse cx="0" cy="2" rx={rx} ry={ry} fill="var(--g-shadow)" opacity=".22" />;

function Gazebo() {
  let balus = "";
  for (let x = -47; x <= 47; x += 8) balus += rect(x - 1, -31, 2, 21);
  return (
    <g>
      <Shadow rx={88} ry={10} />
      <path d="M-68 0L68 0L62 -9L-62 -9Z" fill="var(--g-wood2)" />
      <path d="M-62 -9L62 -9L58 -12L-58 -12Z" fill="var(--g-wood-hi)" />
      <path d={rect(-50, -80, 100, 68)} fill="var(--g-shadow)" opacity=".2" />
      {[-52, -18, 18, 52].map((x) => <path key={x} d={rect(x - 3, -82, 6, 72)} fill="var(--g-wood)" />)}
      <path d={rect(-52, -33, 104, 3) + rect(-52, -12, 104, 2)} fill="var(--g-wood2)" />
      <path d={balus} fill="var(--g-wood2)" />
      <path d="M-84 -82L0 -136L84 -82Q0 -72 -84 -82Z" fill="var(--g-roof)" />
      <path d="M0 -136L84 -82Q42 -77 0 -78Z" fill="var(--g-roof-hi)" opacity=".5" />
      <path d="M-40 -108L-30 -80M-20 -122L-14 -78M20 -122L14 -78M40 -108L30 -80" stroke="var(--g-shadow)" strokeWidth=".9" opacity=".3" fill="none" />
      <path d="M-84 -82Q0 -72 84 -82L78 -78Q0 -68 -78 -78Z" fill="var(--g-shadow)" opacity=".35" />
      <path d="M-2 -136L0 -150L2 -136Z" fill="var(--g-wood2)" /><circle cy="-150" r="2.6" fill="var(--g-wood-hi)" />
      <g transform="translate(0 -76)"><g className="w" style={{ "--a": 3, "--ta": "6.5s", "--da": "-2s", "--tb": "10s", "--db": "-4s" } as Css}>
        <path d="M0 0V14" stroke="var(--g-metal)" strokeWidth="1" />
        <circle cy="26" r="15" fill="var(--g-glow)" opacity=".4" className="glow2" />
        <path d="M-5 14h10l-1.5 15h-7Z" fill="var(--g-metal)" /><path d="M-3 17h6l-1 9h-4Z" fill="var(--g-flame2)" />
      </g></g>
    </g>
  );
}
function Bench() {
  return (
    <g>
      <Shadow rx={44} />
      <path d={rect(-31, -14, 4, 14) + rect(27, -14, 4, 14)} fill="var(--g-wood2)" />
      <path d={rect(-33, -42, 3, 28) + rect(30, -42, 3, 28)} fill="var(--g-wood2)" />
      <path d={rect(-33, -41, 66, 5) + rect(-33, -33, 66, 5) + rect(-33, -25, 66, 5)} fill="var(--g-wood)" />
      <path d={rect(-38, -18, 76, 5)} fill="var(--g-wood-hi)" />
      <path d={rect(-38, -13, 76, 2)} fill="var(--g-shadow)" opacity=".3" />
      <path d={rect(-38, -28, 6, 3) + rect(32, -28, 6, 3)} fill="var(--g-wood2)" />
    </g>
  );
}
function Bbq() {
  return (
    <g>
      <Shadow rx={30} />
      <path d="M-9 -26L-17 0M9 -26L17 0M0 -26L0 -3" stroke="var(--g-metal)" strokeWidth="2.4" strokeLinecap="round" />
      <path d={rect(21, -28, 17, 3) + rect(35, -26, 2, 24)} fill="var(--g-wood2)" />
      <path d="M-21 -30Q0 -2 21 -30Z" fill="var(--g-metal)" />
      <ellipse cy="-30" rx="17" ry="2.6" fill="var(--g-flame)" opacity=".85" className="glow2" />
      <g transform="rotate(-13 -21 -31)"><path d="M-22 -31Q0 -58 22 -31Z" fill="var(--g-metal2)" /><path d="M-8 -50Q0 -54 8 -50" stroke="var(--g-ivory)" strokeWidth="1" opacity=".3" fill="none" /><path d={rect(-4, -56, 8, 3)} fill="var(--g-wood2)" /></g>
      {[0, 1, 2].map((i) => <path key={i} className="smoke" style={{ "--sd": `${i * 2.6}s` } as Css} d={`M${i * 5 - 5} -50c-6 -8 6 -14 0 -24`} stroke="var(--g-cloud)" strokeWidth="2.2" strokeLinecap="round" fill="none" />)}
    </g>
  );
}
function FirePit() {
  const r = rng(5);
  let ring = "";
  for (let i = 0; i < 11; i++) { const t = (i / 11) * Math.PI * 2; ring += blob(Math.cos(t) * 26, -5 + Math.sin(t) * 8.5, 7, 4.8, r, 7, 0.12); }
  return (
    <g>
      <Shadow rx={36} ry={9} />
      <ellipse cy="-5" rx="22" ry="7" fill="var(--g-metal)" />
      <ellipse cy="-30" rx="46" ry="22" fill="var(--g-flame)" opacity=".14" className="glow2" />
      <g transform="translate(0 -6)">
        <g className="flame"><path d="M-9 0C-14 -10 -4 -15 -2 -26C5 -17 11 -10 9 0Z" fill="var(--g-flame)" /></g>
        <g className="flame" style={{ animationDelay: "-.7s" } as Css}><path d="M-4 0C-6 -6 -1 -10 0 -17C3 -10 6 -5 4 0Z" fill="var(--g-flame2)" /></g>
      </g>
      <path d={ring} fill="var(--g-stone)" /><path d={ring} fill="none" stroke="var(--g-shadow)" strokeWidth=".8" opacity=".3" />
    </g>
  );
}
function Table() {
  return (
    <g>
      <Shadow rx={56} ry={8} />
      <path d="M-34 -38L-28 -2M34 -38L28 -2M-26 -38L-14 -2M26 -38L14 -2" stroke="var(--g-wood2)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M-50 -40L50 -40L46 -33L-46 -33Z" fill="var(--g-wood-hi)" />
      <path d="M-46 -33L46 -33L46 -30L-46 -30Z" fill="var(--g-wood2)" />
      <path d={rect(-44, -20, 88, 4)} fill="var(--g-wood)" /><path d={rect(-44, -16, 88, 2)} fill="var(--g-shadow)" opacity=".3" />
      <path d={rect(-34, -16, 4, 15) + rect(30, -16, 4, 15)} fill="var(--g-wood2)" />
    </g>
  );
}
function Lantern() {
  return (
    <g>
      <Shadow rx={12} ry={3} />
      <path d={rect(-2, -76, 4, 76)} fill="var(--g-metal)" />
      <circle cy="-84" r="19" fill="var(--g-glow)" opacity=".36" className="glow2" />
      <path d="M-9 -76L9 -76L7 -94L-7 -94Z" fill="var(--g-metal)" /><path d="M-5.5 -79L5.5 -79L4.5 -91L-4.5 -91Z" fill="var(--g-flame2)" />
      <path d="M-11 -94L0 -103L11 -94Z" fill="var(--g-metal)" />
    </g>
  );
}
function Planter({ seed }: { seed: number }) {
  const r = rng(seed);
  const stems: ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const x = -16 + i * 6.4 + between(r, -1.5, 1.5), h = between(r, 16, 32), lean = between(r, -4, 4);
    stems.push(
      <g key={i} transform={`translate(${f1(x)} -16)`}><g className="w" style={wind(r, 3, between(r, 6, 9), 0)}>
        <path d={`M0 0Q${lean * 0.5} ${-h / 2} ${lean} ${-h}`} stroke="var(--g-stem)" strokeWidth="1.5" fill="none" />
        <path d={leaf(0, -h * 0.4, -50, 9, 3) + leaf(0, -h * 0.3, 50, 9, 3)} fill="var(--g-l2)" />
        <circle cx={lean} cy={-h} r={between(r, 3, 4.2)} fill={i % 2 ? "var(--g-peach)" : "var(--g-ivory)"} /><circle cx={lean} cy={-h} r="1.3" fill="var(--g-center)" />
      </g></g>,
    );
  }
  return (
    <g>
      <Shadow rx={28} ry={4} />
      {stems}
      <path d="M-22 -16L22 -16L19 0L-19 0Z" fill="var(--g-wood)" /><path d={rect(-24, -19, 48, 4)} fill="var(--g-wood-hi)" />
      <path d="M-8 -14L-7 0M8 -14L7 0" stroke="var(--g-wood2)" strokeWidth="1" />
    </g>
  );
}
function Pond() {
  const r = rng(11);
  let rim = "";
  for (let i = 0; i < 22; i++) { const t = (i / 22) * Math.PI * 2; rim += blob(Math.cos(t) * 78, -6 + Math.sin(t) * 18.5, between(r, 6, 10), between(r, 3.4, 5), r, 7, 0.12); }
  return (
    <g>
      <ellipse cy="-5" rx="84" ry="22" fill="var(--g-shadow)" opacity=".16" />
      <ellipse cy="-6" rx="76" ry="17" fill="var(--g-water)" />
      <ellipse cx="-14" cy="-9" rx="48" ry="8" fill="var(--g-water-hi)" opacity=".45" />
      <g transform="translate(24 -6)"><ellipse className="ripple" rx="22" ry="5" fill="none" stroke="var(--g-ivory)" strokeWidth="1.2" /></g>
      <g transform="translate(-30 -2)"><ellipse className="ripple" style={{ animationDelay: "-3s" } as Css} rx="22" ry="5" fill="none" stroke="var(--g-ivory)" strokeWidth="1.2" /></g>
      <ellipse cx="-34" cy="-6" rx="11" ry="3.4" fill="var(--g-l1)" /><ellipse cx="12" cy="-10" rx="9" ry="2.8" fill="var(--g-l2)" /><ellipse cx="40" cy="-4" rx="8" ry="2.6" fill="var(--g-l1)" />
      <circle cx="-31" cy="-8" r="2.6" fill="var(--g-peach)" /><circle cx="14" cy="-12" r="2.2" fill="var(--g-ivory)" />
      <path d={rim} fill="var(--g-stone)" /><path d={rim} fill="none" stroke="var(--g-shadow)" strokeWidth=".8" opacity=".25" />
    </g>
  );
}
function Creeper({ growth, seed, x }: { growth: number; seed: number; x: number }) {
  if (growth <= 0) return <Seed />;
  const r = rng(seed);
  const pt = (t: number): Pt => {
    if (t < 0.4) return [-24, (-96 * t) / 0.4];
    if (t < 0.6) { const u = (t - 0.4) / 0.2; return [(1 - u) ** 2 * -24 + u * u * 24, (1 - u) ** 2 * -96 + 2 * u * (1 - u) * -132 + u * u * -96]; }
    return [24, -96 * (1 - (t - 0.6) / 0.4)];
  };
  const tmax = growth >= 2 ? 1 : 0.38;
  let vine = `M${pt(0).join(" ")}`, la = "", lb = "", bl = "";
  for (let t = 0.02; t <= tmax; t += 0.02) {
    const [px, py] = pt(t);
    vine += `L${f1(px + between(r, -2, 2))} ${f1(py)}`;
    for (let k = 0; k < 2; k++) { const d = leaf(px, py, between(r, 0, 360), between(r, 8, 14), between(r, 3, 5.4), between(r, -1.5, 1.5)); if (r() > 0.45) la += d; else lb += d; }
    if (growth >= 2 && r() > 0.82) bl += dot(px + between(r, -5, 5), py + between(r, -4, 4), between(r, 2, 3));
  }
  return (
    <g>
      <Shadow rx={34} ry={5} />
      <path d={rect(-27, -98, 5, 98) + rect(22, -98, 5, 98)} fill="var(--g-wood)" />
      <path d="M-27 -97Q0 -138 27 -97L27 -93Q0 -132 -27 -93Z" fill="var(--g-wood)" />
      <path d="M-24 -62H24M-24 -30H24M-24 -80L24 -44M24 -80L-24 -44" stroke="var(--g-wood2)" strokeWidth="1" opacity=".7" fill="none" />
      <g className="w" style={wind(r, 1.1, 10, x)}>
        <path d={vine} stroke="var(--g-stem)" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
        <path d={la} fill="var(--g-l1)" /><path d={lb} fill="var(--g-l2)" />
        <path d={bl} fill="var(--g-peach)" />
      </g>
    </g>
  );
}
function ShrubItem({ growth, seed, x }: { growth: number; seed: number; x: number }) {
  if (growth <= 0) return <Seed />;
  const r = rng(seed);
  const o: TreeOpts = { ox: x, maxD: 0, kids: [], tipRad: 0, grow: false };
  const spots: Pt[] = growth >= 2 ? [[-26, -20], [0, -32], [26, -19], [-9, -14], [14, -12]] : [[-6, -10], [8, -8]];
  const rad = growth >= 2 ? 24 : 11;
  return <g><Shadow rx={growth >= 2 ? 52 : 22} />{spots.map(([cx, cy], i) => cluster(r, cx, cy, rad * between(r, 0.85, 1.1), o, `s${i}`))}</g>;
}
function TreeItem({ growth, seed, x, fresh }: { growth: number; seed: number; x: number; fresh: boolean }) {
  if (growth <= 0) return <Seed />;
  if (growth === 1) {
    const r = rng(seed);
    const o: TreeOpts = { ox: x, maxD: 0, kids: [], tipRad: 0, grow: false };
    return (
      <g>
        <Shadow rx={20} ry={4} />
        <g className="w" style={wind(r, 2.4, 8, x)}>
          <path d="M0 0Q4 -22 -1 -48" stroke="var(--g-trunk)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          {cluster(r, -1, -50, 14, o, "a")}{cluster(r, 8, -34, 10, o, "b")}{cluster(r, -9, -30, 9, o, "c")}
        </g>
      </g>
    );
  }
  return <g transform={`scale(${growth === 2 ? 0.52 : 0.95})`}><Tree seed={300 + seed} ox={x} grow={fresh} /></g>;
}
function ItemArt({ kind, growth, seed, x, fresh = false }: { kind: YardKind; growth: number; seed: number; x: number; fresh?: boolean }) {
  switch (kind) {
    case "flower": return <Plant stage={growth + 1} idx={seed} x={x} />;
    case "shrub": return <ShrubItem growth={growth} seed={seed} x={x} />;
    case "creeper": return <Creeper growth={growth} seed={seed} x={x} />;
    case "tree": return <TreeItem growth={growth} seed={seed} x={x} fresh={fresh} />;
    case "bench": return <Bench />;
    case "lantern": return <Lantern />;
    case "planter": return <Planter seed={seed} />;
    case "table": return <Table />;
    case "firepit": return <FirePit />;
    case "bbq": return <Bbq />;
    case "pond": return <Pond />;
    case "gazebo": return <Gazebo />;
  }
}
/** Small, still preview used by the shop. */
export function ItemPreview({ kind }: { kind: YardKind }) {
  const max = DEF[kind].max;
  const big = kind === "gazebo" || kind === "tree" || kind === "creeper" || kind === "lantern";
  return (
    <svg viewBox={big ? "-96 -160 192 168" : "-70 -110 140 118"} data-still className="garden-svg h-16 w-full" aria-hidden="true" style={{ background: "transparent" }}>
      <ItemArt kind={kind} growth={max} seed={7} x={0} />
    </svg>
  );
}

const HIT: Record<YardKind, [number, number, number]> = {
  flower: [20, 60, -50], shrub: [50, 30, -26], creeper: [32, 62, -66], tree: [60, 100, -100], bench: [44, 22, -22], lantern: [20, 54, -54],
  planter: [28, 24, -22], table: [54, 26, -26], firepit: [38, 22, -22], bbq: [32, 32, -32], pond: [84, 22, -8], gazebo: [84, 70, -70],
};
const hashId = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h % 100000; };

/** Free spot far from other items, used by "place it for me" and keyboard users. */
export function freeSpot(items: { x: number; y: number }[]): { x: number; y: number } {
  const r = rng(items.length * 97 + 3);
  let best = { x: 600, y: 540 }, bestD = -1;
  for (let k = 0; k < 40; k++) {
    const x = LAWN.x0 + r() * (LAWN.x1 - LAWN.x0), y = LAWN.y0 + r() * (LAWN.y1 - LAWN.y0);
    const d = Math.min(1e9, ...items.map((i) => Math.hypot(i.x - x, (i.y - y) * 1.6)));
    if (d > bestD) { bestD = d; best = { x, y }; }
  }
  return best;
}

/* ───────────── static backdrop ───────────── */
function buildScene(uid: string) {
  const r = rng(20240611);
  const far = ridge(338, 14, 6, 0.6, 1.3), midH = ridge(386, 12, 5, 2.1, 0.4), near = ridge(410, 5, 3, 1.4, 2.2);

  const farTrees: ReactNode[] = [], midTrees: ReactNode[] = [];
  for (let i = 0; i < 26; i++) { const x = (i + r() * 0.8) * 47; farTrees.push(silTree(r, x, far(x) + 4, between(r, 26, 50), "var(--g-far-t)", `ft${i}`)); }
  for (let i = 0; i < 14; i++) { const x = 20 + (i + r() * 0.7) * 86; midTrees.push(silTree(r, x, midH(x) + 6, between(r, 52, 84), "var(--g-mid-t)", `mt${i}`)); }

  // timber fence along the back, with hedge peeking over at the corners
  const FB = 446;
  let pick = "", shade = "";
  for (let x = -12; x < 1212; x += 21) {
    const h = 54 + r() * 4, tilt = between(r, -0.8, 0.8);
    pick += `M${f1(x)} ${FB}l${f1(tilt)} ${-h + 6}l7 -6l7 6l${f1(-tilt)} ${h - 6}Z`;
    shade += rect(x + 10, FB - h + 6, 4, h - 6);
  }
  const hedge: ReactNode[] = [];
  const ho: TreeOpts = { ox: 0, maxD: 0, kids: [], tipRad: 0, grow: false };
  [[40, 404, 34], [128, 410, 28], [1060, 408, 30], [1150, 402, 36]].forEach(([x, y, rr], i) => hedge.push(<g key={`h${i}`} transform={`translate(${x} ${y})`}>{cluster(r, 0, 0, rr, { ...ho, ox: x }, "h")}</g>));

  let ticks = "", wild = "", wildB = "";
  for (let i = 0; i < 260; i++) {
    const x = r() * 1200, y = 452 + r() * 190, s = depthScale(y);
    ticks += `M${f1(x)} ${f1(y)}l${f1(between(r, -2, 2) * s)} ${f1(-between(r, 3, 7) * s)}`;
  }
  for (let i = 0; i < 90; i++) {
    const x = r() * 1200, y = 456 + r() * 184, s = depthScale(y), rr = between(r, 1.1, 2.3) * s;
    if (i % 3) wild += dot(x, y, rr); else wildB += dot(x, y, rr * 0.9);
  }
  let stripes = "";
  for (let i = 0; i < 6; i++) { const y0 = FB + i * 36, y1 = y0 + 18; stripes += `M-10 ${y0}H1210V${y1}H-10Z`; }

  const tufts: { y: number; el: ReactNode }[] = [];
  for (let i = 0; i < 30; i++) {
    const x = r() * 1200, y = 456 + r() * 180, s = depthScale(y);
    tufts.push({ y, el: <g key={`tf${i}`} transform={`translate(${f1(x)} ${f1(y)}) scale(${f1(s)})`}><Grass r={r} x={0} y={0} wx={x} h={between(r, 20, 34)} blades={5} a={2.6} T={5.8} tones={["var(--g-gr0)", "var(--g-gr1)", "var(--g-gr2)"]} k="g" /></g> });
  }
  tufts.sort((a, b) => a.y - b.y);

  const clumps: ReactNode[] = [];
  for (let i = 0; i < 28; i++) {
    const x = -20 + i * 46 + r() * 30, y = between(r, 612, 664), h = between(r, 50, 112) * (y > 645 ? 1.15 : 0.95);
    clumps.push(<Grass key={`cl${i}`} r={r} x={x} y={y} h={h} blades={4} a={4} T={5.4} tones={["var(--g-gr0)", "var(--g-gr1)", "var(--g-gr2)"]} k={`c${i}`} />);
  }

  const drift = (k: string, y: number, dur: number, delay: number, scale: number) => (
    <g key={k} className="drift" style={{ "--dur": `${dur}s`, "--dl": `${delay}s` } as Css}>
      <g className="bob" style={{ "--y": `${y}px`, "--bd": `${dur / 7}s` } as Css}>
        <g transform={`scale(${scale})`}><g className="w" style={{ "--a": 14, "--ta": "4.6s", "--da": "0s", "--tb": "7.3s", "--db": "-2s" } as Css}><path d={leaf(0, 0, 90, 14, 5, 1.2)} fill="var(--g-l2)" /></g></g>
      </g>
    </g>
  );

  const back = (
    <>
      <defs>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--g-sky1)" /><stop offset=".62" stopColor="var(--g-sky2)" /><stop offset="1" stopColor="var(--g-sky3)" /></linearGradient>
        <radialGradient id={`${uid}glow`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="var(--g-glow)" stopOpacity=".7" /><stop offset="1" stopColor="var(--g-glow)" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${uid}mead`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--g-meadow1)" /><stop offset="1" stopColor="var(--g-meadow2)" /></linearGradient>
        <linearGradient id={`${uid}haze`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--g-sky3)" stopOpacity=".0" /><stop offset="1" stopColor="var(--g-sky3)" stopOpacity=".55" /></linearGradient>
        <linearGradient id={`${uid}foot`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--g-shadow)" stopOpacity="0" /><stop offset="1" stopColor="var(--g-shadow)" stopOpacity=".32" /></linearGradient>
      </defs>
      <rect width="1200" height="660" fill={`url(#${uid}sky)`} />
      <ellipse className="glow" cx="930" cy="170" rx="420" ry="300" fill={`url(#${uid}glow)`} />
      <circle cx="930" cy="170" r="40" fill="var(--g-sun)" opacity=".5" />
      <g className="cloud" style={{ "--cd": "70s" } as Css}><path d="M120 150c30-16 70-20 110-8 28-12 70-10 96 6-34 10-70 12-100 8-30 8-72 8-106-6Z" fill="var(--g-cloud)" opacity=".55" /></g>
      <g className="cloud" style={{ "--cd": "90s", animationDelay: "-30s" } as Css}><path d="M610 96c26-12 60-14 92-4 26-8 58-6 80 6-30 8-60 10-86 6-26 6-62 6-86-8Z" fill="var(--g-cloud)" opacity=".4" /></g>
      <path d={ridgePath(far)} fill="var(--g-far)" />
      {farTrees}
      <path d={ridgePath(midH)} fill="var(--g-mid)" />
      <rect y="330" width="1200" height="110" fill={`url(#${uid}haze)`} />
      {midTrees}
      <path d={ridgePath(near)} fill="var(--g-mid2)" />
      {hedge}
      <path d={rect(-12, FB - 40, 1224, 5) + rect(-12, FB - 16, 1224, 5)} fill="var(--g-fence-sh)" />
      <path d={pick} fill="var(--g-fence)" />
      <path d={shade} fill="var(--g-fence-sh)" opacity=".55" />
      <path d={rect(-12, FB - 40, 1224, 5)} fill="var(--g-fence)" opacity=".5" />
      <rect y={FB - 2} width="1200" height="260" fill={`url(#${uid}mead)`} />
      <path d={stripes} fill="var(--g-stripe)" />
      <rect y={FB - 2} width="1200" height="12" fill="var(--g-shadow)" opacity=".2" />
      <path d={ticks} stroke="var(--g-gr0)" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity=".55" />
      <path d={wild} fill="var(--g-ivory)" opacity=".85" />
      <path d={wildB} fill="var(--g-peach)" opacity=".8" />
      {tufts.map((t) => t.el)}
    </>
  );
  const front = (
    <>
      <rect y="560" width="1200" height="100" fill={`url(#${uid}foot)`} />
      {clumps}
      {drift("d1", 330, 52, -14, 1)}
      {drift("d2", 250, 71, -46, 0.8)}
    </>
  );
  return { back, front };
}

/* ───────────── component ───────────── */
const SEEN = "asap2:yard-seen";
export type YardEdit = { placing: YardKind | null; selectedId: string | null; moving: boolean; onPoint: (x: number, y: number) => void; onSelect: (id: string | null) => void };

/** The backyard. Pass `edit` on the garden page to place, select and move things. */
export function GardenArt({ garden, edit }: { garden: G; edit?: YardEdit }) {
  const { state } = useApp();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const scene = useMemo(() => buildScene(uid), [uid]);
  const ref = useRef<SVGSVGElement>(null);
  const ghost = useRef<SVGGElement>(null);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [fresh, setFresh] = useState<Record<string, number>>({});

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // New growth since the yard was last shown plays once, then is remembered.
  const hydrated = state.hydrated;
  useEffect(() => {
    if (!hydrated) return;
    const cur: Record<string, number> = {};
    garden.yard.forEach((it) => { cur[it.id] = it.growth + 1; });
    let saved: Record<string, number> | null = null;
    try { saved = (JSON.parse(localStorage.getItem(SEEN) || "null") as { k: Record<string, number> } | null)?.k ?? null; } catch {}
    if (saved) {
      const add: Record<string, number> = {};
      for (const k in cur) { const prev = saved[k] ?? 0; if (cur[k] > prev) add[k] = prev; }
      if (Object.keys(add).length) setFresh((f) => ({ ...f, ...add }));
    }
    try { localStorage.setItem(SEEN, JSON.stringify({ k: cur })); } catch {}
    setReady(true);
  }, [hydrated, garden.yard]);

  const items = useMemo(() => (ready ? [...garden.yard].sort((a, b) => a.y - b.y) : []), [garden.yard, ready]);
  const sel = edit?.selectedId ? garden.yard.find((i) => i.id === edit.selectedId) : undefined;

  const toWorld = (e: { clientX: number; clientY: number }) => {
    const svg = ref.current!, p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const w = p.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: Math.min(LAWN.x1, Math.max(LAWN.x0, w.x)), y: Math.min(LAWN.y1, Math.max(LAWN.y0, w.y)) };
  };
  const armed = !!edit && (!!edit.placing || edit.moving);
  const onClick = (e: React.MouseEvent) => {
    if (!edit) return;
    if (armed) { const w = toWorld(e); edit.onPoint(w.x, w.y); } else edit.onSelect(null);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!armed || !ghost.current || e.pointerType === "touch") return;
    const w = toWorld(e);
    ghost.current.setAttribute("transform", `translate(${f1(w.x)} ${f1(w.y)}) scale(${f1(depthScale(w.y))})`);
    ghost.current.style.display = "";
  };

  const empty = garden.yard.length === 0;
  return (
    <svg ref={ref} viewBox="0 0 1200 640" preserveAspectRatio="xMidYMax slice" role={edit ? "group" : "img"} data-active={active}
      className="garden-svg h-full w-full" style={edit && armed ? { cursor: "crosshair" } : undefined}
      onClick={edit ? onClick : undefined} onPointerMove={edit ? onMove : undefined}
      onPointerLeave={() => { if (ghost.current) ghost.current.style.display = "none"; }}
      aria-label={empty ? "A quiet backyard with a fence and an empty lawn, ready for your first plant." : "Your backyard, growing as you complete tasks."}>
      {scene.back}
      {items.map((it) => {
        const prev = fresh[it.id];
        const isFresh = prev !== undefined;
        const s = depthScale(it.y), living = isLiving(it.kind), seed = hashId(it.id);
        const selected = sel?.id === it.id;
        const gs = { "--gx": prev >= 2 ? 0.9 : 0.7, "--gy": prev >= 2 ? 0.55 : prev === 1 ? 0.12 : 0.02 } as Css;
        const [hx, hy, hc] = HIT[it.kind];
        return (
          <g key={it.id} transform={`translate(${f1(it.x)} ${f1(it.y)}) scale(${f1(s)})`}
            onClick={edit && !armed ? (e) => { e.stopPropagation(); edit.onSelect(it.id); } : undefined}
            onKeyDown={edit && !armed ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); edit.onSelect(it.id); } } : undefined}
            tabIndex={edit && !armed ? 0 : undefined} role={edit ? "button" : undefined}
            aria-label={edit ? `${DEF[it.kind].label}${living ? `, ${stageWord(it).toLowerCase()}` : ""}. Press Enter to select.` : undefined}
            style={edit && !armed ? { cursor: "pointer", outline: "none" } : undefined}>
            {selected && <ellipse cy="3" rx={Math.max(34, hx * 0.8)} ry="10" fill="var(--g-peach)" fillOpacity=".22" stroke="var(--g-ivory)" strokeWidth="2" strokeDasharray="5 4" />}
            <g className={isFresh ? (living ? "grow" : "place") : undefined} style={isFresh && living ? gs : undefined}>
              <ItemArt kind={it.kind} growth={it.growth} seed={seed} x={it.x} fresh={isFresh} />
            </g>
            {edit && <ellipse cx="0" cy={hc} rx={hx} ry={hy} fill="transparent" />}
          </g>
        );
      })}
      {edit?.placing && <g ref={ghost} style={{ display: "none", pointerEvents: "none" }} opacity=".65"><ItemArt kind={edit.placing} growth={DEF[edit.placing].max} seed={3} x={600} /></g>}
      {edit?.moving && sel && <g ref={ghost} style={{ display: "none", pointerEvents: "none" }} opacity=".65"><ItemArt kind={sel.kind} growth={sel.growth} seed={hashId(sel.id)} x={600} /></g>}
      {scene.front}
    </svg>
  );
}

export function gardenCaption(g: G): string {
  const n = wallet(g);
  if (n > 0) return `${n} seed${n === 1 ? "" : "s"} ready for your backyard.`;
  if (!g.yard.length) return "Your backyard is waiting. Finish a task to earn your first seeds.";
  return "Your backyard is growing.";
}
