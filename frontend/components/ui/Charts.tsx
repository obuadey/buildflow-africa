"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  Tooltip, XAxis, YAxis
} from "recharts";
import { useChartColors } from "../app/ThemeProvider";
import { formatMoney, formatMoneyCompact } from "../../lib/format";

type Point = { month: string; revenue: number; cost: number; profit: number };
type ChartSize = { width: number; height: number };

function useMeasuredChart(height: number, fallbackWidth = 720) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize>({ width: fallbackWidth, height });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const read = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: Math.max(280, Math.floor(rect.width || fallbackWidth)), height });
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    window.addEventListener("resize", read);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [fallbackWidth, height]);

  return { ref, size };
}

function ChartFrame({ height, children }: { height: number; children: (size: ChartSize) => React.ReactNode }) {
  const { ref, size } = useMeasuredChart(height);
  return (
    <div ref={ref} className="relative w-full min-w-0 overflow-hidden" style={{ height }}>
      {children(size)}
    </div>
  );
}

function TooltipCard({ active, payload, label, currency }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[168px] rounded-lg border border-hairline bg-raised p-2.5 shadow-raised">
      <p className="mb-1.5 text-2xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-sm" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="num font-medium">{formatMoney(entry.value, currency, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RevenueChart({ data, currency = "GHS", height = 260 }: { data: Point[]; currency?: string; height?: number }) {
  const c = useChartColors();
  return (
    <ChartFrame height={height}>
      {({ width }) => (
        <ComposedChart width={width} height={height} data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.revenue} stopOpacity={0.18} />
              <stop offset="100%" stopColor={c.revenue} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 11 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: c.axis, fontSize: 11 }}
            tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
          />
          <Tooltip content={<TooltipCard currency={currency} />} cursor={{ stroke: c.grid }} />
          <Area type="monotone" dataKey="revenue" name="Revenue" stroke={c.revenue} strokeWidth={2} fill="url(#revFill)" />
          <Bar dataKey="cost" name="Cost" fill={c.cost} fillOpacity={0.55} radius={[2, 2, 0, 0]} barSize={12} minPointSize={0} />
          <Line type="monotone" dataKey="profit" name="Profit" stroke={c.profit} strokeWidth={1.75} dot={false} />
        </ComposedChart>
      )}
    </ChartFrame>
  );
}

export function CashflowChart({ data, currency = "GHS", height = 132 }: {
  data: { month: string; in: number; out: number }[]; currency?: string; height?: number;
}) {
  const c = useChartColors();
  return (
    <ChartFrame height={height}>
      {({ width }) => (
        <BarChart width={width} height={height} data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 10 }} />
          <Tooltip content={<TooltipCard currency={currency} />} cursor={{ fill: "transparent" }} />
          <Bar dataKey="in" name="Cash in" fill={c.revenue} radius={[2, 2, 0, 0]} barSize={10} minPointSize={0} />
          <Bar dataKey="out" name="Cash out" fill={c.cost} fillOpacity={0.6} radius={[2, 2, 0, 0]} barSize={10} minPointSize={0} />
        </BarChart>
      )}
    </ChartFrame>
  );
}

export function Sparkline({ data, tone = "revenue", height = 36 }: {
  data: { value: number }[]; tone?: "revenue" | "cost" | "profit"; height?: number;
}) {
  const c = useChartColors();
  return (
    <ChartFrame height={height}>
      {({ width }) => (
        <AreaChart width={width} height={height} data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Area type="monotone" dataKey="value" stroke={c[tone]} strokeWidth={1.5} fill={c[tone]} fillOpacity={0.1} />
        </AreaChart>
      )}
    </ChartFrame>
  );
}

export function CategoryBars({ data, currency = "GHS", height = 200 }: {
  data: { name: string; value: number }[]; currency?: string; height?: number;
}) {
  const c = useChartColors();
  return (
    <ChartFrame height={height}>
      {({ width }) => (
        <BarChart width={width} height={height} data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={c.grid} horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 10 }} tickFormatter={(v: number) => formatMoneyCompact(v, currency)} />
          <YAxis type="category" dataKey="name" width={124} tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 11 }} />
          <Tooltip content={<TooltipCard currency={currency} />} cursor={{ fill: "transparent" }} />
          <Bar dataKey="value" name="Amount" radius={[0, 3, 3, 0]} barSize={12} minPointSize={0}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={i % 2 === 0 ? c.revenue : c.profit} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartFrame>
  );
}
