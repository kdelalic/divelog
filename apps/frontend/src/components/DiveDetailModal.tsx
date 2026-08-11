import { FileText, MapPin, Star, User, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Dive } from '@/lib/dives';
import { calculateSAC, getGasMixColor } from '@/lib/dives';
import { formatDiveDateTimeLong } from '@/lib/dateHelpers';
import { formatDuration } from '@/lib/diveStats';
import {
  formatDepth,
  formatPressure,
  formatTemperature,
  formatVolume,
  formatWeight,
} from '@/lib/unitConversions';
import useSettingsStore from '@/store/settingsStore';
import DiveProfile from './DiveProfile';

interface DiveDetailModalProps {
  dive: Dive | null;
  isOpen: boolean;
  onClose: () => void;
}

const titleCase = (value?: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not recorded';

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}:</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

const averageRecordedDepth = (dive: Dive): number | undefined => {
  if (!dive.samples?.length) return undefined;
  return dive.samples.reduce((total, sample) => total + sample.depth, 0) / dive.samples.length;
};

const DiveDetailModal = ({ dive, isOpen, onClose }: DiveDetailModalProps) => {
  const settings = useSettingsStore((state) => state.settings);

  if (!dive) return null;

  const conditions = dive.conditions;
  const averageDepth = dive.meanDepth ?? averageRecordedDepth(dive);
  const hasCoordinates = dive.lat !== 0 || dive.lng !== 0;
  const current = conditions?.current
    ? `${titleCase(conditions.current.strength)}${conditions.current.direction ? ` (${conditions.current.direction})` : ''}`
    : 'Not recorded';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col xl:max-w-[90vw] 2xl:max-w-[85vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {dive.location}
          </DialogTitle>
          <DialogDescription>
			Dive #{dive.diveNumber ?? '—'} • {formatDiveDateTimeLong(dive.datetime, settings)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex w-full flex-1 flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 space-y-6 overflow-y-auto">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Waves className="h-4 w-4" /> Dive profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="Max depth" value={formatDepth(dive.depth, settings.units.depth)} />
                  <DetailRow label="Duration" value={formatDuration(dive.duration)} />
				  <DetailRow label="Surface interval" value={dive.surfaceInterval === undefined ? 'Not available' : formatDuration(dive.surfaceInterval)} />
                  <DetailRow
                    label="Average depth"
                    value={averageDepth === undefined ? 'Not recorded' : formatDepth(averageDepth, settings.units.depth)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" /> Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow
                    label="Coordinates"
                    value={hasCoordinates ? `${dive.lat.toFixed(4)}, ${dive.lng.toFixed(4)}` : 'Not recorded'}
                  />
                  <DetailRow label="Dive type" value={titleCase(dive.diveType)} />
				  <DetailRow label="Dive mode" value={dive.diveMode ?? 'Not recorded'} />
				  <DetailRow label="Trip" value={dive.trip?.name ?? 'Not assigned'} />
				  <DetailRow label="Tags" value={dive.tags?.length ? dive.tags.join(', ') : 'None'} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" /> Dive team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Buddy" value={dive.buddy || 'Not recorded'} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4" /> Dive rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dive.rating ? (
                    <div className="flex items-center justify-between gap-4" aria-label={`${dive.rating} out of 5 stars`}>
                      <span className="text-muted-foreground">Overall:</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 text-yellow-400 ${star <= dive.rating! ? 'fill-current' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not recorded</span>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="flex flex-1 flex-col overflow-hidden">
            {dive.samples?.length ? (
              <DiveProfile samples={dive.samples} maxDepth={dive.depth} className="min-h-0 flex-1" />
            ) : (
              <div className="py-12 text-center">
                <div className="mb-2 text-lg text-muted-foreground">No profile data available</div>
                <div className="mx-auto max-w-md text-sm text-muted-foreground">
                  Profile charts are available for imports containing dive-computer sample data.
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="conditions" className="flex-1 space-y-4 overflow-y-auto">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Water conditions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow
                    label="Surface temperature"
                    value={conditions?.waterTemp?.surface === undefined
                      ? 'Not recorded'
                      : formatTemperature(conditions.waterTemp.surface, settings.units.temperature)}
                  />
                  <DetailRow
                    label="Bottom temperature"
                    value={conditions?.waterTemp?.bottom === undefined
                      ? 'Not recorded'
                      : formatTemperature(conditions.waterTemp.bottom, settings.units.temperature)}
                  />
                  <DetailRow
                    label="Visibility"
                    value={conditions?.visibility === undefined
                      ? 'Not recorded'
                      : formatDepth(conditions.visibility, settings.units.depth)}
                  />
                  <DetailRow label="Current" value={current} />
                  <DetailRow label="Surge" value={titleCase(conditions?.surge)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Surface conditions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow
                    label="Air temperature"
                    value={conditions?.airTemp === undefined
                      ? 'Not recorded'
                      : formatTemperature(conditions.airTemp, settings.units.temperature)}
                  />
                  <DetailRow label="Weather" value={titleCase(conditions?.weather)} />
                  <DetailRow
                    label="Sea state"
                    value={conditions?.seaState === undefined ? 'Not recorded' : `${conditions.seaState} / 9`}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Safety stops</CardTitle></CardHeader>
              <CardContent>
                {dive.safetyStops?.length ? (
                  <div className="space-y-3">
                    {dive.safetyStops.map((stop, index) => (
                      <DetailRow
                        key={`${stop.depth}-${stop.duration}-${index}`}
                        label={`Stop ${index + 1}`}
                        value={`${formatDepth(stop.depth, settings.units.depth)} for ${formatDuration(stop.duration)}`}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No safety stops recorded</span>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="flex-1 space-y-6 overflow-y-auto">
			{dive.computer && (
			  <Card>
				<CardHeader><CardTitle className="text-base">Dive computer identity</CardTitle></CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				  <DetailRow label="Vendor" value={dive.computer.vendor ?? 'Not recorded'} />
				  <DetailRow label="Model" value={dive.computer.model ?? 'Not recorded'} />
				  <DetailRow label="Device ID" value={dive.computer.deviceId ?? 'Not recorded'} />
				  <DetailRow label="Serial" value={dive.computer.serial ?? 'Not recorded'} />
				  <DetailRow label="Firmware" value={dive.computer.firmware ?? 'Not recorded'} />
				</CardContent>
			  </Card>
			)}
            {dive.equipment?.tanks?.length ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tank configuration</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dive.equipment.tanks.map((tank, index) => {
                    const sacRate = averageDepth === undefined
                      ? undefined
                      : calculateSAC(
                          tank,
                          dive.duration,
                          averageDepth,
                          settings.units.pressure === 'psi' ? 'imperial' : 'metric',
                        );

                    return (
                      <Card key={`${tank.id ?? tank.name ?? 'tank'}-${index}`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: getGasMixColor(tank.gas_mix) }} />
                            {tank.name || `Tank ${index + 1}`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <DetailRow label="Gas mix" value={tank.gas_mix.name || `${tank.gas_mix.oxygen}% O₂`} />
                          <DetailRow label="O₂" value={`${tank.gas_mix.oxygen}%`} />
                          {tank.gas_mix.helium !== undefined && tank.gas_mix.helium > 0 && (
                            <DetailRow label="He" value={`${tank.gas_mix.helium}%`} />
                          )}
                          <DetailRow
                            label="Tank size"
                            value={`${formatVolume(tank.size, settings.units.volume)}${tank.material ? `, ${titleCase(tank.material)}` : ''}`}
                          />
                          <DetailRow label="Start pressure" value={formatPressure(tank.start_pressure, settings.units.pressure)} />
                          <DetailRow label="End pressure" value={formatPressure(tank.end_pressure, settings.units.pressure)} />
                          <DetailRow
                            label="SAC rate"
                            value={sacRate === undefined
                              ? 'Needs profile data'
                              : `${sacRate.toFixed(1)} ${settings.units.pressure === 'psi' ? 'ft³/min' : 'L/min'}`}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No tank information recorded</CardContent></Card>
            )}

            {dive.equipment && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Exposure protection</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow
                      label="Suit"
                      value={dive.equipment.wetsuit
                        ? `${dive.equipment.wetsuit.thickness !== undefined ? `${dive.equipment.wetsuit.thickness}mm ` : ''}${titleCase(dive.equipment.wetsuit.type)}`
                        : 'Not recorded'}
                    />
                    <DetailRow
                      label="Weight"
                      value={dive.equipment.weights === undefined
                        ? 'Not recorded'
                        : formatWeight(dive.equipment.weights, settings.units.weight)}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Other equipment</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow label="BCD" value={dive.equipment.bcd || 'Not recorded'} />
                    <DetailRow label="Regulator" value={dive.equipment.regulator || 'Not recorded'} />
                    <DetailRow label="Computer" value={dive.equipment.computer || 'Not recorded'} />
                    <DetailRow label="Fins" value={dive.equipment.fins || 'Not recorded'} />
                    <DetailRow label="Mask" value={dive.equipment.mask || 'Not recorded'} />
                  </CardContent>
                </Card>
              </div>
            )}

            {dive.equipment?.notes && (
              <Card>
                <CardHeader><CardTitle className="text-base">Equipment notes</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-wrap text-muted-foreground">{dive.equipment.notes}</p></CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="flex-1 space-y-4 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> Dive notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">{dive.notes || 'No notes recorded for this dive.'}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex flex-shrink-0 justify-between border-t border-border pt-4">
          <Button variant="outline" asChild><Link to={`/edit/${dive.id}`}>Edit Dive</Link></Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiveDetailModal;
