import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import useSettingsStore from "@/store/settingsStore";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";
import EquipmentForm from "@/components/EquipmentForm";
import ConditionsForm from "@/components/ConditionsForm";
import SafetyStopsForm from "@/components/SafetyStopsForm";
import StarRatingInput from "@/components/StarRatingInput";
import type { Dive, Equipment, DiveConditions, SafetyStop } from "@/lib/dives";
import { convertDepth } from "@/lib/unitConversions";

const diveSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  depth: z.number().min(0, "Depth must be a positive number"),
  duration: z.number().min(0, "Duration must be a positive number"),
  buddy: z.string().optional(),
  lat: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  lng: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
});

type DiveFormValues = z.infer<typeof diveSchema>;

export interface DiveFormSubmitData {
  location: string;
  depth: number; // meters
  duration: number;
  buddy?: string;
  lat: number;
  lng: number;
  datetime: string;
  equipment?: Equipment;
  conditions?: DiveConditions;
  dive_type?: Dive['dive_type'];
  rating?: number;
  notes?: string;
  safety_stops?: SafetyStop[];
}

interface DiveFormProps {
  initialDive?: Dive;
  onSubmit: (data: DiveFormSubmitData) => void;
  submitLabel: string;
}

const DiveForm = ({ initialDive, onSubmit, submitLabel }: DiveFormProps) => {
  const { settings } = useSettingsStore();
  const [equipment, setEquipment] = useState<Equipment | undefined>(initialDive?.equipment);
  const [conditions, setConditions] = useState<DiveConditions | undefined>(initialDive?.conditions);
  const [diveType, setDiveType] = useState<Dive['dive_type']>(initialDive?.dive_type);
  const [rating, setRating] = useState<number | undefined>(initialDive?.rating);
  const [notes, setNotes] = useState<string | undefined>(initialDive?.notes);
  const [safetyStops, setSafetyStops] = useState<SafetyStop[]>(initialDive?.safety_stops || []);

  const [isEquipmentOpen, setIsEquipmentOpen] = useState(!!initialDive?.equipment);
  const [isConditionsOpen, setIsConditionsOpen] = useState(!!initialDive?.conditions);
  const [isSafetyStopsOpen, setIsSafetyStopsOpen] = useState((initialDive?.safety_stops?.length ?? 0) > 0);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<DiveFormValues>({
    resolver: zodResolver(diveSchema),
  });

  useEffect(() => {
    if (initialDive) {
      // Parse datetime string directly to avoid timezone conversion
      const datetimeStr = initialDive.datetime;
      const [dateStr, timeWithZ] = datetimeStr.split('T');
      const timeWithSeconds = timeWithZ.split('.')[0]; // Remove milliseconds and Z
      const timeStr = timeWithSeconds.substring(0, 5); // Extract HH:MM only

      setValue("date", dateStr);
      setValue("time", timeStr !== '00:00' ? timeStr : '');
      setValue("location", initialDive.location);
      // Convert depth from database (meters) to user's preferred unit
      setValue("depth", convertDepth(initialDive.depth, 'meters', settings.units.depth));
      setValue("duration", initialDive.duration);
      setValue("buddy", initialDive.buddy);
      setValue("lat", initialDive.lat);
      setValue("lng", initialDive.lng);
    }
  }, [initialDive, setValue, settings.units.depth]);

  const handleFormSubmit: SubmitHandler<DiveFormValues> = (data) => {
    // Combine date and time into ISO datetime
    const datetime = data.time
      ? `${data.date}T${data.time}:00.000Z`
      : `${data.date}T00:00:00.000Z`;

    // Convert depth from user's unit to meters for database storage
    const depthInMeters = convertDepth(data.depth, settings.units.depth, 'meters');

    onSubmit({
      location: data.location,
      depth: depthInMeters,
      duration: data.duration,
      buddy: data.buddy,
      lat: data.lat,
      lng: data.lng,
      datetime,
      equipment,
      conditions,
      dive_type: diveType,
      rating,
      notes,
      safety_stops: safetyStops.length > 0 ? safetyStops : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 bg-white p-6 lg:p-8 rounded-xl shadow-sm border border-slate-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
          <input type="date" id="date" {...register("date")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          {errors.date && <p className="mt-2 text-sm text-red-600">{errors.date.message}</p>}
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time (optional)</label>
          <input type="time" id="time" {...register("time")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          {errors.time && <p className="mt-2 text-sm text-red-600">{errors.time.message}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
        <input type="text" id="location" {...register("location")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        {errors.location && <p className="mt-2 text-sm text-red-600">{errors.location.message}</p>}
      </div>
      <div>
        <label htmlFor="depth" className="block text-sm font-medium text-gray-700">
          Depth ({settings.units.depth === 'meters' ? 'm' : 'ft'})
        </label>
        <input type="number" step="0.1" id="depth" {...register("depth", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        {errors.depth && <p className="mt-2 text-sm text-red-600">{errors.depth.message}</p>}
      </div>
      <div>
        <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration (min)</label>
        <input type="number" id="duration" {...register("duration", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        {errors.duration && <p className="mt-2 text-sm text-red-600">{errors.duration.message}</p>}
      </div>
      <div>
        <label htmlFor="buddy" className="block text-sm font-medium text-gray-700">Buddy</label>
        <input type="text" id="buddy" {...register("buddy")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="lat" className="block text-sm font-medium text-gray-700">Latitude</label>
          <input type="number" step="any" id="lat" {...register("lat", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          {errors.lat && <p className="mt-2 text-sm text-red-600">{errors.lat.message}</p>}
        </div>
        <div>
          <label htmlFor="lng" className="block text-sm font-medium text-gray-700">Longitude</label>
          <input type="number" step="any" id="lng" {...register("lng", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          {errors.lng && <p className="mt-2 text-sm text-red-600">{errors.lng.message}</p>}
        </div>
      </div>

      {/* Dive Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
        <div className="space-y-2">
          <Label htmlFor="dive-type">Dive Type</Label>
          <Select
            value={diveType || 'recreational'}
            onValueChange={(value: string) => setDiveType(value as Dive['dive_type'])}
          >
            <SelectTrigger id="dive-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recreational">Recreational</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="research">Research</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Rating</Label>
          <StarRatingInput value={rating} onChange={setRating} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes || ''}
          onChange={(e) => setNotes(e.target.value || undefined)}
          placeholder="Dive notes and observations..."
          rows={4}
        />
      </div>

      {/* Conditions Section */}
      <Collapsible open={isConditionsOpen} onOpenChange={setIsConditionsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            Conditions (Optional)
            {isConditionsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <ConditionsForm conditions={conditions} onChange={setConditions} />
        </CollapsibleContent>
      </Collapsible>

      {/* Safety Stops Section */}
      <Collapsible open={isSafetyStopsOpen} onOpenChange={setIsSafetyStopsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            Safety Stops (Optional)
            {isSafetyStopsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <SafetyStopsForm safetyStops={safetyStops} onChange={setSafetyStops} />
        </CollapsibleContent>
      </Collapsible>

      {/* Equipment Section */}
      <Collapsible open={isEquipmentOpen} onOpenChange={setIsEquipmentOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            Equipment Details (Optional)
            {isEquipmentOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <EquipmentForm equipment={equipment} onChange={setEquipment} />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-6 border-t border-slate-200">
        <Button variant="outline" size="lg" asChild className="px-6">
          <Link to="/">Cancel</Link>
        </Button>
        <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700 px-6">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default DiveForm;
