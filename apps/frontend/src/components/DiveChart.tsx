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
      <Card>
        <CardHeader>
          <CardTitle>Dive Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No dive data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dive Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Line data={chartData} options={options} />
      </CardContent>
    </Card>
  );
};

export default DiveChart;