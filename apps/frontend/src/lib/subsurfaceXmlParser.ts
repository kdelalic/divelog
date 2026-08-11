import { XMLParser } from 'fast-xml-parser';
import type { Dive, DiveSample, Equipment, Tank, Trip } from './dives';

export interface ImportedDiveSite {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export class SubsurfaceXMLParseError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'SubsurfaceXMLParseError';
  }
}

type XmlNode = Record<string, unknown>;

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const asNode = (value: unknown): XmlNode | undefined => {
  return value !== null && typeof value === 'object' ? value as XmlNode : undefined;
};

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  const node = asNode(value);
  return node ? asString(node['#text']) : undefined;
};

const attribute = (node: XmlNode | undefined, name: string): string | undefined =>
  asString(node?.[`@_${name}`]);

const measurement = (value: unknown): number | undefined => {
  const text = asString(value);
  if (!text) return undefined;
  const match = /-?\d+(?:\.\d+)?/.exec(text);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Subsurface represents minutes and seconds as "76:30 min". Some generated
// files use a plain numeric minute value, so support both forms.
const minutesAndSeconds = (value: unknown): number | undefined => {
  const text = asString(value)?.trim();
  if (!text) return undefined;
  const clock = /^(\d+):(\d{1,2})/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const minutes = measurement(text);
  return minutes === undefined ? undefined : Math.round(minutes * 60);
};

const parseGps = (value: unknown): { latitude: number; longitude: number } | undefined => {
  const text = asString(value);
  if (!text) return undefined;
  const match = /^\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!match) return undefined;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined;
  return { latitude, longitude };
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

const parseDocument = (xmlText: string): XmlNode => {
  try {
    return xmlParser.parse(xmlText) as XmlNode;
  } catch (error) {
    throw new SubsurfaceXMLParseError(
      `Failed to parse Subsurface XML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error,
    );
  }
};

const parseSiteNodes = (value: unknown): ImportedDiveSite[] => {
  const sitesContainer = asNode(value);
  return asArray(sitesContainer?.site)
    .map(asNode)
    .filter((site): site is XmlNode => site !== undefined)
    .map(site => {
      const gps = parseGps(attribute(site, 'gps'));
      return {
        name: attribute(site, 'name')?.trim() || 'Unnamed Dive Site',
        latitude: gps?.latitude ?? 0,
        longitude: gps?.longitude ?? 0,
        description: asString(site.notes)?.trim() || undefined,
      };
    });
};

export const parseSubsurfaceDiveSitesXML = (xmlText: string): ImportedDiveSite[] => {
  const document = parseDocument(xmlText);
  const root = asNode(document.divesites);
  if (!root) {
    throw new SubsurfaceXMLParseError('Invalid Subsurface dive-sites file: missing divesites root element');
  }
  const sites = parseSiteNodes(root);
  if (sites.length === 0) {
    throw new SubsurfaceXMLParseError('No dive sites found in Subsurface XML file');
  }
  return sites;
};

const parseSample = (sample: XmlNode): DiveSample | undefined => {
  const time = minutesAndSeconds(attribute(sample, 'time'));
  const depth = measurement(attribute(sample, 'depth'));
  if (time === undefined || depth === undefined) return undefined;

  const pressureKey = Object.keys(sample).find(key => /^@_pressure\d*$/.test(key));
  const temperature = measurement(attribute(sample, 'temp'));
  const pressure = pressureKey ? measurement(sample[pressureKey]) : undefined;

  return {
    time,
    depth,
    temperature,
    pressure,
  };
};

const parseDiveSamples = (dive: XmlNode): DiveSample[] | undefined => {
  const computers = asArray(dive.divecomputer)
    .map(asNode)
    .filter((computer): computer is XmlNode => computer !== undefined);

  // The app model has one profile per dive. For dives recorded by multiple
  // computers, the profile with the most samples is the least lossy choice.
  const profiles = computers.map(computer => asArray(computer.sample)
    .map(asNode)
    .filter((sample): sample is XmlNode => sample !== undefined)
    .map(parseSample)
    .filter((sample): sample is DiveSample => sample !== undefined)
    .sort((a, b) => a.time - b.time));

  const samples = profiles.sort((a, b) => b.length - a.length)[0];
  return samples?.length ? samples : undefined;
};

const parseTank = (cylinder: XmlNode, index: number): Tank | undefined => {
  const size = measurement(attribute(cylinder, 'size'));
  const startPressure = measurement(attribute(cylinder, 'start'));
  const endPressure = measurement(attribute(cylinder, 'end'));
  const oxygenRaw = measurement(attribute(cylinder, 'o2'));
  const heliumRaw = measurement(attribute(cylinder, 'he'));

  // The API cannot represent a tank without a volume. Some Subsurface dives
  // contain only start/end pressure on an otherwise unknown cylinder; omit
  // that incomplete tank instead of causing the whole batch to fail validation.
  if (size === undefined || size <= 0) {
    return undefined;
  }

  const oxygen = oxygenRaw ?? 21;
  const helium = heliumRaw ?? 0;
  const gasName = helium > 0 ? `Trimix ${oxygen}/${helium}` : oxygen === 21 ? 'Air' : `EANx${oxygen}`;
  return {
    name: attribute(cylinder, 'description') || `Tank ${index + 1}`,
    size,
    working_pressure: Math.max(startPressure ?? 0, endPressure ?? 0, 200),
    start_pressure: startPressure ?? 0,
    end_pressure: endPressure ?? 0,
    gas_mix: {
      oxygen,
      helium,
      nitrogen: Math.max(0, 100 - oxygen - helium),
      name: gasName,
    },
  };
};

const parseEquipment = (dive: XmlNode): Equipment | undefined => {
  const tanks = asArray(dive.cylinder)
    .map(asNode)
    .filter((cylinder): cylinder is XmlNode => cylinder !== undefined)
    .map(parseTank)
    .filter((tank): tank is Tank => tank !== undefined);
  const weights = asArray(dive.weightsystem)
    .map(asNode)
    .filter((weight): weight is XmlNode => weight !== undefined)
    .map(weight => measurement(attribute(weight, 'weight')) ?? 0)
    .reduce((total, weight) => total + weight, 0);
  const suit = attribute(dive, 'suit');

  if (tanks.length === 0 && weights === 0 && !suit) return undefined;
  return {
    tanks,
    weights: weights || undefined,
    wetsuit: suit ? { type: 'wetsuit', material: suit } : undefined,
  };
};

const parseNativeDive = (
  dive: XmlNode,
  index: number,
  siteById: Map<string, ImportedDiveSite>,
	trip?: Omit<Trip, 'id'>,
): Dive | undefined => {
  const date = attribute(dive, 'date');
  const time = attribute(dive, 'time') || '00:00:00';
  if (!date) return undefined;

  const computers = asArray(dive.divecomputer)
    .map(asNode)
    .filter((computer): computer is XmlNode => computer !== undefined);
  const primaryComputer = computers[0];
  const samples = parseDiveSamples(dive);
  const depthNode = asNode(primaryComputer?.depth);
  const temperatureNode = asNode(primaryComputer?.temperature);
  const maxDepth = measurement(attribute(depthNode, 'max')) ??
    (samples?.reduce((max, sample) => Math.max(max, sample.depth), 0) ?? 0);
  const durationSeconds = minutesAndSeconds(attribute(dive, 'duration')) ??
    (samples?.[samples.length - 1]?.time ?? 0);
  if (maxDepth <= 0 && durationSeconds <= 0) return undefined;

  const site = siteById.get(attribute(dive, 'divesiteid') || '');
  const waterTemperature = measurement(attribute(temperatureNode, 'water'));
  const airTemperature = measurement(attribute(temperatureNode, 'air'));
  const rating = measurement(attribute(dive, 'rating'));
  const notes = asString(dive.notes)?.trim() || undefined;
	const diveNumber = measurement(attribute(dive, 'number'));
	const tags = attribute(dive, 'tags')?.split(',').map((tag) => tag.trim()).filter(Boolean);

  return {
		id: diveNumber ?? index + 1,
		diveNumber: diveNumber === undefined ? undefined : Math.round(diveNumber),
		tags: tags?.length ? tags : undefined,
		trip: trip ? { id: 0, ...trip } : undefined,
    datetime: `${date}T${time}`,
    location: site?.name ?? 'Unknown Location',
    depth: Math.round(maxDepth * 100) / 100,
    duration: Math.max(1, Math.round(durationSeconds / 60)),
    buddy: attribute(dive, 'buddy') || undefined,
    lat: site?.latitude ?? 0,
    lng: site?.longitude ?? 0,
    samples,
    equipment: parseEquipment(dive),
    conditions: waterTemperature !== undefined || airTemperature !== undefined
      ? {
          waterTemp: waterTemperature === undefined
            ? undefined
            : { surface: waterTemperature, bottom: waterTemperature },
          airTemp: airTemperature,
        }
      : undefined,
    rating: rating === undefined ? undefined : Math.round(rating),
    notes,
  };
};

export const parseSubsurfaceXML = (xmlText: string): Dive[] => {
  const document = parseDocument(xmlText);
  const root = asNode(document.divelog);
  if (!root) {
    throw new SubsurfaceXMLParseError('Invalid Subsurface XML file: missing divelog root element');
  }

  const sites = parseSiteNodes(root.divesites);
  const siteNodes = asNode(root.divesites);
  const rawSites = asArray(siteNodes?.site).map(asNode);
  const siteById = new Map<string, ImportedDiveSite>();
  rawSites.forEach((site, index) => {
    const id = attribute(site, 'uuid');
    if (id && sites[index]) siteById.set(id, sites[index]);
  });

	const divesContainer = asNode(root.dives);
	const standaloneDives = asArray(divesContainer?.dive)
		.map(asNode)
		.filter((dive): dive is XmlNode => dive !== undefined)
		.map((dive, index) => parseNativeDive(dive, index, siteById));
	const tripDives = asArray(divesContainer?.trip)
		.map(asNode)
		.filter((trip): trip is XmlNode => trip !== undefined)
		.flatMap((trip, tripIndex) => {
			const rawDives = asArray(trip.dive).map(asNode).filter((dive): dive is XmlNode => dive !== undefined);
			const dates = rawDives.map((dive) => attribute(dive, 'date')).filter((date): date is string => Boolean(date)).sort();
			const metadata: Omit<Trip, 'id'> = {
				name: attribute(trip, 'name')?.trim() || `Imported trip ${tripIndex + 1}`,
				location: attribute(trip, 'location')?.trim() || undefined,
				startDate: attribute(trip, 'startdate') || dates[0],
				endDate: attribute(trip, 'enddate') || dates[dates.length - 1],
				notes: asString(trip.notes)?.trim() || undefined,
			};
			return rawDives.map((dive, index) => parseNativeDive(dive, standaloneDives.length + index, siteById, metadata));
		});
	const dives = [...standaloneDives, ...tripDives].filter((dive): dive is Dive => dive !== undefined);

  if (dives.length === 0) {
    throw new SubsurfaceXMLParseError('No valid dives found in Subsurface XML file');
  }
  return dives;
};
