import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import type { PricePoint } from "../shared/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

type TimeRange = 7 | 30 | 90;

interface PriceGraphProps {
  prices: PricePoint[];
  currentPrice: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-DZ").format(price) + " DA";
}

function filterByRange(prices: PricePoint[], days: TimeRange): PricePoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return prices.filter((p) => new Date(p.timestamp) >= cutoff);
}

function aggregateByDay(prices: PricePoint[]): PricePoint[] {
  const byDay = new Map<string, PricePoint[]>();

  for (const point of prices) {
    const date = new Date(point.timestamp).toLocaleDateString("fr-DZ");
    const existing = byDay.get(date) ?? [];
    existing.push(point);
    byDay.set(date, existing);
  }

  const result: PricePoint[] = [];
  for (const [date, points] of byDay) {
    const prices = points.map((p) => p.price);
    const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    result.push({
      price: median,
      timestamp: new Date(date).toISOString(),
      meta: { min, max },
    } as PricePoint & { meta: { min: number; max: number } });
  }

  return result.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function generateSampleData(): PricePoint[] {
  const data: PricePoint[] = [];
  const basePrice = 125000;
  const now = new Date();

  for (let i = 90; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const variation = Math.sin(i * 0.1) * 15000 + (Math.random() - 0.5) * 5000;
    const price = Math.round(basePrice + variation);

    data.push({
      price,
      timestamp: date.toISOString(),
    });
  }

  return data;
}

export function PriceGraph({
  prices,
  currentPrice,
}: PriceGraphProps): React.ReactElement {
  const [selectedRange, setSelectedRange] = React.useState<TimeRange>(30);

  const displayPrices =
    prices.length > 0 ? prices : generateSampleData();
  const filtered = filterByRange(displayPrices, selectedRange);
  const aggregated = aggregateByDay(filtered);

  const labels = aggregated.map((p) => {
    const date = new Date(p.timestamp);
    return date.toLocaleDateString("fr-DZ", { day: "2-digit", month: "short" });
  });

  const medianPrices = aggregated.map((p) => p.price);
  const minPrices = aggregated.map((p) => {
    const meta = (p as PricePoint & { meta?: { min: number } }).meta;
    return meta?.min ?? p.price;
  });
  const maxPrices = aggregated.map((p) => {
    const meta = (p as PricePoint & { meta?: { max: number } }).meta;
    return meta?.max ?? p.price;
  });

  const data = {
    labels,
    datasets: [
      {
        label: "Min",
        data: minPrices,
        borderColor: "transparent",
        backgroundColor: "rgba(255, 77, 0, 0.1)",
        fill: "+1",
        pointRadius: 0,
        tension: 0.4,
      },
      {
        label: "Median",
        data: medianPrices,
        borderColor: "#FF4D00",
        backgroundColor: "rgba(255, 77, 0, 0.3)",
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.4,
      },
      {
        label: "Max",
        data: maxPrices,
        borderColor: "transparent",
        backgroundColor: "rgba(255, 77, 0, 0.1)",
        fill: false,
        pointRadius: 0,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1A1A2E",
        titleColor: "#9CA3AF",
        bodyColor: "#FFFFFF",
        borderColor: "rgba(255, 77, 0, 0.3)",
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            if (context.dataset.label === "Median") {
              return formatPrice(context.parsed.y ?? 0);
            }
            return undefined;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#6B7280",
          font: { size: 10 },
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#6B7280",
          font: { size: 10 },
          callback: (value: number | string) => {
            const num = typeof value === "string" ? parseInt(value, 10) : value;
            if (num >= 1000) {
              return (num / 1000).toFixed(0) + "k";
            }
            return num.toString();
          },
        },
      },
    },
  };

  return (
    <div className="bg-kniss-navy-light rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
          Price History
        </h3>
        <div className="flex gap-1">
          {([7, 30, 90] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer border-0 ${
                selectedRange === range
                  ? "bg-kniss-orange text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      <div className="h-[160px]">
        <Line data={data} options={options} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <div>
          <span className="text-gray-500">Current: </span>
          <span className="text-kniss-orange font-medium">
            {formatPrice(currentPrice)}
          </span>
        </div>
        {aggregated.length > 1 && aggregated[0] && aggregated[aggregated.length - 1] && (
          <div>
            <span className="text-gray-500">Trend: </span>
            <span
              className={
                (aggregated[aggregated.length - 1]?.price ?? 0) <=
                (aggregated[0]?.price ?? 0)
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {(aggregated[aggregated.length - 1]?.price ?? 0) <=
              (aggregated[0]?.price ?? 0)
                ? "↓ Lower"
                : "↑ Higher"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
