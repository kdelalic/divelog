import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { Dive } from "@/lib/dives";
import { getDivesByMonth } from "@/lib/diveStats";
import { useTheme } from "@/hooks/useTheme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DiveChartProps {
  dives: Dive[];
}

const DiveChart = ({ dives }: DiveChartProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const monthlyData = getDivesByMonth(dives);

  const chartData = {
    labels: monthlyData.map(item => item.month),
    datasets: [
      {
        label: "Dives per Month",
        data: monthlyData.map(item => item.count),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: isDark ? '#cbd5e1' : '#475569',
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: isDark ? '#cbd5e1' : '#475569',
        },
        grid: {
          color: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.15)',
        },
      },
      x: {
        ticks: {
          color: isDark ? '#cbd5e1' : '#475569',
        },
        grid: {
          color: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.15)',
        },
      },
    },
  };

  if (dives.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="px-8 py-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Dive Activity</h3>
            <p className="mt-1 text-sm text-muted-foreground">Track your diving frequency over time</p>
          </div>
          <div className="flex h-[400px] items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">No dive data to display</div>
              <p className="text-sm">Add your first dive to see activity trends</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="px-8 py-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">Dive Activity</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your diving frequency over time</p>
        </div>
        <div className="h-[400px]">
          <Line data={chartData} options={{ ...options, maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
};

export default DiveChart;
