export type Timing = { wall: string; zone: string; occurrence: 'earlier' | 'later' };
export type Release = Timing & { instant: number; offset: number };

const wallPattern = /^(19\d{2}|20\d{2}|21\d{2})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const minute = 60_000;

export function wallEpoch(wall: string) {
  const match = wallPattern.exec(wall);
  if (!match) return NaN;
  const [year, month, date, hour, minutes] = match.slice(1).map(Number);
  const time = Date.UTC(year, month - 1, date, hour, minutes);
  return new Date(time).toISOString().slice(0, 16) === wall ? time : NaN;
}

const formats = new Map<string, Intl.DateTimeFormat>();
function zoneFormat(zone: string) {
  const stored = formats.get(zone);
  if (stored) return stored;
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, calendar: 'iso8601', numberingSystem: 'latn', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  if (formats.size > 80) formats.clear();
  formats.set(zone, format);
  return format;
}

export function validZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || !/^[A-Za-z][A-Za-z0-9_+/-]{0,95}$/.test(zone)) return false;
  try { zoneFormat(zone); return true; } catch { return false; }
}

export function localZone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }

function wallAt(instant: number, format: Intl.DateTimeFormat) {
  const values = Object.fromEntries(format.formatToParts(instant).map(part => [part.type, part.value]));
  return values.year + '-' + values.month + '-' + values.day + 'T' + values.hour + ':' + values.minute;
}

/** Convert a wall clock time by round-tripping candidate offsets. Gaps have no candidate and repeated hours have two. */
export function wallOptions(wall: string, zone: string) {
  const nominal = wallEpoch(wall);
  if (!Number.isFinite(nominal) || !validZone(zone)) return [];
  const format = zoneFormat(zone);
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = nominal + hours * 60 * minute;
    const offset = wallEpoch(wallAt(sample, format)) - sample;
    if (Number.isFinite(offset)) offsets.add(offset);
  }
  return Array.from(offsets, offset => nominal - offset)
    .filter(instant => wallAt(instant, format) === wall).sort((a, b) => a - b);
}

export function resolveRelease(timing: Timing): Release {
  const options = wallOptions(timing.wall, timing.zone);
  if (!options.length) throw new Error('Choose a valid opening time. A daylight-saving change can skip part of the day.');
  const instant = timing.occurrence === 'later' ? options[options.length - 1] : options[0];
  return { ...timing, instant, offset: (wallEpoch(timing.wall) - instant) / minute };
}

export function validRelease(release: Release, timing: Timing) {
  // Preserve the chosen instant even when browser time-zone rules change later.
  return release.wall === timing.wall && release.zone === timing.zone && release.occurrence === timing.occurrence &&
    Number.isSafeInteger(release.instant) && Number.isInteger(release.offset) && Math.abs(release.offset) <= 24 * 60 &&
    release.instant === wallEpoch(timing.wall) - release.offset * minute;
}

export function releaseLabel(release: Release) {
  const [date, clock] = release.wall.split('T');
  const nominal = new Date(date + 'T00:00:00Z');
  const offset = Math.abs(release.offset);
  const utc = 'UTC' + (release.offset < 0 ? '−' : '+') +
    String(Math.floor(offset / 60)).padStart(2, '0') + ':' + String(offset % 60).padStart(2, '0');
  return nominal.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' }) + ' at ' + clock +
    ' · ' + release.zone.replaceAll('_', ' ') + ' (' + utc + ')';
}

export function countdown(instant: number, now: number) {
  const remaining = Math.max(0, Math.ceil((instant - now) / 1000));
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor(remaining / 3600) % 24;
  const minutes = Math.floor(remaining / 60) % 60;
  const seconds = remaining % 60;
  return [days ? days + 'd' : '', days || hours ? hours + 'h' : '', minutes + 'm', seconds + 's'].filter(Boolean).join(' ');
}
