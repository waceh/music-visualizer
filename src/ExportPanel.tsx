import { useEffect, useState } from 'react';
import type { VisualSettings } from './render';
interface ExportStatus { status: 'preparing'|'rendering'|'complete'|'cancelled'|'error'; progress: number; error?: string; }
export function ExportPanel({audioFile,imageFile,settings,onStart}:{audioFile:File|null;imageFile:File|null;settings:VisualSettings;onStart:()=>void}) {
  const [available,setAvailable]=useState<boolean|null>(null);
  const [jobId,setJobId]=useState<string|null>(()=>sessionStorage.getItem('mtk-export-job'));
  const [status,setStatus]=useState<ExportStatus|null>(null);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState('');
  const [availabilityError,setAvailabilityError]=useState('');
  useEffect(()=>{void fetch('/api/health').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(v=>{setAvailable(v.available===true);setAvailabilityError(v.error || '');}).catch(()=>{setAvailable(false);setAvailabilityError('로컬 출력 서버에 연결할 수 없습니다. npm run dev로 실행해 주세요.');});},[]);
  useEffect(()=>{
    if(!jobId)return;
    let disposed=false;let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      try {
        const response=await fetch(`/api/exports/${jobId}`);
        if(disposed)return;
        if(response.status===404){sessionStorage.removeItem('mtk-export-job');setJobId(null);setStatus(null);setError('출력 작업이 만료됐습니다. 다시 시작해 주세요.');return;}
        if(!response.ok)throw new Error('출력 상태를 확인할 수 없습니다.');
        const value:ExportStatus=await response.json();
        if(disposed)return;
        setStatus(value);setError('');
        if(value.status==='rendering'||value.status==='preparing')timer=setTimeout(()=>void poll(),700);
      }catch(e){if(!disposed){setError(e instanceof Error?e.message:'출력 상태 확인 실패');timer=setTimeout(()=>void poll(),3000);}}
    };
    void poll();return()=>{disposed=true;clearTimeout(timer);};
  },[jobId]);
  const busy=uploading || (!!jobId && (!status || status.status==='preparing'||status.status==='rendering'));
  async function start(){
    if(!audioFile)return;
    onStart();setUploading(true);setError('');setStatus(null);setJobId(null);sessionStorage.removeItem('mtk-export-job');
    try {
      const data=new FormData();data.append('audio',audioFile);if(imageFile)data.append('background',imageFile);
      data.append('settings',JSON.stringify({...settings,title:settings.title.slice(0,200)}));
      const response=await fetch('/api/exports',{method:'POST',body:data});
      const result=await response.json();if(!response.ok)throw new Error(result.error || '영상 출력을 시작할 수 없습니다.');
      sessionStorage.setItem('mtk-export-job',result.id);setJobId(result.id);
    }catch(e){setError(e instanceof Error?e.message:'영상 출력 실패');}finally{setUploading(false);}
  }
  async function cancel(){
    if(!jobId)return;
    try {const r=await fetch(`/api/exports/${jobId}`,{method:'DELETE'});if(!r.ok)throw new Error('취소할 수 없습니다.');setStatus({status:'cancelled',progress:0});}
    catch(e){setError(e instanceof Error?e.message:'취소 실패');}
  }
  return <section className="export-panel" aria-label="영상 출력">
    <div><h2>05 영상 만들기</h2><p>1920 × 1080 · 30 FPS · MP4 · H.264 + AAC</p><p className="hint">현재 설정으로 음악 전체를 출력합니다. 원본 음량을 사용하며, 미리보기 음량은 저장되는 영상에 영향을 주지 않습니다.</p></div>
    <div className="export-actions"><button className="upload" disabled={!audioFile || !available || busy} onClick={()=>void start()}>{uploading?'파일 준비 중…':'MP4 영상 만들기'}</button>{busy && jobId && <button className="secondary" onClick={()=>void cancel()}>출력 취소</button>}{status?.status==='complete' && jobId && <a className="download" href={`/api/exports/${jobId}/download`}>MP4 다운로드 ↓</a>}</div>
    {!available && available!==null && <p className="hint">{availabilityError || 'FFmpeg(libx264 및 AAC 인코더 포함)를 설치하고 앱을 다시 실행해 주세요.'}</p>}
    {(busy || status) && <div className="export-progress" role="status"><span>{uploading?'음악과 배경 준비 중':status?.status==='complete'?'영상 완성 · 1시간 이내에 다운로드해 주세요':status?.status==='cancelled'?'출력을 취소했습니다':status?.status==='error'?'출력 실패':status?.status==='rendering'?`영상 생성 중 · ${status.progress}%`:'음악 분석 중…'}</span><progress max="100" value={status?.progress || 0}/></div>}
    {(error || status?.error) && <p className="error" role="alert">{error || status?.error}</p>}
  </section>;
}
