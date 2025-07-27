import { Link } from "react-router-dom";
import { Clock, Waves, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const recentDives = getRecentDives(dives, 3);
  const { settings } = useSettingsStore();

  if (dives.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">Recent Dives</CardTitle>
          <p className="text-sm text-slate-600">Your latest diving activities</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <div className="text-slate-500 mb-4">No dives logged yet</div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/add">Log Your First Dive</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-900">Recent Dives</CardTitle>
          <p className="text-sm text-slate-600">Your latest diving activities</p>
        </div>
        <Button variant="outline" size="sm" asChild className="border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 ml-4">
          <Link to="#table">View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {recentDives.map((dive) => (
            <div
              key={dive.id}
              className="flex flex-col xl:flex-row xl:items-center xl:justify-between p-5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors duration-150 group cursor-pointer"
            >
              <div className="space-y-2">
                <div className="font-semibold text-slate-900">{dive.location}</div>
                <div className="text-sm text-slate-600">
                  {formatDiveDateTime(dive.datetime, settings)}
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4 text-blue-500" />
                    {formatDepth(dive.depth, settings.units.depth)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    {formatDuration(dive.duration)}
                  </div>
                  {dive.buddy && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-500" />
                      {dive.buddy}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 xl:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2">
                  <Link to={`/edit/${dive.id}`}>Edit</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentDives;