"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type OrdersBarChartProps = {
  data: Array<{
    day: string;
    orders: number;
  }>;
};

export function OrdersBarChart({ data }: OrdersBarChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="4 4" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            stroke="#71717a"
            fontSize={12}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            stroke="#71717a"
            fontSize={12}
          />
          <Tooltip
            cursor={{ fill: "rgba(24, 24, 27, 0.04)" }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #e4e4e7",
              boxShadow: "0 10px 30px rgba(24,24,27,0.08)",
            }}
          />
          <Bar
            dataKey="orders"
            fill="#18181b"
            radius={[10, 10, 4, 4]}
            maxBarSize={42}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
