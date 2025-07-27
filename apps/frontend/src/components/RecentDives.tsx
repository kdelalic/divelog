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
      <Card>
        <CardHeader>
          <CardTitle>Recent Dives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">No dives logged yet</div>
            <Button asChild>
              <Link to="/add">Log Your First Dive</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Dives</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="#table">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentDives.map((dive) => (
            <div
              key={dive.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="font-medium">{dive.location}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDiveDateTime(dive.datetime, settings)}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Waves className="h-3 w-3" />
                    {formatDepth(dive.depth, settings.units.depth)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(dive.duration)}
                  </div>
                  {dive.buddy && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {dive.buddy}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
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