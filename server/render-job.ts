import { spawn, type ChildProcess } from 'node:child_process';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import FFT from 'fft.js';
import { drawScene, type VisualSettings } from '../src/render';
import { bandEnergy } from '../src/presets';
export interface Job {
  id: string; dir: string; status: 'preparing'|'rendering'|'complete'|'cancelled'|'error';
  progress: number; error?: string; child?: ChildProcess; cancelled: boolean; output: string;
}
const ffmpeg = process.env.MTK_FFMPEG || 'ffmpeg';
export async function renderJob(job: Job, audioPath: string, imagePath: string | undefined, settings: VisualSettings, width = 1920, height = 1080) {
  const pcmPath = `${job.dir}/analysis.pcm`;
  try {
    // Mono analysis is bounded to two hours; final output uses the original audio.
    const decoder = spawn(ffmpeg, ['-v','error','-y','-i',audioPath,'-vn','-t','7201','-ac','1','-ar','22050','-f','f32le',pcmPath]);
    job.child=decoder;
    let decodeError=''; decoder.stderr?.on('data', b=>{decodeError=(decodeError+b).slice(-2000);});
    const decodeExit = new Promise<void>((resolve,reject)=>{decoder.once('error',reject);decoder.once('close',code=>code===0?resolve():reject(new Error(decodeError || '오디오 분석 실패')));});
    await decodeExit;
    if(job.cancelled) return;
    const pcm = await readFile(pcmPath);
    if(job.cancelled) return;
    const samples = new Float32Array(pcm.buffer,pcm.byteOffset,Math.floor(pcm.length/4));
    const duration=samples.length/22050;
    if(duration<=0 || duration>7200) throw new Error('0초 초과, 2시간 이하의 음악을 선택해 주세요.');
    const background=imagePath ? await loadImage(imagePath) : undefined;
    if(job.cancelled) return;
    if(background && background.width*background.height>40000000) throw new Error('배경 이미지는 4천만 화소 이하로 선택해 주세요.');
    const canvas=createCanvas(width,height), ctx=canvas.getContext('2d');
    const frames=Math.ceil(duration*30);
    const encoder=spawn(ffmpeg,['-v','error','-y','-f','image2pipe','-framerate','30','-i','pipe:0','-i',audioPath,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','320k','-t',String(duration),'-movflags','+faststart',job.output],{stdio:['pipe','ignore','pipe']});
    job.child=encoder;
    let encodeError='';encoder.stderr.on('data',b=>{encodeError=(encodeError+b).slice(-2000);});
    // Attach error handlers before producing frames to avoid unhandled pipe errors.
    encoder.stdin.on('error',()=>{});
    const encoded=new Promise<void>((resolve,reject)=>{encoder.once('error',reject);encoder.once('close',code=>code===0?resolve():reject(new Error(encodeError || 'MP4 인코딩 실패')));});
    void encoded.catch(()=>{});
    job.status='rendering';
    const fft=new FFT(1024), input=new Array<number>(1024).fill(0), spectrum=fft.createComplexArray();
    const bins=new Uint8Array(512);let smoothed=0;
    for(let frame=0;frame<frames;frame++) {
      if(job.cancelled) break;
      const offset=Math.floor(frame/30*22050);
      for(let i=0;i<1024;i++) input[i]=(samples[offset+i]||0)*(0.5-0.5*Math.cos(2*Math.PI*i/1023));
      fft.realTransform(spectrum,input);
      for(let i=0;i<512;i++) {
        const magnitude=Math.hypot(spectrum[i*2],spectrum[i*2+1])/512;
        const level=Math.max(0,Math.min(255,(20*Math.log10(Math.max(magnitude,1e-10))+100)/70*255));
        bins[i]=Math.round(bins[i]*.8+level*.2);
      }
      smoothed+=(bandEnergy(bins,1,24)*settings.sensitivity-smoothed)*(1-Math.exp(-12/30));
      drawScene(ctx as unknown as CanvasRenderingContext2D,width,height,bins,settings,smoothed,background as unknown as CanvasImageSource);
      const png=await canvas.encode('png');
      if(job.cancelled) break;
      if(encoder.stdin.destroyed) {await encoded;throw new Error('인코더 연결이 종료되었습니다.');}
      if(!encoder.stdin.write(png)) await Promise.race([once(encoder.stdin,'drain'),encoded.then(()=>{throw new Error('인코더가 종료되었습니다.');})]);
      job.progress=Math.min(99,Math.floor((frame+1)/frames*100));
    }
    encoder.stdin.end();
    await encoded;
    if(!job.cancelled){job.status='complete';job.progress=100;}
  } catch(error) {
    job.child?.kill('SIGTERM');
    if(!job.cancelled){job.status='error';job.error=error instanceof Error?error.message:'영상 생성 실패';}
  } finally {if(job.cancelled) job.status='cancelled';job.child=undefined;}
}
