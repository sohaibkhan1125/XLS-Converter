
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDataPoint } from "@/lib/firebase-analytics-service";
import { ChartTooltipContent } from "@/components/ui/chart"; // Using ShadCN's tooltip content for styling

interface ConversionChartProps {
  data: ChartDataPoint[];
  title: string;
  description: string;
  dataKeyX: string; // Key for X-axis data (e.g., "name")
  dataKeyY: string; // Key for Y-axis data (e.g., "conversions")
  fillColor?: string; // Optional fill color for bars
}

export default function ConversionChart({
  data,
  title,
  description,
  dataKeyX,
  dataKeyY,
  fillColor = "hsl(var(--primary))", // Default to primary theme color
}: ConversionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">No conversion data available for this period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={dataKeyX}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                allowDecimals={false} 
                width={30}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={<ChartTooltipContent 
                            labelKey={dataKeyX} 
                            nameKey={dataKeyY} 
                            indicator="dot" 
                         />}
              />
              <Bar dataKey={dataKeyY} fill={fillColor} radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
