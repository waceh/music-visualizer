import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandEnergy, formatTime, presets } from '../src/presets.ts';
test('frequency energy is normalized and handles silent or missing bands', () => {
  assert.equal(bandEnergy(new Uint8Array([255, 255, 0]), 0, 2), 1);
  assert.equal(bandEnergy(new Uint8Array([0, 0]), 0, 2), 0);
  assert.equal(bandEnergy(new Uint8Array([]), 0, 24), 0);
  assert.equal(bandEnergy(new Uint8Array([255, 0]), 0, 2), 0.5);
});
test('time display handles metadata before it is available', () => {
  assert.equal(formatTime(Infinity), '0:00');
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(-1), '0:00');
  assert.equal(formatTime(125.9), '2:05');
});
test('presets have valid colors and sensitivity', () => {
  for (const preset of Object.values(presets)) {
    assert.match(preset.color, /^#[\da-f]{6}$/i);
    assert.ok(preset.sensitivity >= 0.3 && preset.sensitivity <= 3);
  }
});
