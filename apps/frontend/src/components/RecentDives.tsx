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
  const recentDives = getRecentDives(dives, 3);
  const { settings } = useSettingsStore();

  if (dives.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="px-8 py-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Recent Dives</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your latest diving activities</p>
          </div>
          <div className="flex h-[400px] items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
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
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="px-8 py-6">
        <div className="flex flex-row items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Recent Dives</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your latest diving activities</p>
          </div>
          <Button variant="outline" size="sm" asChild className="border-input bg-background px-4 py-2 text-foreground shadow-sm hover:bg-muted">
            <Link to="#table">View All</Link>
          </Button>
        </div>
        <div className="space-y-4">
          {recentDives.map((dive) => (
            <div
              key={dive.id}
              className="group flex cursor-pointer items-center justify-between rounded-xl border border-border p-6 transition-all duration-200 hover:border-input hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="mb-2 truncate font-semibold text-foreground">{dive.location}</div>
                <div className="mb-3 text-sm text-muted-foreground">
                  {formatDiveDateTime(dive.datetime, settings)}
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-blue-100 p-1 dark:bg-blue-950/60">
                      <Waves className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium">{formatDepth(dive.depth, settings.units.depth)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-muted p-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span>{formatDuration(dive.duration)}</span>
                  </div>
                  {dive.buddy && (
                    <div className="flex items-center gap-2 truncate">
                      <div className="rounded-md bg-muted p-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="truncate">{dive.buddy}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" asChild className="px-4 py-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50 dark:hover:text-blue-300">
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
