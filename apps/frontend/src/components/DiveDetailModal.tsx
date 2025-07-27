import { MapPin, Waves, User, Star, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Dive } from "@/lib/dives";
import { formatDuration } from "@/lib/diveStats";
import { Link } from "react-router-dom";
import useSettingsStore from "@/store/settingsStore";
import { formatDepth } from "@/lib/unitConversions";
import { formatDiveDateTimeLong } from "@/lib/dateHelpers";
import DiveProfile from "./DiveProfile";

interface DiveDetailModalProps {
  dive: Dive | null;
  isOpen: boolean;
  onClose: () => void;
}

const DiveDetailModal = ({ dive, isOpen, onClose }: DiveDetailModalProps) => {
  const { settings } = useSettingsStore();
  
  if (!dive) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-blue-600" />
            {dive.location}
          </DialogTitle>
          <DialogDescription>
            Dive #{dive.id} • {formatDiveDateTimeLong(dive.datetime, settings)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Waves className="h-4 w-4" />
                    Dive Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Depth:</span>
                    <span className="font-medium">{formatDepth(dive.depth, settings.units.depth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{formatDuration(dive.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Depth:</span>
                    <span className="font-medium">{formatDepth(Math.round(dive.depth * 0.7), settings.units.depth)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coordinates:</span>
                    <span className="font-medium text-sm">{dive.lat.toFixed(4)}, {dive.lng.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Water Type:</span>
                    <span className="font-medium">Salt Water</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entry Type:</span>
                    <span className="font-medium">Shore/Boat</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dive Team
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dive Buddy:</span>
                    <span className="font-medium">{dive.buddy || 'Solo Dive'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guide:</span>
                    <span className="font-medium">Not specified</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Group Size:</span>
                    <span className="font-medium">{dive.buddy ? '2' : '1'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Dive Rating
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Overall:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className="h-4 w-4 text-yellow-400 fill-current" 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visibility:</span>
                    <span className="font-medium">Excellent</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium">Mild</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            {dive.samples && dive.samples.length > 0 ? (
              <DiveProfile 
                samples={dive.samples}
                maxDepth={dive.depth}
                className="h-96"
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">No Profile Data Available</div>
                <div className="text-gray-400 text-sm max-w-md mx-auto">
                  This dive doesn't contain detailed sample data. Profile charts are available 
                  for dives imported from dive computers or UDDF files with sample data.
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Water Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span className="font-medium">24°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visibility:</span>
                    <span className="font-medium">30m+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium">Mild (0.5 knots)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surge:</span>
                    <span className="font-medium">None</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weather Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Air Temperature:</span>
                    <span className="font-medium">28°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weather:</span>
                    <span className="font-medium">Sunny</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wind:</span>
                    <span className="font-medium">Light (5 knots)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sea State:</span>
                    <span className="font-medium">Calm (1-2ft)</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Breathing Gas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gas Mix:</span>
                    <span className="font-medium">Air (21% O₂)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tank Size:</span>
                    <span className="font-medium">12L Steel</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Pressure:</span>
                    <span className="font-medium">200 bar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Pressure:</span>
                    <span className="font-medium">50 bar</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Exposure Protection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Suit Type:</span>
                    <span className="font-medium">3mm Wetsuit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hood:</span>
                    <span className="font-medium">No</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gloves:</span>
                    <span className="font-medium">No</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">6kg</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dive Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Amazing dive at {dive.location}! The visibility was incredible and we saw some fantastic marine life. 
                  {dive.buddy && ` Had a great time diving with ${dive.buddy}.`} Water conditions were perfect 
                  and the site lived up to its reputation. Definitely want to return to explore more of this area.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Marine Life Spotted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>🐠 Tropical Fish</span>
                    <span className="text-muted-foreground">Many</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🐢 Sea Turtle</span>
                    <span className="text-muted-foreground">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🦈 Reef Shark</span>
                    <span className="text-muted-foreground">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🪸 Coral Health</span>
                    <span className="text-muted-foreground">Excellent</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" asChild>
            <Link to={`/edit/${dive.id}`}>Edit Dive</Link>
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiveDetailModal;