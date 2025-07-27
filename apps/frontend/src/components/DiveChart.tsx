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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dive } from "@/lib/dives";
import { getDivesByMonth } from "@/lib/diveStats";

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
        },
      },
    },
  };

  if (dives.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">Dive Activity</CardTitle>
          <p className="text-sm text-slate-600">Track your diving frequency over time</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[320px] text-slate-500 bg-slate-50 rounded-lg">
            No dive data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-900">Dive Activity</CardTitle>
        <p className="text-sm text-slate-600">Your diving frequency over time</p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[320px] lg:h-[400px] xl:h-[450px]">
          <Line data={chartData} options={{ ...options, maintainAspectRatio: false }} />
        </div>
      </CardContent>
    </Card>
  );
};

export default DiveChart;