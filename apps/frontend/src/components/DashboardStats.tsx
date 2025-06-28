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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardStats;