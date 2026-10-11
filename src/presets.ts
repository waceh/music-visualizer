export const presets = {
  neon: { name: 'Neon Pulse', color: '#d7ff3f', sensitivity: 1.5, background: '#101b22' },
  synth: { name: 'Midnight Synth', color: '#bd8bff', sensitivity: 1.2, background: '#20152f' },
  chill: { name: 'Ocean Chill', color: '#72e4e2', sensitivity: 0.8, background: '#102b35' },
} as const;
export type PresetKey = keyof typeof presets;
export function bandEnergy(data: Uint8Array, start: number, end: number): number {
  const values = data.subarray(Math.max(0, start), Math.min(data.length, end));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length / 255 : 0;
}
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
