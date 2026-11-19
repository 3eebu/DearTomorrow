import { VOICE_RATE, VOICE_SECONDS, VOICE_UPLOAD_LIMIT, voiceWav } from './book-voice';

export async function prepareVoice(blob: Blob, name: string) {
  if (!blob.size || blob.size > VOICE_UPLOAD_LIMIT) throw new Error('Choose an audio file smaller than 12 MB.');
  const bytes = await blob.arrayBuffer();
  const header = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength));
  const signature = String.fromCharCode(...header);
  const supported = signature.startsWith('OggS') || signature.startsWith('ID3') ||
    signature.startsWith('RIFF') && signature.slice(8, 12) === 'WAVE' ||
    signature.slice(4, 8) === 'ftyp' || header[0] === 0xff && (header[1] & 0xe0) === 0xe0 ||
    header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
  if (!supported) throw new Error('Choose a WAV, MP3, M4A, Ogg or WebM recording.');
  if (typeof AudioContext === 'undefined' || typeof OfflineAudioContext === 'undefined') {
    throw new Error('Your browser cannot prepare local recordings. Try a browser with Web Audio support.');
  }
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try { decoded = await context.decodeAudioData(bytes); }
  catch { throw new Error('This browser could not read that recording. Try a WAV or MP3 file.'); }
  finally { void context.close().catch(() => {}); }
  if (decoded.duration <= 0 || decoded.duration > VOICE_SECONDS) throw new Error('Choose a recording no longer than one minute.');
  const frames = Math.ceil(decoded.duration * VOICE_RATE);
  const offline = new OfflineAudioContext(1, frames, VOICE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const result = await offline.startRendering();
  return voiceWav(result.getChannelData(0), name);
}
