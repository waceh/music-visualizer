import { test } from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { checkFFmpeg } from '../server/ffmpeg';

test('FFmpeg availability requires the exact video and audio encoders', t => {
  let result = { status: 0 as number | null, stdout: ' V....D libx264 H.264 encoder\n A..... aac AAC encoder\n' };
  const mock = t.mock.method(childProcess, 'spawnSync', () => result);
  syncBuiltinESMExports();
  try {
    assert.deepEqual(checkFFmpeg('/custom/ffmpeg'), { available: true });
    assert.equal(mock.mock.calls[0].arguments[0], '/custom/ffmpeg');
    for (const [stdout, missing] of [
      [' V....D libx264rgb RGB encoder\n A..... aac AAC encoder\n', 'libx264'],
      [' V....D libx264 H.264 encoder\n A..... libfdk_aac AAC encoder\n', 'aac'],
      ['', 'libx264, aac'],
    ]) {
      result = { status: 0, stdout };
      const availability = checkFFmpeg();
      assert.equal(availability.available, false);
      assert.ok(availability.error?.includes(`인코더(${missing})`));
    }
    result = { status: null, stdout: '' };
    assert.match(checkFFmpeg().error!, /FFmpeg를 실행할 수 없습니다/);
    result = { status: 1, stdout: '' };
    assert.equal(checkFFmpeg().available, false);
  } finally {
    mock.mock.restore();
    syncBuiltinESMExports();
  }
});
