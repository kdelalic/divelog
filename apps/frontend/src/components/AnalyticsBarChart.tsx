import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { useTheme } from '@/hooks/useTheme';
import type { AnalyticsBucket } from '@/lib/analytics';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface AnalyticsBarChartProps {
  title: string;
  description: string;
  items: AnalyticsBucket[];
  onSelect: (item: AnalyticsBucket) => void;
  value?: 'count' | 'bottomTime';
}

const AnalyticsBarChart = ({ title, description, items, onSelect, value = 'count' }: AnalyticsBarChartProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event, elements) => {
      const index = elements[0]?.index;
      if (index !== undefined) onSelect(items[index]);
    },
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: value === 'count' ? 0 : 1, color: isDark ? '#cbd5e1' : '#475569' },
        grid: { color: isDark ? 'rgba(148,163,184,.18)' : 'rgba(100,116,139,.15)' },
      },
      x: {
        ticks: { color: isDark ? '#cbd5e1' : '#475569', maxRotation: 45, minRotation: 0 },
        grid: { display: false },
      },
    },
  };
  const values = items.map((item) => value === 'count' ? item.count : Math.round(item.bottomTime / 6) / 10);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 h-72">
        {items.length > 0 ? (
          <Bar
            data={{ labels: items.map((item) => item.label), datasets: [{ label: value === 'count' ? 'Dives' : 'Hours', data: values, backgroundColor: 'rgba(37, 99, 235, .72)', borderRadius: 5 }] }}
            options={options}
          />
        ) : <div className="flex h-full items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">No matching data</div>}
      </div>
      {items.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Select a bar to inspect its dives.</p>}
    </section>
  );
};

export default AnalyticsBarChart;
