const P: Record<string, string> = {
  home: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z",
  work: "M4 6h16M4 12h16M4 18h10",
  focus: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 100 8 4 4 0 000-8z",
  ask: "M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z",
  settings: "M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM19.4 13a7.7 7.7 0 000-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 00-1.7-1L15 3.5h-4l-.4 2.6a7.6 7.6 0 00-1.7 1l-2.3-1-2 3.4 2 1.5a7.7 7.7 0 000 2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 001.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 001.7-1l2.3 1 2-3.4z",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
  play: "M8 5v14l11-7z",
  pause: "M8 5v14M16 5v14",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  moon: "M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z",
  sun: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 100 10 5 5 0 000-10z",
  chevron: "M9 6l6 6-6 6",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
  coffee: "M5 9h11v5a4 4 0 01-4 4H9a4 4 0 01-4-4zM16 10h2a2 2 0 010 4h-2M8 3v3M12 3v3",
};
export function Icon({ name, size = 20, className = "" }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={P[name] ?? P.spark} />
    </svg>
  );
}
