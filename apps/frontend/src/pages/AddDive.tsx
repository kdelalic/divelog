import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import useDiveStore from "../store/diveStore";
import useSettingsStore from "../store/settingsStore";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import EquipmentForm from "@/components/EquipmentForm";
import type { Equipment } from "@/lib/dives";
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

const AddDive = () => {
  const navigate = useNavigate();
  const addDive = useDiveStore((state) => state.addDive);
  const { settings } = useSettingsStore();
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<DiveFormValues>({
    resolver: zodResolver(diveSchema),
  });

  const onSubmit: SubmitHandler<DiveFormValues> = (data) => {
    // Combine date and time into ISO datetime
    const datetime = data.time 
      ? `${data.date}T${data.time}:00.000Z`
      : `${data.date}T00:00:00.000Z`;
    
    // Convert depth from user's unit to meters for database storage
    const depthInMeters = convertDepth(data.depth, settings.units.depth, 'meters');
    
    const diveData = {
      ...data,
      depth: depthInMeters,
      datetime,
      equipment,
    };
    
    // Remove separate date/time fields
    delete (diveData as any).date;
    delete (diveData as any).time;
    
    addDive(diveData);
    navigate("/");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Add New Dive</h1>
        <p className="mt-2 text-lg lg:text-xl text-slate-600">Record the details of your latest diving adventure</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 lg:p-8 rounded-xl shadow-sm border border-slate-200">
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
          <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700 px-6">Save Dive</Button>
        </div>
      </form>
    </div>
  );
};

export default AddDive; 