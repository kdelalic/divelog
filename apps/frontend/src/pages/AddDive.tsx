import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import useDiveStore from "../store/diveStore";
import { Button } from "@/components/ui/button";

const diveSchema = z.object({
  date: z.string().min(1, "Date is required"),
  location: z.string().min(1, "Location is required"),
  depth: z.number().min(0, "Depth must be a positive number"),
  duration: z.number().min(0, "Duration must be a positive number"),
  buddy: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
});

type DiveFormValues = z.infer<typeof diveSchema>;

const AddDive = () => {
  const navigate = useNavigate();
  const addDive = useDiveStore((state) => state.addDive);
  const { register, handleSubmit, formState: { errors } } = useForm<DiveFormValues>({
    resolver: zodResolver(diveSchema),
  });

  const onSubmit: SubmitHandler<DiveFormValues> = (data) => {
    addDive(data);
    navigate("/");
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Add New Dive</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-8 rounded-lg shadow">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
          <input type="date" id="date" {...register("date")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          {errors.date && <p className="mt-2 text-sm text-red-600">{errors.date.message}</p>}
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
          <input type="text" id="location" {...register("location")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          {errors.location && <p className="mt-2 text-sm text-red-600">{errors.location.message}</p>}
        </div>
        <div>
          <label htmlFor="depth" className="block text-sm font-medium text-gray-700">Depth (m)</label>
          <input type="number" id="depth" {...register("depth", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
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
        <div className="grid grid-cols-2 gap-4">
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
        <div className="flex justify-end space-x-4">
          <Button variant="ghost" asChild>
            <Link to="/">Cancel</Link>
          </Button>
          <Button type="submit">Save Dive</Button>
        </div>
      </form>
    </div>
  );
};

export default AddDive; 