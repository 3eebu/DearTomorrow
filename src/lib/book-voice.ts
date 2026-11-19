export const voiceStyles = ['handwritten', 'cassette', 'waveform', 'button'] as const;
export const VOICE_RATE = 16000;
export const VOICE_SECONDS = 60;
export const VOICE_UPLOAD_LIMIT = 12 * 1024 * 1024;
export const VOICE_BOOK_LIMIT = 8 * 1024 * 1024;
export const VOICE_COUNT_LIMIT = 24;
const prefix = 'data:audio/wav;base64,';
const maxBytes = 44 + VOICE_RATE * VOICE_SECONDS * 2;

export type VoiceDesign = {
  version: 1; style: typeof voiceStyles[number]; assetId?: string;
  title: string; transcript: string;
};
export type VoiceAsset = { version: 1; name: string; data: string; durationMs: number };

const plain = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, limit: number): value is string => typeof value === 'string' && value.length <= limit;

export function validVoiceDesign(value: unknown, hasAsset: (id: string) => boolean): value is VoiceDesign {
  return plain(value) && Object.keys(value).every(key => ['version', 'style', 'assetId', 'title', 'transcript'].includes(key)) &&
    value.version === 1 && (voiceStyles as readonly unknown[]).includes(value.style) &&
    text(value.title, 120) && text(value.transcript, 12000) &&
    (value.assetId === undefined || text(value.assetId, 100) && hasAsset(value.assetId));
}

export function validVoiceAsset(value: unknown): value is VoiceAsset {
  if (!plain(value) || !Object.keys(value).every(key => ['version', 'name', 'data', 'durationMs'].includes(key)) ||
      value.version !== 1 || !text(value.name, 160) || !text(value.data, prefix.length + Math.ceil(maxBytes / 3) * 4) ||
      !value.data.startsWith(prefix) || typeof value.durationMs !== 'number') return false;
  const encoded = value.data.slice(prefix.length);
  if (encoded.length < 64 || encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false;
  const size = encoded.length * 3 / 4 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
  if (size > maxBytes || size <= 44 || size % 2) return false;
  const header = atob(encoded.slice(0, 60));
  const view = new DataView(Uint8Array.from(header, character => character.charCodeAt(0)).buffer);
  const u32 = (offset: number) => view.getUint32(offset, true);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const duration = Math.round((size - 44) / 2 / VOICE_RATE * 1000);
  return header.startsWith('RIFF') && header.slice(8, 16) === 'WAVEfmt ' && header.slice(36, 40) === 'data' &&
    u32(4) === size - 8 && u32(16) === 16 && u16(20) === 1 && u16(22) === 1 &&
    u32(24) === VOICE_RATE && u32(28) === VOICE_RATE * 2 && u16(32) === 2 && u16(34) === 16 &&
    u32(40) === size - 44 && duration > 0 && value.durationMs === duration;
}

export function voiceWav(samples: Float32Array, name: string): VoiceAsset {
  if (samples.length < 16 || samples.length > VOICE_SECONDS * VOICE_RATE) throw new Error('Keep voice memories under one minute.');
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  function write(offset: number, label: string) {
    for (let index = 0; index < label.length; index++) bytes[offset + index] = label.charCodeAt(index);
  }
  write(0, 'RIFF'); write(8, 'WAVEfmt '); write(36, 'data');
  view.setUint32(4, bytes.length - 8, true);
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, VOICE_RATE, true); view.setUint32(28, VOICE_RATE * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 32767, true));
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return { version: 1, name: name.slice(0, 160), data: prefix + btoa(binary),
    durationMs: Math.round(samples.length / VOICE_RATE * 1000) };
}

export function voiceTime(seconds: number) {
  const time = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
}
