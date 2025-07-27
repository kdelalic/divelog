import { Activity, MapPin, Clock, Waves } from "lucide-react";
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-8 py-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-8">Overview</h2>
        <div className="grid grid-cols-4 gap-16">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`group ${index < statCards.length - 1 ? 'border-r border-slate-200 pr-8' : ''}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <Icon className="h-6 w-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{card.title}</div>
                </div>
                <div className="mb-3">
                  <div className="text-4xl font-bold text-slate-900 leading-none">{card.value}</div>
                </div>
                <div className="text-sm text-slate-500 leading-relaxed">{card.subtitle}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;