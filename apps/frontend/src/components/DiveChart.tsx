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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Dive Activity</h3>
            <p className="text-sm text-slate-500 mt-1">Track your diving frequency over time</p>
          </div>
          <div className="flex items-center justify-center h-[400px] text-slate-500 bg-slate-50 rounded-xl">
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-8 py-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Dive Activity</h3>
          <p className="text-sm text-slate-500 mt-1">Your diving frequency over time</p>
        </div>
        <div className="h-[400px]">
          <Line data={chartData} options={{ ...options, maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
};

export default DiveChart;