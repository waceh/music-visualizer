import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSettings } from '../server/settings';
const settings={shape:'ring',color:'#d7ff3f',background:'#101b22',sensitivity:1.5,title:'MTK'};
test('export accepts all three shapes and rejects invalid settings',()=>{
  for(const shape of ['ring','bars','keys']) assert.equal(validateSettings({...settings,shape}).shape,shape);
  for(const invalid of [{shape:'other'},{color:'red'},{background:'url(x)'},{sensitivity:NaN},{sensitivity:4},{title:'x'.repeat(201)},{logo:'x'.repeat(25)},{eyebrow:42},{centerText:'x'.repeat(101)}]) assert.throws(()=>validateSettings({...settings,...invalid}));
});

test('export preserves edited and empty text',()=>{const s=validateSettings({...settings,logo:'음트키',eyebrow:'',tagline:'Music, The Key.',centerText:'CAFE VIBES'});assert.equal(s.logo,'음트키');assert.equal(s.eyebrow,'');assert.equal(s.centerText,'CAFE VIBES');});
