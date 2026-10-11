import express from 'express';
import multer from 'multer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { renderJob, type Job } from './render-job';
import { validateSettings } from './settings';
const app=express();
const root=await mkdtemp(join(tmpdir(),'mtk-export-'));
const upload=multer({dest:root,limits:{fileSize:512*1024*1024,files:2,fields:1,fieldSize:4096}});
const jobs=new Map<string,Job>();
let acceptingUpload=false;
const available=spawnSync(process.env.MTK_FFMPEG || 'ffmpeg',['-version']).status===0;
app.use((req,res,next)=>{
  const origin=req.headers.origin;
  if(origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {res.status(403).json({error:'로컬 앱에서만 사용할 수 있습니다.'});return;}
  if(!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host || '')) {res.sendStatus(403);return;}
  next();
});
app.get('/api/health',(_req,res)=>res.json({available}));
app.post('/api/exports',(req,res,next)=>{
  if(!available){res.status(503).json({error:'FFmpeg를 설치한 뒤 앱을 다시 실행해 주세요.'});return;}
  if(acceptingUpload || [...jobs.values()].some(j=>j.status==='preparing'||j.status==='rendering')){res.status(409).json({error:'진행 중인 영상 출력을 먼저 완료하거나 취소해 주세요.'});return;}
  acceptingUpload=true;
  next();
},(req,res,next)=>{
  upload.fields([{name:'audio',maxCount:1},{name:'background',maxCount:1}])(req,res,error=>{
    if(error){acceptingUpload=false;next(error);}else next();
  });
},async(req,res)=>{
  const files=req.files as Record<string,Express.Multer.File[]>;
  const paths=Object.values(files || {}).flat().map(f=>f.path);
  try {
    const settings=validateSettings(JSON.parse(req.body.settings));
    if(!files.audio?.[0]) throw new Error('음악 파일을 선택해 주세요.');
    const dir=await mkdtemp(join(root,'job-')), id=randomUUID();
    const job:Job={id,dir,status:'preparing',progress:0,cancelled:false,output:join(dir,'mtk.mp4')};
    jobs.set(id,job);acceptingUpload=false;res.status(202).json({id});
    void renderJob(job,files.audio[0].path,files.background?.[0]?.path,settings).finally(async()=>{
      await Promise.all(paths.map(path=>rm(path,{force:true})));
      await rm(join(dir,'analysis.pcm'),{force:true});
      if(job.status!=='complete') await rm(dir,{recursive:true,force:true});
      setTimeout(()=>{jobs.delete(id);void rm(dir,{recursive:true,force:true});},60*60*1000).unref();
    });
  } catch(error) {acceptingUpload=false;await Promise.all(paths.map(path=>rm(path,{force:true})));res.status(400).json({error:error instanceof Error?error.message:'잘못된 요청'});}
});
app.get('/api/exports/:id',(req,res)=>{
  const j=jobs.get(req.params.id);if(!j){res.sendStatus(404);return;}
  res.json({status:j.status,progress:j.progress,error:j.error});
});
app.delete('/api/exports/:id',(req,res)=>{
  const j=jobs.get(req.params.id);if(!j){res.sendStatus(404);return;}
  if(j.status==='preparing'||j.status==='rendering'){j.cancelled=true;j.status='cancelled';j.child?.kill('SIGTERM');}
  res.sendStatus(204);
});
app.get('/api/exports/:id/download',(req,res)=>{
  const j=jobs.get(req.params.id);if(!j || j.status!=='complete'){res.sendStatus(404);return;}
  res.download(j.output,'MTK-Music-The-Key.mp4');
});
app.use((err:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(400).json({error:err.message});});
const server=app.listen(4174,'127.0.0.1',()=>console.log(`MTK local export ready · FFmpeg ${available?'available':'missing'}`));
async function shutdown(){for(const j of jobs.values()){j.cancelled=true;j.child?.kill('SIGTERM');}server.close();await rm(root,{recursive:true,force:true});process.exit(0);}
process.on('SIGTERM',()=>void shutdown());process.on('SIGINT',()=>void shutdown());
