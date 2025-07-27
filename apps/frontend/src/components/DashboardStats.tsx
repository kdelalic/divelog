import { Activity, MapPin, Clock, Waves } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiveStatistics } from "@/lib/diveStats";
import { formatDuration } from "@/lib/diveStats";
import useSettingsStore from "@/store/settingsStore";
import { formatDepth } from "@/lib/unitConversions";

interface DashboardStatsProps {
  stats: DiveStatistics;
}

const DashboardStats = ({ stats }: DashboardStatsProps) => {
  const { settings } = useSettingsStore();
  
  const statCards = [
    {
      title: "Total Dives",
      value: stats.totalDives,
      icon: Activity,
      subtitle: stats.lastDiveDate ? `Last dive: ${new Date(stats.lastDiveDate).toLocaleDateString()}` : "No dives yet",
    },
    {
      title: "Total Bottom Time",
      value: formatDuration(stats.totalBottomTime),
      icon: Clock,
      subtitle: `Average: ${formatDuration(Math.round(stats.totalBottomTime / (stats.totalDives || 1)))}`,
    },
    {
      title: "Max Depth",
      value: formatDepth(stats.maxDepth, settings.units.depth),
      icon: Waves,
      subtitle: stats.deepestDive ? `at ${stats.deepestDive.location}` : "No depth recorded",
    },
    {
      title: "Dive Sites",
      value: stats.uniqueLocations,
      icon: MapPin,
      subtitle: `Average depth: ${formatDepth(stats.avgDepth, settings.units.depth)}`,
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 lg:grid-cols-2">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-200 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{card.title}</CardTitle>
              <Icon className="h-6 w-6 text-slate-500 group-hover:text-blue-500 transition-colors" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-4xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{card.value}</div>
              <p className="text-sm text-slate-600 leading-relaxed">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardStats;