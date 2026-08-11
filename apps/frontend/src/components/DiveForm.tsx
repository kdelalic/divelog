import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import EquipmentForm from '@/components/EquipmentForm';
import type { Dive, Equipment } from '@/lib/dives';
import {
  createDiveFormSchema,
  diveFormValuesToDive,
  diveToFormValues,
  optionalNumberInput,
  type DiveFormValues,
} from '@/lib/diveForm';
import type { UserSettings } from '@/lib/settings';
import { unitLabels } from '@/lib/settings';

interface DiveFormProps {
  heading: string;
  description: string;
  submitLabel: string;
  settings: UserSettings;
  initialDive?: Dive;
  isSubmitting: boolean;
  saveError?: string | null;
  onSubmit: (dive: Omit<Dive, 'id'>) => Promise<boolean>;
}

const fieldClassName = 'mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:text-sm';
const labelClassName = 'block text-sm font-medium text-foreground';

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p> : null;

const DiveForm = ({
  heading,
  description,
  submitLabel,
  settings,
  initialDive,
  isSubmitting,
  saveError,
  onSubmit,
}: DiveFormProps) => {
  const schema = useMemo(() => createDiveFormSchema(settings), [settings]);
  const [equipment, setEquipment] = useState<Equipment | undefined>(initialDive?.equipment);
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(Boolean(initialDive?.equipment));
  const [isConditionsOpen, setIsConditionsOpen] = useState(Boolean(initialDive?.conditions));
  const [isStopsOpen, setIsStopsOpen] = useState(Boolean(initialDive?.safetyStops?.length));

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DiveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: diveToFormValues(initialDive, settings),
  });

  const { fields: safetyStopFields, append: appendSafetyStop, remove: removeSafetyStop } = useFieldArray({
    control,
    name: 'safetyStops',
  });

  useEffect(() => {
    reset(diveToFormValues(initialDive, settings));
  }, [initialDive, reset, settings]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(diveFormValuesToDive(values, settings, equipment, initialDive));
  });

  const depthLabel = unitLabels.depth[settings.units.depth];
  const temperatureLabel = unitLabels.temperature[settings.units.temperature];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">{heading}</h1>
        <p className="mt-2 text-lg text-muted-foreground lg:text-xl">{description}</p>
      </div>

      <form onSubmit={submit} className="space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm lg:p-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className={labelClassName}>Date</label>
            <input type="date" id="date" {...register('date')} className={fieldClassName} />
            <FieldError message={errors.date?.message} />
          </div>
          <div>
            <label htmlFor="time" className={labelClassName}>Time (optional)</label>
            <input type="time" id="time" {...register('time')} className={fieldClassName} />
            <FieldError message={errors.time?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="location" className={labelClassName}>Location</label>
          <input type="text" id="location" {...register('location')} className={fieldClassName} />
          <FieldError message={errors.location?.message} />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="depth" className={labelClassName}>Max depth ({depthLabel})</label>
            <input type="number" step="0.1" id="depth" {...register('depth', { valueAsNumber: true })} className={fieldClassName} />
            <FieldError message={errors.depth?.message} />
          </div>
          <div>
            <label htmlFor="duration" className={labelClassName}>Duration (min)</label>
            <input type="number" id="duration" {...register('duration', { valueAsNumber: true })} className={fieldClassName} />
            <FieldError message={errors.duration?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="buddy" className={labelClassName}>Buddy</label>
            <input type="text" id="buddy" {...register('buddy')} className={fieldClassName} />
            <FieldError message={errors.buddy?.message} />
          </div>
          <div>
            <label htmlFor="diveType" className={labelClassName}>Dive type</label>
            <select id="diveType" {...register('diveType')} className={fieldClassName}>
              <option value="">Not recorded</option>
              <option value="recreational">Recreational</option>
              <option value="training">Training</option>
              <option value="technical">Technical</option>
              <option value="work">Work</option>
              <option value="research">Research</option>
            </select>
            <FieldError message={errors.diveType?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="lat" className={labelClassName}>Latitude</label>
            <input type="number" step="any" id="lat" {...register('lat', { valueAsNumber: true })} className={fieldClassName} />
            <FieldError message={errors.lat?.message} />
          </div>
          <div>
            <label htmlFor="lng" className={labelClassName}>Longitude</label>
            <input type="number" step="any" id="lng" {...register('lng', { valueAsNumber: true })} className={fieldClassName} />
            <FieldError message={errors.lng?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="rating" className={labelClassName}>Rating</label>
          <select
            id="rating"
            {...register('rating', { setValueAs: optionalNumberInput })}
            className={fieldClassName}
          >
            <option value="">Not rated</option>
            {[1, 2, 3, 4, 5].map((rating) => (
              <option key={rating} value={rating}>{rating} / 5</option>
            ))}
          </select>
          <FieldError message={errors.rating?.message} />
        </div>

        <div>
          <label htmlFor="notes" className={labelClassName}>Dive notes</label>
          <textarea
            id="notes"
            rows={5}
            {...register('notes')}
            className={fieldClassName}
            placeholder="Observations, marine life, skills practiced, or anything worth remembering"
          />
          <FieldError message={errors.notes?.message} />
        </div>

        <Collapsible open={isConditionsOpen} onOpenChange={setIsConditionsOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between">
              Conditions (optional)
              {isConditionsOpen ? <ChevronDown /> : <ChevronRight />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-6 rounded-lg border border-border bg-muted/30 p-5">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="waterTempSurface" className={labelClassName}>Surface temp ({temperatureLabel})</label>
                <input type="number" step="0.1" id="waterTempSurface" {...register('waterTempSurface', { setValueAs: optionalNumberInput })} className={fieldClassName} />
                <FieldError message={errors.waterTempSurface?.message} />
              </div>
              <div>
                <label htmlFor="waterTempBottom" className={labelClassName}>Bottom temp ({temperatureLabel})</label>
                <input type="number" step="0.1" id="waterTempBottom" {...register('waterTempBottom', { setValueAs: optionalNumberInput })} className={fieldClassName} />
                <FieldError message={errors.waterTempBottom?.message} />
              </div>
              <div>
                <label htmlFor="airTemp" className={labelClassName}>Air temp ({temperatureLabel})</label>
                <input type="number" step="0.1" id="airTemp" {...register('airTemp', { setValueAs: optionalNumberInput })} className={fieldClassName} />
                <FieldError message={errors.airTemp?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="visibility" className={labelClassName}>Visibility ({depthLabel})</label>
                <input type="number" step="0.1" id="visibility" {...register('visibility', { setValueAs: optionalNumberInput })} className={fieldClassName} />
                <FieldError message={errors.visibility?.message} />
              </div>
              <div>
                <label htmlFor="seaState" className={labelClassName}>Sea state (0–9)</label>
                <input type="number" id="seaState" {...register('seaState', { setValueAs: optionalNumberInput })} className={fieldClassName} />
                <FieldError message={errors.seaState?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="currentStrength" className={labelClassName}>Current strength</label>
                <select id="currentStrength" {...register('currentStrength')} className={fieldClassName}>
                  <option value="">Not recorded</option>
                  <option value="none">None</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
              <div>
                <label htmlFor="currentDirection" className={labelClassName}>Current direction</label>
                <input type="text" id="currentDirection" {...register('currentDirection')} className={fieldClassName} placeholder="NE, incoming, outgoing…" />
                <FieldError message={errors.currentDirection?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="weather" className={labelClassName}>Weather</label>
                <select id="weather" {...register('weather')} className={fieldClassName}>
                  <option value="">Not recorded</option>
                  <option value="sunny">Sunny</option>
                  <option value="cloudy">Cloudy</option>
                  <option value="overcast">Overcast</option>
                  <option value="rainy">Rainy</option>
                  <option value="windy">Windy</option>
                </select>
              </div>
              <div>
                <label htmlFor="surge" className={labelClassName}>Surge</label>
                <select id="surge" {...register('surge')} className={fieldClassName}>
                  <option value="">Not recorded</option>
                  <option value="none">None</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={isStopsOpen} onOpenChange={setIsStopsOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between">
              Safety stops ({safetyStopFields.length})
              {isStopsOpen ? <ChevronDown /> : <ChevronRight />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4 rounded-lg border border-border bg-muted/30 p-5">
            {safetyStopFields.length === 0 && (
              <p className="text-sm text-muted-foreground">No safety stops recorded.</p>
            )}
            {safetyStopFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
                <div>
                  <label htmlFor={`safety-stop-depth-${index}`} className={labelClassName}>Depth ({depthLabel})</label>
                  <input
                    type="number"
                    step="0.1"
                    id={`safety-stop-depth-${index}`}
                    {...register(`safetyStops.${index}.depth`, { valueAsNumber: true })}
                    className={fieldClassName}
                  />
                  <FieldError message={errors.safetyStops?.[index]?.depth?.message} />
                </div>
                <div>
                  <label htmlFor={`safety-stop-duration-${index}`} className={labelClassName}>Duration (min)</label>
                  <input
                    type="number"
                    id={`safety-stop-duration-${index}`}
                    {...register(`safetyStops.${index}.duration`, { valueAsNumber: true })}
                    className={fieldClassName}
                  />
                  <FieldError message={errors.safetyStops?.[index]?.duration?.message} />
                </div>
                <Button type="button" variant="outline" size="icon" className="mt-6" onClick={() => removeSafetyStop(index)} aria-label={`Remove safety stop ${index + 1}`}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => appendSafetyStop({ depth: settings.units.depth === 'feet' ? 15 : 5, duration: 3 })}
            >
              <Plus /> Add safety stop
            </Button>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={isEquipmentOpen} onOpenChange={setIsEquipmentOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between">
              Equipment (optional)
              {isEquipmentOpen ? <ChevronDown /> : <ChevronRight />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <EquipmentForm equipment={equipment} onChange={setEquipment} />
          </CollapsibleContent>
        </Collapsible>

        {saveError && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            {saveError}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <Button variant="outline" size="lg" asChild className="px-6">
            <Link to="/">Cancel</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting} className="bg-blue-600 px-6 hover:bg-blue-700">
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DiveForm;
