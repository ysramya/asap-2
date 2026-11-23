"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Garden as G } from "@/types";
import { useApp } from "@/lib/store";

/**
 * An illustrated, layered landscape with one coherent breeze.
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
const pathCenter = (y: number) => { const t = (y - 412) / 238; return 612 + 95 * Math.sin(t * 3.6) * Math.min(1, t * 2.2) - 40 * t; };
const pathHalf = (y: number) => { const t = Math.max(0, (y - 412) / 238); return 8 + t ** 1.15 * 135; };
const onPath = (x: number, y: number, pad = 1) => y > 412 && Math.abs(x - pathCenter(y)) < pathHalf(y) * pad;
const depthScale = (y: number) => 0.5 + ((y - 420) / 220) * 0.78;

function pathShapes() {
  const L: Pt[] = [], Rr: Pt[] = [], C: Pt[] = [], Cl: Pt[] = [];
  for (let y = 412; y <= 656; y += 14) {
    const c = pathCenter(y), h = pathHalf(y);
    L.push([c - h, y]); Rr.push([c + h, y]); Cl.push([c - h * 0.5, y]); C.push([c + h * 0.5, y]);
  }
  const ring = (a: Pt[], b: Pt[]) => `M${pt(a[0])}${through(a)}L${pt(b[b.length - 1])}${through([...b].reverse())}Z`;
  return { body: ring(L, Rr), core: ring(Cl, C), edgeL: `M${pt(L[0])}${through(L)}`, edgeR: `M${pt(Rr[0])}${through(Rr)}` };
}

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

function Fern({ idx, x }: { idx: number; x: number }) {
  const r = rng(idx * 4177 + 9);
  const fronds: ReactNode[] = [];
  for (let k = 0; k < 7; k++) {
    const ang = -64 + k * 21 + between(r, -5, 5), len = between(r, 46, 70) * (1 - Math.abs(k - 3) * 0.06);
    const s = Math.sin(ang * rad), c = Math.cos(ang * rad);
    const cx = s * len * 0.55, cy = -c * len * 0.72, ex = s * len * 0.92 + len * 0.08, ey = -c * len * 0.8 + len * 0.14 * Math.abs(s);
    let a = "", b = "";
    for (let j = 1; j <= 9; j++) {
      const t = j / 10, px = 2 * (1 - t) * t * cx + t * t * ex, py = 2 * (1 - t) * t * cy + t * t * ey;
      const dx = 2 * (1 - t) * cx + 2 * t * (ex - cx), dy = 2 * (1 - t) * cy + 2 * t * (ey - cy);
      const tang = Math.atan2(dx, -dy) / rad, L = len * (0.27 - 0.2 * t);
      a += leaf(px, py, tang - 58, L, L * 0.3, 1); b += leaf(px, py, tang + 58, L, L * 0.3, -1);
    }
    fronds.push(
      <g key={k} className="w" style={wind(r, 2.4, between(r, 6, 9), x)}>
        <path d={`M0 0Q${f1(cx)} ${f1(cy)} ${f1(ex)} ${f1(ey)}`} stroke="var(--g-l1)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d={a} fill="var(--g-l1)" /><path d={b} fill="var(--g-l2)" />
      </g>,
    );
  }
  return <g>{fronds}</g>;
}

/* ───────────── placement ───────────── */
const PLANT_SLOTS: Pt[] = [
  [800, 536], [500, 540], [850, 582], [400, 500], [940, 504], [330, 588], [716, 452], [1030, 564], [556, 472], [230, 522],
  [1100, 504], [150, 592], [410, 616], [880, 452], [1040, 458], [240, 468], [810, 612], [990, 612], [96, 522], [680, 600],
];
function plantSlot(i: number): Pt {
  if (i < PLANT_SLOTS.length) return PLANT_SLOTS[i];
  const r = rng(i * 131 + 7);
  for (let k = 0; k < 12; k++) {
    const x = 70 + r() * 1060, y = 450 + r() * 165;
    if (!onPath(x, y, 1.25) && !(Math.abs(x - 360) < 90 && y < 500)) return [x, y];
  }
  return [90 + r() * 200, 600];
}
const TREE_SLOTS: [number, number, number][] = [[905, 440, 0.62], [1065, 456, 0.72], [150, 444, 0.62], [782, 424, 0.46], [522, 426, 0.44], [1140, 432, 0.5]];
const FERN_SLOTS: Pt[] = [[196, 566], [1086, 606], [66, 474], [990, 548], [470, 600], [1160, 540]];

/* ───────────── static scene ───────────── */
function buildScene(uid: string) {
  const r = rng(20240611);
  const far = ridge(338, 14, 6, 0.6, 1.3), midH = ridge(386, 12, 5, 2.1, 0.4), near = ridge(420, 6, 3, 1.4, 2.2);
  const ps = pathShapes();

  const farTrees: ReactNode[] = [], midTrees: ReactNode[] = [];
  for (let i = 0; i < 26; i++) { const x = (i + r() * 0.8) * 47; farTrees.push(silTree(r, x, far(x) + 4, between(r, 26, 50), "var(--g-far-t)", `ft${i}`)); }
  for (let i = 0; i < 14; i++) { const x = 20 + (i + r() * 0.7) * 86; midTrees.push(silTree(r, x, midH(x) + 6, between(r, 52, 84), "var(--g-mid-t)", `mt${i}`)); }

  let ticks = "", pebbles = "", wild = "", wildB = "";
  for (let i = 0; i < 300; i++) {
    const x = r() * 1200, y = 424 + r() * 216;
    if (onPath(x, y, 0.9)) continue;
    const s = depthScale(y);
    ticks += `M${f1(x)} ${f1(y)}l${f1(between(r, -2, 2) * s)} ${f1(-between(r, 3, 7) * s)}`;
  }
  for (let i = 0; i < 120; i++) {
    const x = r() * 1200, y = 430 + r() * 210;
    if (onPath(x, y, 1.05)) continue;
    const s = depthScale(y), rr = between(r, 1.1, 2.3) * s;
    if (i % 3) wild += dot(x, y, rr); else wildB += dot(x, y, rr * 0.9);
  }
  // stepping stones and edge stones along the path
  let stoneBody = "", stoneHi = "", stoneSh = "";
  for (let i = 0; i < 26; i++) {
    const y = 424 + i * 8.9 + r() * 5, side = i % 2 ? 1 : -1;
    const x = pathCenter(y) + side * (pathHalf(y) + between(r, -3, 9)), s = depthScale(y);
    const w = between(r, 5, 11) * s, h = w * between(r, 0.5, 0.7);
    stoneSh += blob(x + 1, y + h * 0.5, w * 1.05, h * 0.5, r, 7, 0.1);
    stoneBody += blob(x, y, w, h, r, 8, 0.14);
    stoneHi += blob(x + w * 0.18, y - h * 0.3, w * 0.55, h * 0.4, r, 7, 0.12);
  }

  const tufts: { y: number; el: ReactNode }[] = [];
  for (let i = 0; i < 40; i++) {
    const x = r() * 1200, y = 440 + r() * 190;
    if (onPath(x, y, 1.05)) continue;
    const s = depthScale(y);
    tufts.push({ y, el: <g key={`tf${i}`} transform={`translate(${f1(x)} ${f1(y)}) scale(${f1(s)})`}><Grass r={r} x={0} y={0} wx={x} h={between(r, 20, 36)} blades={5} a={2.6} T={5.8} tones={["var(--g-gr0)", "var(--g-gr1)", "var(--g-gr2)"]} k="g" /></g> });
  }
  tufts.sort((a, b) => a.y - b.y);

  const clumps: ReactNode[] = [];
  for (let i = 0; i < 28; i++) {
    const x = -20 + i * 46 + r() * 30, y = between(r, 606, 662), h = between(r, 52, 118) * (y > 640 ? 1.15 : 0.95);
    if (Math.abs(x - pathCenter(y)) < pathHalf(y) * 0.55) continue;
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
      <path d={ridgePath((x) => near(x) + 10)} fill={`url(#${uid}mead)`} />
      <path d={ps.body} fill="var(--g-path)" />
      <path d={ps.core} fill="var(--g-path-hi)" opacity=".55" />
      <path d={ps.edgeL + ps.edgeR} stroke="var(--g-path-edge)" strokeWidth="1.6" fill="none" opacity=".5" />
      <path d={ticks} stroke="var(--g-gr0)" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity=".55" />
      <path d={wild} fill="var(--g-ivory)" opacity=".85" />
      <path d={wildB} fill="var(--g-peach)" opacity=".8" />
      <path d={stoneSh} fill="var(--g-shadow)" opacity=".25" />
      <path d={stoneBody} fill="var(--g-stone)" />
      <path d={stoneHi} fill="var(--g-stone-hi)" opacity=".75" />
      {shrub(r, 468, 470, 0.9, "sh1")}
      {shrub(r, 262, 504, 0.8, "sh2")}
      {shrub(r, 742, 456, 0.7, "sh3")}
      {shrub(r, 1010, 474, 0.85, "sh4")}
      <g transform="translate(360 486)"><Tree seed={77} ox={360} anchor /></g>
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
const SEEN = "asap2:garden-seen";
type Item = { key: string; kind: "plant" | "tree" | "fern"; idx: number; stage: number; x: number; y: number; s: number };

/** Cumulative progress as a living landscape. No numbers, no pressure. */
export function GardenArt({ garden, full = false }: { garden: G; full?: boolean }) {
  void full;
  const { state } = useApp();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const scene = useMemo(() => buildScene(uid), [uid]);
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [fresh, setFresh] = useState<Record<string, number>>({});

  // Pause the breeze while the picture is off screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // New growth since the garden was last shown plays once, then is remembered.
  const hydrated = state.hydrated;
  useEffect(() => {
    if (!hydrated) return;
    const cur: Record<string, number> = {};
    garden.order.forEach((id) => { cur[`p${id}`] = garden.plants[id]; });
    garden.trees.forEach((id) => { cur[`t${id}`] = 3; });
    for (let i = 0; i < garden.ferns; i++) cur[`f${i}`] = 3;
    let saved: Record<string, number> | null = null;
    try { saved = (JSON.parse(localStorage.getItem(SEEN) || "null") as { k: Record<string, number> } | null)?.k ?? null; } catch {}
    if (saved) {
      const add: Record<string, number> = {};
      for (const k in cur) { const prev = saved[k] ?? 0; if (cur[k] > prev) add[k] = prev; }
      if (Object.keys(add).length) setFresh((f) => ({ ...f, ...add }));
    }
    try { localStorage.setItem(SEEN, JSON.stringify({ k: cur })); } catch {}
    setReady(true);
  }, [hydrated, garden]);

  const items = useMemo<Item[]>(() => {
    if (!ready) return [];
    const out: Item[] = [];
    const start = Math.max(0, garden.order.length - 120);
    garden.order.forEach((id, idx) => {
      if (idx < start) return;
      const [x, y] = plantSlot(idx);
      out.push({ key: `p${id}`, kind: "plant", idx, stage: garden.plants[id], x, y, s: depthScale(y) });
    });
    garden.trees.forEach((id, i) => { const [x, y, s] = TREE_SLOTS[i % TREE_SLOTS.length]; out.push({ key: `t${id}`, kind: "tree", idx: i, stage: 3, x: x + Math.floor(i / TREE_SLOTS.length) * 28, y, s }); });
    for (let i = 0; i < Math.min(garden.ferns, FERN_SLOTS.length); i++) { const [x, y] = FERN_SLOTS[i]; out.push({ key: `f${i}`, kind: "fern", idx: i, stage: 3, x, y, s: depthScale(y) * 0.9 }); }
    return out.sort((a, b) => a.y - b.y);
  }, [garden, ready]);

  const empty = garden.order.length === 0 && garden.trees.length === 0;
  return (
    <svg ref={ref} viewBox="0 0 1200 640" preserveAspectRatio="xMidYMax slice" role="img" data-active={active} className="garden-svg h-full w-full"
      aria-label={empty ? "An illustrated meadow with a winding path, ready for the first seed." : "An illustrated meadow that keeps growing as you make progress."}>
      {scene.back}
      {items.map((it) => {
        const prev = fresh[it.key];
        const isFresh = prev !== undefined;
        const gs = { "--gx": prev >= 2 ? 0.9 : 0.7, "--gy": prev >= 2 ? 0.55 : prev === 1 ? 0.12 : 0.02 } as Css;
        return (
          <g key={it.key} transform={`translate(${f1(it.x)} ${f1(it.y)}) scale(${f1(it.s)})`}>
            <g className={isFresh ? (it.kind === "tree" ? "grow-tree" : "grow") : undefined} style={isFresh ? gs : undefined}>
              {it.kind === "tree" ? <Tree seed={300 + it.idx * 37} ox={it.x} grow={isFresh} /> : it.kind === "fern" ? <Fern idx={it.idx} x={it.x} /> : <Plant stage={it.stage} idx={it.idx} x={it.x} />}
            </g>
          </g>
        );
      })}
      {scene.front}
    </svg>
  );
}

export function gardenCaption(g: G): string {
  if (!g.order.length && !g.trees.length) return "Your garden begins with your first seed.";
  if (g.trees.length) return "A tree has taken root. Your garden is growing.";
  if (Object.values(g.plants).includes(3)) return "Something has bloomed. Your garden is growing.";
  return "New growth is on its way.";
}
