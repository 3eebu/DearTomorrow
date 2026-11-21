import { createLetter, editLetter, validateLetter, type Letter } from './letters';
import { resolveRelease, validRelease, validZone, type Release, type Timing } from './letter-time';

const hour = 3_600_000;
const minute = 60_000;
export const journeyLimits = { collection: 30, backup: 48_000_000 };
export const checkpointNames = [
  'Before You Leave', 'Takeoff', 'Above the Clouds', 'Halfway Home', 'Almost There', 'Welcome Back',
] as const;
const envelopeColors = ['#dfc3aa', '#d9b4ab', '#c5c9b2', '#d0b6af', '#dec69c', '#d3aaa8'];
const wax = ['#773e49', '#97554c', '#556747', '#733b52', '#946333', '#783743'];

export type JourneyPoint = { lat: number; lon: number };
export type JourneyPlace = { name: string; point: JourneyPoint | null };
export type JourneyPlan = {
  name: string; from: JourneyPlace; to: JourneyPlace; departure: Release; arrival: Release; dedication: string;
};
export type JourneyInput = Omit<JourneyPlan, 'departure' | 'arrival'> & { departure: Timing; arrival: Timing };
export type JourneyCheckpoint = { id: string; label: string; custom: Release | null; letter: Letter | null };
export type Journey = JourneyPlan & {
  version: 1; id: string; createdAt: number; updatedAt: number; checkpoints: JourneyCheckpoint[];
};
export type JourneySummary = Pick<Journey, 'id' | 'name' | 'from' | 'to' | 'departure' | 'arrival' | 'updatedAt'> & {
  completed: number; opened: number;
};

function plannedRelease(value: Timing, previous?: Release) {
  if (previous && value.wall === previous.wall && value.zone === previous.zone && value.occurrence === previous.occurrence) return previous;
  return resolveRelease(value);
}

export function resolveJourneyPlan(input: JourneyInput, original?: Journey): JourneyPlan {
  const name = input.name.trim();
  const from = { ...input.from, name: input.from.name.trim() };
  const to = { ...input.to, name: input.to.name.trim() };
  if (!name || name.length > 100 || !placeValid(from) || !placeValid(to) || input.dedication.length > 500) {
    throw new Error('Enter a journey name and both cities. Use valid latitude and longitude or leave both coordinates blank.');
  }
  let departure: Release, arrival: Release;
  try { departure = plannedRelease(input.departure, original?.departure); }
  catch { throw new Error('Choose a valid departure time in the departure city’s time zone. A daylight-saving change can skip an hour.'); }
  try { arrival = plannedRelease(input.arrival, original?.arrival); }
  catch { throw new Error('Choose a valid arrival time in the arrival city’s time zone. A daylight-saving change can skip an hour.'); }
  if (arrival.instant <= departure.instant) throw new Error('Arrival must occur after departure. Check the dates and each city’s time zone.');
  return { name, from, to, departure, arrival, dedication: input.dedication.trim() };
}

export function createJourney(plan: JourneyPlan, now = Date.now()): Journey {
  return {
    ...plan, version: 1, id: crypto.randomUUID(), createdAt: now, updatedAt: now,
    checkpoints: checkpointNames.map(label => ({ id: crypto.randomUUID(), label, custom: null, letter: null })),
  };
}

export function checkpointTimes(journey: Pick<Journey, 'departure' | 'arrival' | 'checkpoints'>) {
  const departure = journey.departure.instant;
  const arrival = journey.arrival.instant;
  const duration = arrival - departure;
  const defaults = [departure-hour, departure, departure+duration*.2, departure+duration*.5, departure+duration*.85, arrival];
  return journey.checkpoints.map((stop, index) => stop.custom?.instant ?? Math.round(defaults[index]));
}

export function checkpointZone(journey: Journey, index: number) {
  return journey.checkpoints[index].custom?.zone ?? (index < 3 ? journey.departure.zone : journey.arrival.zone);
}

export function formatJourneyTime(instant: number, zone: string) {
  const seconds = instant % minute !== 0;
  const key = zone + String(seconds);
  let formatter = journeyFormats.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      ...(seconds ? { second: '2-digit' } : {}), timeZoneName: 'short',
    });
    if (journeyFormats.size >= 64) journeyFormats.clear();
    journeyFormats.set(key,formatter);
  }
  return formatter.format(instant);
}
const journeyFormats = new Map<string,Intl.DateTimeFormat>();

export function checkpointStatus(stop: JourneyCheckpoint, instant: number, now: number, author = false) {
  if (!stop.letter) return 'Not written';
  if (stop.letter.state === 'draft') return 'Draft';
  if (stop.letter.state === 'opened') return 'Opened';
  if (author) return 'Sealed';
  return now >= instant ? 'Ready to open' : 'Waiting for opening';
}

export function journeyPhase(journey: Pick<Journey,'departure'|'arrival'>, now: number) {
  return now < journey.departure.instant ? 'Before departure' : now >= journey.arrival.instant ? 'Arrived' : 'On the way';
}

export function journeyProgress(journey: Pick<Journey,'departure'|'arrival'>, now: number) {
  return Math.max(0, Math.min(1, (now-journey.departure.instant) / (journey.arrival.instant-journey.departure.instant)));
}

export function createCheckpointLetter(journey: Journey, index: number, now = Date.now()): Letter {
  const letter = createLetter('love', undefined, now, checkpointZone(journey,index));
  return {
    ...letter, title: journey.checkpoints[index].label,
    envelope: { ...letter.envelope, color: envelopeColors[index], material: index % 2 ? 'linen' : 'cotton',
      back: { ...letter.envelope.back, wax: wax[index], emblem: index === 5 ? 'star' : 'flower' } },
  };
}

export function putCheckpointLetter(journey: Journey, checkpointId: string, letter: Letter, now = Date.now()) {
  const checkpoint = journey.checkpoints.find(stop => stop.id === checkpointId);
  if (!checkpoint || (checkpoint.letter && checkpoint.letter.id !== letter.id)) {
    throw new Error('This envelope has changed. Return to the journey before trying again.');
  }
  return { ...journey, updatedAt: Math.max(now,journey.createdAt),
    checkpoints: journey.checkpoints.map(stop => stop.id === checkpointId ? { ...stop, letter } : stop) };
}

export function openCheckpoint(journey: Journey, index: number, now = Date.now()) {
  const checkpoint = journey.checkpoints[index];
  const letter = checkpoint?.letter;
  if (!letter || letter.state === 'draft' || (letter.state === 'sealed' && now < checkpointTimes(journey)[index])) {
    throw new Error('This envelope is still waiting for its opening time.');
  }
  if (letter.state === 'opened') return journey;
  return putCheckpointLetter(journey, checkpoint.id, { ...letter, state: 'opened', updatedAt: Math.max(now,letter.createdAt) }, now);
}

export function copyJourney(journey: Journey, asDraft: boolean, now = Date.now()): Journey {
  return {
    ...journey, id: crypto.randomUUID(), createdAt: now, updatedAt: now,
    name: asDraft ? journey.name.slice(0,93) + ' (copy)' : journey.name,
    checkpoints: journey.checkpoints.map(stop => {
      if (!stop.letter) return { ...stop, id: crypto.randomUUID() };
      const letter = asDraft ? editLetter(stop.letter, now) : stop.letter;
      return { ...stop, id: crypto.randomUUID(), letter: { ...letter, id: crypto.randomUUID(),
        pages: letter.pages.map(page => ({ ...page, id: crypto.randomUUID() })) } };
    }),
  };
}

export function summarizeJourney(journey: Journey): JourneySummary {
  const {id,name,from,to,departure,arrival,updatedAt,checkpoints} = journey;
  return {id,name,from,to,departure,arrival,updatedAt,
    completed: checkpoints.filter(stop => stop.letter && stop.letter.state !== 'draft').length,
    opened: checkpoints.filter(stop => stop.letter?.state === 'opened').length};
}

const record = (value: unknown): value is Record<string,unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const named = (value: unknown, max: number) => text(value,max) && !!value.trim();
const key = (value: unknown) => text(value,80) && /^[a-z0-9_-]+$/i.test(value);
const stamp = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8.64e15;
function placeValid(value: unknown): value is JourneyPlace {
  if (!record(value) || !named(value.name,90)) return false;
  const point = value.point;
  return point === null || (record(point) && typeof point.lat === 'number' && Math.abs(point.lat) <= 90 &&
    typeof point.lon === 'number' && Math.abs(point.lon) <= 180);
}
function releaseValid(value: unknown): value is Release {
  if (!record(value) || !text(value.wall,16) || !validZone(value.zone) ||
    (value.occurrence !== 'earlier' && value.occurrence !== 'later')) return false;
  const release = value as Release;
  return validRelease(release, release);
}
const invalid = (): never => { throw new Error('This journey or backup could not be read. Saved journeys were kept.'); };

export function validateJourneySummary(value: unknown): JourneySummary {
  const item = value as JourneySummary;
  if (!record(item) || !key(item.id) || !named(item.name,100) || !placeValid(item.from) || !placeValid(item.to) ||
    !releaseValid(item.departure) || !releaseValid(item.arrival) || item.arrival.instant <= item.departure.instant ||
    !stamp(item.updatedAt) || !Number.isInteger(item.completed) || item.completed < 0 || item.completed > 6 ||
    !Number.isInteger(item.opened) || item.opened < 0 || item.opened > item.completed) return invalid();
  return item;
}

export function validateJourney(value: unknown): Journey {
  const journey = value as Journey;
  if (!record(journey) || journey.version !== 1 || !key(journey.id) || !named(journey.name,100) || !placeValid(journey.from) ||
    !placeValid(journey.to) || !text(journey.dedication,500) || !releaseValid(journey.departure) || !releaseValid(journey.arrival) ||
    journey.arrival.instant <= journey.departure.instant || !stamp(journey.createdAt) || !stamp(journey.updatedAt) ||
    journey.updatedAt < journey.createdAt || !Array.isArray(journey.checkpoints) || journey.checkpoints.length !== 6) return invalid();
  const ids = new Set<string>();
  for (const stop of journey.checkpoints) {
    if (!record(stop) || !key(stop.id) || ids.has(stop.id) || !named(stop.label,70) ||
      (stop.custom !== null && !releaseValid(stop.custom))) return invalid();
    ids.add(stop.id);
    if (stop.letter !== null) {
      const letter = validateLetter(stop.letter);
      if (ids.has(letter.id) || letter.kind !== 'love' || letter.collectionId || letter.archived || letter.release) return invalid();
      ids.add(letter.id);
    }
  }
  const times = checkpointTimes(journey);
  if (times.some((time,index) => index > 0 && time <= times[index-1])) {
    throw new Error('Opening times must follow the order of the six envelopes. Adjust the custom times or restore the scheduled defaults.');
  }
  return journey;
}

export type JourneyBackup = { format: 'dear-tomorrow-journey'; version: 1; journey: Journey };
export function makeJourneyBackup(journey: Journey): JourneyBackup {
  return { format: 'dear-tomorrow-journey', version: 1, journey };
}
export function validateJourneyBackup(value: unknown) {
  if (!record(value) || value.format !== 'dear-tomorrow-journey' || value.version !== 1) return invalid();
  return validateJourney(value.journey);
}
