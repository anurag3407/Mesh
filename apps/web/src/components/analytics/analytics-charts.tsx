"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export interface DailySeriesPoint {
  day: string
  cost: number
  [key: string]: number | string
}

const SERIES_COLORS = ["#ff7a45", "#8fbf9f", "#e2b36b", "#9fb3c8", "#b9ad93", "#6e7d73"]

const tooltipStyle = {
  background: "#101411",
  border: "1px solid #354037",
  borderRadius: 4,
  fontSize: 12,
  color: "#e9e5d8",
}

export function AnalyticsCharts({
  daily,
  series,
}: {
  daily: DailySeriesPoint[]
  series: { key: string; label: string }[]
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-[13px] font-medium">Where did tokens go each day?</h3>
        <p className="mt-1 font-mono text-[11px] text-faint">
          input plus output tokens, stacked by agent
        </p>
        <div className="mt-3 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="#232b25" />
              <XAxis
                dataKey="day"
                tick={{ fill: "#6b756d", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                tickLine={false}
                axisLine={{ stroke: "#232b25" }}
              />
              <YAxis
                tick={{ fill: "#6b756d", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "#151b17" }}
                formatter={(value, name) => [
                  Number(value ?? 0).toLocaleString(),
                  String(name ?? ""),
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#9aa39b", fontFamily: "IBM Plex Mono" }} />
              {series.map((item, index) => (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  stackId="tokens"
                  fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-medium">What did each day cost?</h3>
        <p className="mt-1 font-mono text-[11px] text-faint">USD, from the pricing table</p>
        <div className="mt-3 h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="#232b25" />
              <XAxis
                dataKey="day"
                tick={{ fill: "#6b756d", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                tickLine={false}
                axisLine={{ stroke: "#232b25" }}
              />
              <YAxis
                tick={{ fill: "#6b756d", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`$${Number(value ?? 0).toFixed(4)}`, "cost"]}
              />
              <Line
                type="monotone"
                dataKey="cost"
                name="cost"
                stroke="#ff7a45"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "#ff7a45" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
