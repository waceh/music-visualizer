import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { renderJob, type Job } from '../server/render-job';
const enabled=spawnSync('ffmpeg',['-version']).status===0 && spawnSync('ffprobe',['-version']).status===0;
test('exports all shapes with image, original audio, exact duration and playable MP4 codecs',{skip:!enabled,timeout:60000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mtk-test-'));
 try{
  const audio=join(dir,'audio.wav');
  assert.equal(spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=90:duration=0.5','-y',audio]).status,0);
  const image=join(dir,'background.png'), bg=createCanvas(100,60);bg.getContext('2d').fillRect(0,0,100,60);await writeFile(image,await bg.encode('png'));
  for(const shape of ['ring','bars','keys'] as const){
   const job:Job={id:shape,dir,status:'preparing',progress:0,cancelled:false,output:join(dir,`${shape}.mp4`)};
   await renderJob(job,audio,image,{shape,color:'#d7ff3f',background:'#101b22',sensitivity:1.5,title:'Custom footer',logo:'CUSTOM',eyebrow:'Custom top',tagline:'Custom slogan',centerText:'Custom center'},320,180);
   assert.equal(job.status,'complete',job.error);assert.equal(job.progress,100);
   const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',job.output]);assert.equal(probe.status,0);
   const info=JSON.parse(probe.stdout.toString()), video=info.streams.find((s:{codec_type:string})=>s.codec_type==='video'), sound=info.streams.find((s:{codec_type:string})=>s.codec_type==='audio');
   assert.equal(video.codec_name,'h264');assert.equal(sound.codec_name,'aac');assert.equal(video.width,320);assert.equal(video.height,180);assert.equal(video.avg_frame_rate,'30/1');assert.ok(Math.abs(Number(info.format.duration)-.5)<.08);
   const pcm=spawnSync('ffmpeg',['-v','error','-i',job.output,'-map','0:a:0','-f','s16le','pipe:1']).stdout;
   assert.ok(pcm.some(v=>v!==0),'audio must not be silent');
   assert.equal(spawnSync('ffmpeg',['-v','error','-i',job.output,'-f','null','-']).status,0,'entire video must decode');
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('invalid audio reports an error and does not complete',{skip:!enabled},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mtk-invalid-'));
 try{const file=join(dir,'invalid.wav');await writeFile(file,'invalid');const job:Job={id:'invalid',dir,status:'preparing',progress:0,cancelled:false,output:join(dir,'out.mp4')};await renderJob(job,file,undefined,{shape:'ring',color:'#d7ff3f',background:'#101b22',sensitivity:1,title:'test'},320,180);assert.equal(job.status,'error');assert.ok(job.error);}finally{await rm(dir,{recursive:true,force:true});}
});

test('cancelled render stops without producing a completed video',{skip:!enabled,timeout:10000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mtk-cancel-'));
 const audio=join(dir,'audio.wav');
 try{
  assert.equal(spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=duration=5','-y',audio]).status,0);
  const job:Job={id:'cancel',dir,status:'preparing',progress:0,cancelled:false,output:join(dir,'out.mp4')};
  const timer=setInterval(()=>{if(job.status==='rendering'){job.cancelled=true;job.status='cancelled';job.child?.kill('SIGTERM');}},5);
  try{await renderJob(job,audio,undefined,{shape:'ring',color:'#d7ff3f',background:'#101b22',sensitivity:1,title:''},320,180);}finally{clearInterval(timer);}
  assert.equal(job.status,'cancelled');assert.ok(job.progress<100);assert.equal(job.child,undefined);
 }finally{await rm(dir,{recursive:true,force:true});}
});
