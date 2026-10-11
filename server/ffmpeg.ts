import { spawnSync } from 'node:child_process';

export function checkFFmpeg(path = process.env.MTK_FFMPEG || 'ffmpeg') {
  const result = spawnSync(path, ['-hide_banner', '-encoders'], { encoding: 'utf8', timeout: 10000 });
  if (result.error || result.status !== 0) {
    return { available: false, error: 'FFmpeg를 실행할 수 없습니다. FFmpeg를 설치하거나 MTK_FFMPEG 경로를 확인한 뒤 앱을 다시 실행해 주세요.' };
  }
  const missing = [['V', 'libx264'], ['A', 'aac']].filter(([type, name]) =>
    !new RegExp(`^\\s*${type}[A-Z.]{5}\\s+${name}\\s`, 'm').test(result.stdout));
  if (missing.length) {
    return { available: false, error: `FFmpeg에 필요한 인코더(${missing.map(([, name]) => name).join(', ')})가 없습니다. libx264 및 AAC 인코더가 포함된 FFmpeg를 설치한 뒤 앱을 다시 실행해 주세요.` };
  }
  return { available: true };
}
