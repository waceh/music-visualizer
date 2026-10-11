import type { VisualSettings } from '../src/render';
export function validateSettings(value: unknown): VisualSettings {
  const s = value as VisualSettings;
  if (!s || !['ring', 'bars', 'keys'].includes(s.shape) || !/^#[0-9a-f]{6}$/i.test(s.color) || !/^#[0-9a-f]{6}$/i.test(s.background) || !Number.isFinite(s.sensitivity) || s.sensitivity < 0.3 || s.sensitivity > 3 || typeof s.title !== 'string' || s.title.length > 200) throw new Error('영상 설정을 확인해 주세요.');
  for (const [key, limit] of [['logo',24],['eyebrow',100],['tagline',100],['centerText',100]] as const) {
    if(s[key] !== undefined && (typeof s[key] !== 'string' || s[key]!.length > limit)) throw new Error('영상 텍스트의 길이를 확인해 주세요.');
  }
  return {logo:s.logo,eyebrow:s.eyebrow,tagline:s.tagline,centerText:s.centerText,shape:s.shape,color:s.color,background:s.background,sensitivity:s.sensitivity,title:s.title};
}
