import { Link } from "react-router-dom";
import { Clock, Waves, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dive } from "@/lib/dives";
import { getRecentDives, formatDuration } from "@/lib/diveStats";
import useSettingsStore from "@/store/settingsStore";
import { formatDepth } from "@/lib/unitConversions";
import { formatDiveDateTime } from "@/lib/dateHelpers";

interface RecentDivesProps {
  dives: Dive[];
}

const RecentDives = ({ dives }: RecentDivesProps) => {
  const recentDives = getRecentDives(dives, 5);
  const { settings } = useSettingsStore();

  if (dives.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recent Dives</h3>
            <p className="text-sm text-slate-500 mt-1">Your latest diving activities</p>
          </div>
          <div className="flex items-center justify-center h-[400px] text-slate-500 bg-slate-50 rounded-xl">
            <div className="text-center">
              <div className="text-lg font-medium mb-4">No dives logged yet</div>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all">
                <Link to="/add">Log Your First Dive</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-8 py-6">
        <div className="flex flex-row items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent Dives</h3>
            <p className="text-sm text-slate-500 mt-1">Your latest diving activities</p>
          </div>
          <Button variant="outline" size="sm" asChild className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 shadow-sm">
            <Link to="#table">View All</Link>
          </Button>
        </div>
        <div className="space-y-4">
          {recentDives.map((dive) => (
            <div
              key={dive.id}
              className="flex items-center justify-between p-6 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 group cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate mb-2">{dive.location}</div>
                <div className="text-sm text-slate-600 mb-3">
                  {formatDiveDateTime(dive.datetime, settings)}
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-100 rounded-md">
                      <Waves className="h-3 w-3 text-blue-600" />
                    </div>
                    <span className="font-medium">{formatDepth(dive.depth, settings.units.depth)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-slate-100 rounded-md">
                      <Clock className="h-3 w-3 text-slate-600" />
                    </div>
                    <span>{formatDuration(dive.duration)}</span>
                  </div>
                  {dive.buddy && (
                    <div className="flex items-center gap-2 truncate">
                      <div className="p-1 bg-slate-100 rounded-md">
                        <User className="h-3 w-3 text-slate-600" />
                      </div>
                      <span className="truncate">{dive.buddy}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2">
                  <Link to={`/edit/${dive.id}`}>Edit</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentDives;