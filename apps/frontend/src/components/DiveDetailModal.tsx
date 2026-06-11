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
import { formatDepth, formatTemperature, formatVolume } from "@/lib/unitConversions";
import { formatDiveDateTimeLong } from "@/lib/dateHelpers";
import DiveProfile from "./DiveProfile";
import { calculateSAC, getGasMixColor } from "@/lib/dives";

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
      <DialogContent className="max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] h-[90vh] w-[95vw] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-blue-600" />
            {dive.location}
          </DialogTitle>
          <DialogDescription>
            Dive #{dive.id} • {formatDiveDateTimeLong(dive.datetime, settings)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full flex flex-col flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 flex-1 overflow-y-auto">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                    <span className="font-medium">{dive.buddy || '—'}</span>
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
                    {dive.rating ? (
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={star <= (dive.rating ?? 0)
                              ? "h-4 w-4 text-yellow-400 fill-current"
                              : "h-4 w-4 text-gray-300"}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="font-medium">—</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dive Type:</span>
                    <span className="font-medium capitalize">{dive.dive_type || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium capitalize">{dive.conditions?.current_strength || '—'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="flex-1 overflow-hidden flex flex-col">
            {dive.samples && dive.samples.length > 0 ? (
              <DiveProfile 
                samples={dive.samples}
                maxDepth={dive.depth}
                className="flex-1 min-h-0"
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

          <TabsContent value="conditions" className="space-y-4 flex-1 overflow-y-auto">
            {dive.conditions ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Water Conditions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Surface Temp:</span>
                      <span className="font-medium">
                        {dive.conditions.water_temp_surface !== undefined
                          ? formatTemperature(dive.conditions.water_temp_surface, settings.units.temperature)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bottom Temp:</span>
                      <span className="font-medium">
                        {dive.conditions.water_temp_bottom !== undefined
                          ? formatTemperature(dive.conditions.water_temp_bottom, settings.units.temperature)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Visibility:</span>
                      <span className="font-medium">
                        {dive.conditions.visibility !== undefined
                          ? formatDepth(dive.conditions.visibility, settings.units.depth)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-medium capitalize">
                        {dive.conditions.current_strength
                          ? `${dive.conditions.current_strength}${dive.conditions.current_direction ? ` (${dive.conditions.current_direction})` : ''}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Surge:</span>
                      <span className="font-medium capitalize">{dive.conditions.surge || '—'}</span>
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
                      <span className="font-medium">
                        {dive.conditions.air_temp !== undefined
                          ? formatTemperature(dive.conditions.air_temp, settings.units.temperature)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weather:</span>
                      <span className="font-medium capitalize">{dive.conditions.weather || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sea State:</span>
                      <span className="font-medium">
                        {dive.conditions.sea_state !== undefined ? `${dive.conditions.sea_state} / 9` : '—'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <p>No conditions recorded for this dive</p>
                    <p className="text-sm mt-1">Conditions can be added when editing the dive</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {dive.safety_stops && dive.safety_stops.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Safety Stops</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dive.safety_stops.map((stop, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-muted-foreground">Stop {index + 1}:</span>
                      <span className="font-medium">
                        {formatDepth(stop.depth, settings.units.depth)} for {stop.duration} min
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="equipment" className="space-y-6 flex-1 overflow-y-auto">
            {/* Tank Information */}
            {dive.equipment?.tanks && dive.equipment.tanks.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tank Configuration</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dive.equipment.tanks.map((tank, index) => {
                    const avgDepth = Math.round(dive.depth * 0.7); // Estimate average depth
                    const sacRate = calculateSAC(tank, dive.duration, avgDepth, settings.units.pressure === 'psi' ? 'imperial' : 'metric');
                    const gasMixColor = getGasMixColor(tank.gas_mix);
                    
                    return (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: gasMixColor }}
                            />
                            {tank.name || `Tank ${index + 1}`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gas Mix:</span>
                            <span className="font-medium">{tank.gas_mix.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">O₂:</span>
                            <span className="font-medium">{tank.gas_mix.oxygen}%</span>
                          </div>
                          {tank.gas_mix.helium && tank.gas_mix.helium > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">He:</span>
                              <span className="font-medium">{tank.gas_mix.helium}%</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tank Size:</span>
                            <span className="font-medium">
                              {formatVolume(tank.size, settings.units.volume)} {tank.material || 'Steel'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Start Pressure:</span>
                            <span className="font-medium">
                              {settings.units.pressure === 'psi' 
                                ? Math.round(tank.start_pressure * 14.5038) 
                                : tank.start_pressure} {settings.units.pressure === 'psi' ? 'psi' : 'bar'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">End Pressure:</span>
                            <span className="font-medium">
                              {settings.units.pressure === 'psi' 
                                ? Math.round(tank.end_pressure * 14.5038) 
                                : tank.end_pressure} {settings.units.pressure === 'psi' ? 'psi' : 'bar'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SAC Rate:</span>
                            <span className="font-medium">
                              {sacRate.toFixed(1)} {settings.units.pressure === 'psi' ? 'cfm' : 'L/min'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <p>No tank information recorded for this dive</p>
                    <p className="text-sm mt-1">Equipment data can be added when editing the dive</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Equipment */}
            {dive.equipment && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Exposure Protection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Suit Type:</span>
                      <span className="font-medium">
                        {dive.equipment.wetsuit ? 
                          `${dive.equipment.wetsuit.thickness}mm ${dive.equipment.wetsuit.type}` : 
                          'Not specified'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="font-medium">
                        {dive.equipment.weights ? `${dive.equipment.weights}kg` : 'Not specified'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Other Equipment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BCD:</span>
                      <span className="font-medium">{dive.equipment.bcd || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Regulator:</span>
                      <span className="font-medium">{dive.equipment.regulator || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Computer:</span>
                      <span className="font-medium">{dive.equipment.computer || 'Not specified'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {dive.equipment?.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Equipment Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{dive.equipment.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 flex-1 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dive Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dive.notes ? (
                  <p className="text-muted-foreground whitespace-pre-wrap">{dive.notes}</p>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No notes recorded for this dive</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t border-border mt-4 flex-shrink-0">
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