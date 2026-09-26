"use client";

import { useState } from "react";

export type EtohBar = { key: string; label: string; value: number; detail?: string };

/**
 * Single-series column / bar chart (no legend: the title names the series).
 * Marks ≤ 24px with a 4px rounded data end, hairline grid, optional target rule,
 * per-mark hover + keyboard focus tooltip, values also available in a table.
 */
export function EtohBarChart({
  bars,
  orientation = "vertical",
  unit,
  target,
  targetLabel,
  caption,
  highlightKey,
}: {
  bars: EtohBar[];
  orientation?: "vertical" | "horizontal";
  unit: string;
  target?: number;
  targetLabel?: string;
  caption: string;
  highlightKey?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, target ?? 0, ...bars.map((b) => b.value));
  const niceMax = niceCeil(max);
  const ticks = [0, niceMax / 2, niceMax];
  const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
  const active = bars.find((b) => b.key === hover) ?? null;

  if (orientation === "horizontal") {
    const rowH = 36;
    const labelW = 150;
    const W = 560;
    const plotW = W - labelW - 70;
    const H = bars.length * rowH + 8;
    return (
      <figure className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={caption}>
          {bars.map((b, i) => {
            const w = Math.max(b.value > 0 ? 3 : 0, (b.value / niceMax) * plotW);
            const y = i * rowH + 6;
            const isHover = hover === b.key;
            return (
              <g
                key={b.key}
                tabIndex={0}
                onPointerEnter={() => setHover(b.key)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(b.key)}
                onBlur={() => setHover(null)}
                className="outline-none"
              >
                <rect x={0} y={y - 4} width={W} height={rowH} fill="transparent" />
                <text x={labelW - 10} y={y + 14} textAnchor="end" className="fill-ink/80 text-[12px]">
                  {b.label}
                </text>
                <path
                  d={barPathH(labelW, y + 4, w, 18)}
                  className={isHover ? "fill-[#2f6fd6] dark:fill-[#6aa1ff]" : "fill-[#1553b7] dark:fill-[#4f8ff0]"}
                />
                <text x={labelW + w + 8} y={y + 17} className="fill-ink/70 text-[12px] tabular-nums">
                  {fmt(b.value)} {unit}
                </text>
              </g>
            );
          })}
        </svg>
        {active ? <Tip bar={active} unit={unit} fmt={fmt} /> : null}
        <TableFallback bars={bars} unit={unit} caption={caption} fmt={fmt} />
      </figure>
    );
  }

  const W = 560;
  const H = 240;
  const padL = 56;
  const padB = 28;
  const padT = 14;
  const plotW = W - padL - 8;
  const plotH = H - padB - padT;
  const slot = plotW / bars.length;
  const barW = Math.min(24, slot * 0.5);
  const yOf = (v: number) => padT + plotH - (v / niceMax) * plotH;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={caption}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={yOf(t)} y2={yOf(t)} className="stroke-ink/10" strokeWidth={1} />
            <text x={padL - 8} y={yOf(t) + 4} textAnchor="end" className="fill-ink/50 text-[11px] tabular-nums">
              {fmt(t)}
            </text>
          </g>
        ))}
        {target ? (
          <g>
            <line x1={padL} x2={W - 8} y1={yOf(target)} y2={yOf(target)} className="stroke-brass" strokeWidth={1.5} />
            <text x={W - 10} y={yOf(target) - 5} textAnchor="end" className="fill-ink/70 text-[11px]">
              {targetLabel ?? `เป้า ${fmt(target)}`}
            </text>
          </g>
        ) : null}
        {bars.map((b, i) => {
          const cx = padL + slot * i + slot / 2;
          const h = Math.max(b.value > 0 ? 3 : 0, plotH - (yOf(b.value) - padT));
          const isHover = hover === b.key;
          const isHi = highlightKey === b.key;
          return (
            <g
              key={b.key}
              tabIndex={0}
              onPointerEnter={() => setHover(b.key)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(b.key)}
              onBlur={() => setHover(null)}
              className="outline-none"
            >
              <rect x={cx - slot / 2} y={padT} width={slot} height={plotH} fill="transparent" />
              <path
                d={barPathV(cx - barW / 2, padT + plotH, barW, h)}
                className={
                  isHover
                    ? "fill-[#2f6fd6] dark:fill-[#6aa1ff]"
                    : isHi
                      ? "fill-[#1553b7] dark:fill-[#4f8ff0]"
                      : "fill-[#1553b7]/55 dark:fill-[#4f8ff0]/60"
                }
              />
              {isHi && b.value > 0 ? (
                <text x={cx} y={padT + plotH - h - 6} textAnchor="middle" className="fill-ink text-[11px] font-semibold tabular-nums">
                  {fmt(b.value)}
                </text>
              ) : null}
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-ink/60 text-[11px]">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      {active ? <Tip bar={active} unit={unit} fmt={fmt} /> : null}
      <TableFallback bars={bars} unit={unit} caption={caption} fmt={fmt} />
    </figure>
  );
}

function Tip({ bar, unit, fmt }: { bar: EtohBar; unit: string; fmt: (n: number) => string }) {
  return (
    <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-forest/15 bg-paper px-3 py-2 text-xs shadow-lg" role="status">
      <p className="text-sm font-bold tabular-nums text-ink">
        {fmt(bar.value)} {unit}
      </p>
      <p className="text-ink/60">{bar.label}</p>
      {bar.detail ? <p className="text-ink/60">{bar.detail}</p> : null}
    </div>
  );
}

function TableFallback({ bars, unit, caption, fmt }: { bars: EtohBar[]; unit: string; caption: string; fmt: (n: number) => string }) {
  return (
    <details className="mt-1 text-xs text-ink/60">
      <summary className="cursor-pointer">ดูเป็นตาราง</summary>
      <table className="mt-2 w-full">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {bars.map((b) => (
            <tr key={b.key} className="border-b border-forest/10">
              <td className="py-1 pr-2">{b.label}</td>
              <td className="py-1 text-right tabular-nums">
                {fmt(b.value)} {unit}
              </td>
              {b.detail ? <td className="py-1 pl-3 text-right">{b.detail}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function niceCeil(v: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

/** Column: square at the baseline, 4px rounded top. */
function barPathV(x: number, base: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  const top = base - h;
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

/** Bar: square at the baseline (left), 4px rounded right end. */
function barPathH(x: number, y: number, w: number, h: number): string {
  if (w <= 0) return "";
  const r = Math.min(4, h / 2, w);
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
}
