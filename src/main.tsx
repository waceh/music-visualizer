import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { bandEnergy, formatTime, presets, type PresetKey } from './presets';
import './style.css';
import { drawSpectrum } from './render';
import { ExportPanel } from './ExportPanel';

function App() {
  const audio = useRef<HTMLAudioElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const context = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const audioUrl = useRef<string | null>(null);
  const backgroundUrl = useRef<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [logo, setLogo] = useState('MTK');
  const [eyebrow, setEyebrow] = useState('ONE TRACK. A WHOLE NEW MOOD.');
  const [tagline, setTagline] = useState('MUSIC, THE KEY.');
  const [centerText, setCenterText] = useState('MUSIC, THE KEY.');
  const [videoTitle, setVideoTitle] = useState('');
  const [track, setTrack] = useState('');
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [shape, setShape] = useState<'ring' | 'bars' | 'keys'>('ring');
  const [preset, setPreset] = useState<PresetKey>('neon');
  const [color, setColor] = useState<string>(presets.neon.color);
  const [sensitivity, setSensitivity] = useState<number>(1.5);
  const [background, setBackground] = useState<string>(presets.neon.background);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  useEffect(() => () => {
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    if (backgroundUrl.current) URL.revokeObjectURL(backgroundUrl.current);
    void context.current?.close();
  }, []);

  useEffect(() => {
    const element = canvas.current!;
    const ctx = element.getContext('2d')!;
    let frame = 0;
    let previous = 0;
    let smoothed = 0;
    const bins = new Uint8Array(512);
    const draw = (time: number) => {
      const rect = element.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (element.width !== Math.round(rect.width * dpr) || element.height !== Math.round(rect.height * dpr)) {
        element.width = Math.round(rect.width * dpr); element.height = Math.round(rect.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);
      if (analyser.current) analyser.current.getByteFrequencyData(bins);
      else bins.fill(0);
      const active = audio.current && !audio.current.paused;
      const target = active ? bandEnergy(bins, 1, 24) * sensitivity : 0;
      const dt = Math.min((time - previous) / 1000, 0.1); previous = time;
      smoothed += (target - smoothed) * (1 - Math.exp(-dt * 12));
      drawSpectrum(ctx, w, h, bins, { shape, color, sensitivity, background, title: videoTitle, logo, eyebrow, tagline, centerText }, smoothed, !!active);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [color, sensitivity, shape, centerText]);

  async function togglePlay() {
    if (!track || !audio.current) return;
    setError('');
    if (!audio.current.paused) { audio.current.pause(); return; }
    try {
      if (!context.current) {
        const next = new AudioContext(); context.current = next;
        const node = next.createAnalyser(); node.fftSize = 1024; node.smoothingTimeConstant = 0.8;
        next.createMediaElementSource(audio.current).connect(node); node.connect(next.destination); analyser.current = node;
      }
      await context.current.resume();
      await audio.current.play();
    } catch { setError('음악을 재생할 수 없습니다. 지원되는 MP3, WAV 또는 OGG 파일을 선택해 주세요.'); }
  }
  function upload(file?: File) {
    if (!file) return;
    setAudioFile(file);
    audio.current?.pause();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = URL.createObjectURL(file);
    audio.current!.src = audioUrl.current; audio.current!.load();
    setTrack(file.name.replace(/\.[^.]+$/, '')); setVideoTitle(file.name.replace(/\.[^.]+$/, '').slice(0,200)); setPosition(0); setDuration(0); setError('');
  }
  function selectPreset(key: PresetKey) {
    setPreset(key); setColor(presets[key].color); setSensitivity(presets[key].sensitivity); setBackground(presets[key].background);
  }
  return <main>
    <header><a className="brand" href="#">MTK<span>STUDIO</span></a><span className="badge">MUSIC VISUALIZER / V.01</span></header>
    <section className="intro"><div><p className="eyebrow">SOUND INTO MOTION</p><h1>음악을, 눈으로 느끼다.</h1><p className="subtitle">당신의 사운드에 MTK의 시그니처를 더하세요.</p></div><span className="live"><i/> LIVE PREVIEW</span></section>
    <div className="stage" ref={stage} style={{ backgroundColor: background, ...(image ? { backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,.2)),url("${image}")` } : {}) }}>
      <div className="grid"/><canvas ref={canvas} aria-label={`음악에 반응하는 ${shape === 'ring' ? '원형' : shape === 'bars' ? '막대형' : '건반형'} 비주얼라이저`}/>
      <div className="wordmark"><span className="tiny">{eyebrow}</span><strong style={{ fontSize: logo.length > 5 ? `clamp(18px, ${Math.max(2, 50 / logo.length)}vw, ${Math.max(24, 750 / logo.length)}px)` : undefined }}>{logo}{logo && <span>.</span>}</strong><span className="tagline">{tagline}</span></div>
      <div className="stage-footer"><span>{videoTitle}</span><button onClick={async () => { try { if (fullscreen) await document.exitFullscreen(); else await stage.current?.requestFullscreen(); } catch { setError('이 브라우저에서는 전체 화면을 사용할 수 없습니다.'); } }} aria-label="전체 화면">{fullscreen ? '축소 ↙' : '전체 화면 ↗'}</button></div>
    </div>
    <section className="transport"><button className="play" disabled={!track} onClick={() => void togglePlay()} aria-label={playing ? '일시정지' : '재생'}>{playing ? 'Ⅱ' : '▶'}</button><div className="track"><strong>{track || '음악을 업로드해 시작하세요'}</strong><span>{track ? 'LOCAL AUDIO · MTK STUDIO' : 'MP3, WAV, OGG · 브라우저에서 처리'}</span></div><span className="time">{formatTime(position)}</span><input aria-label="재생 위치" type="range" min="0" max={duration || 0} step="0.1" value={position} disabled={!duration} onChange={e => { const value = Number(e.target.value); audio.current!.currentTime = value; setPosition(value); }}/><span className="time">{formatTime(duration)}</span><label className="volume">음량<input aria-label="음량" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))}/></label></section>
    {error && <p className="error" role="alert">{error}</p>}
    <section className="controls"><div className="panel"><h2><span>01</span> 음악 & 배경</h2><label className="upload">＋ 음악 파일 선택<input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }}/></label><div className="background-controls"><label className="secondary">배경 이미지<input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (!file) return; setImageFile(file); if (backgroundUrl.current) URL.revokeObjectURL(backgroundUrl.current); backgroundUrl.current = URL.createObjectURL(file); setImage(backgroundUrl.current); e.target.value = ''; }}/></label><button className="secondary" disabled={!image} onClick={() => { setImage(''); setImageFile(null); if (backgroundUrl.current) URL.revokeObjectURL(backgroundUrl.current); backgroundUrl.current = null; }}>초기화</button><input type="color" aria-label="배경 색상" value={background} onChange={e => setBackground(e.target.value)}/></div><p className="hint">미리보기와 영상 출력은 이 컴퓨터에서 처리됩니다.</p></div>
    <div className="panel"><h2><span>02</span> 비주얼라이저 & 프리셋</h2><div className="shapes" role="group" aria-label="비주얼라이저 형태">{([{ key: 'ring', name: '◯ 원형' }, { key: 'bars', name: '▥ 막대형' }, { key: 'keys', name: '▤ 건반형' }] as const).map(item => <button key={item.key} aria-pressed={shape === item.key} className={shape === item.key ? 'selected' : ''} onClick={() => setShape(item.key)}>{item.name}</button>)}</div><div className="presets">{(Object.keys(presets) as PresetKey[]).map(key => <button key={key} className={preset === key ? 'selected' : ''} aria-pressed={preset === key} onClick={() => selectPreset(key)}><i style={{ background: presets[key].color }}/>{presets[key].name}</button>)}</div><p className="hint">색상과 반응 강도를 한 번에 바꿔보세요.</p></div>
    <div className="panel"><h2><span>03</span> 디테일 조절</h2><label className="setting">비주얼 색상<input type="color" value={color} onChange={e => setColor(e.target.value)}/></label><label className="setting">민감도<span>{sensitivity.toFixed(1)}×</span></label><input aria-label="민감도" type="range" min="0.3" max="3" step="0.1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))}/></div></section>
    <section className="text-panel" aria-label="영상 텍스트"><h2>04 영상 텍스트</h2><p className="hint">문구를 지우면 영상에서 숨겨집니다. 음악 파일을 바꾸면 하단 제목이 파일명으로 바뀝니다.</p><div className="text-fields">
      <label>로고 텍스트<input aria-label="로고 텍스트" maxLength={24} value={logo} onChange={e => setLogo(e.target.value)}/></label>
      <label>위쪽 문구<input aria-label="위쪽 문구" maxLength={100} value={eyebrow} onChange={e => setEyebrow(e.target.value)}/></label>
      <label>로고 아래 슬로건<input aria-label="로고 아래 슬로건" maxLength={100} value={tagline} onChange={e => setTagline(e.target.value)}/></label>
      <label>비주얼라이저 문구<input aria-label="비주얼라이저 문구" maxLength={100} value={centerText} onChange={e => setCenterText(e.target.value)}/></label>
      <label>하단 제목<input aria-label="하단 제목" maxLength={200} value={videoTitle} onChange={e => setVideoTitle(e.target.value)}/></label>
    </div></section>
    <ExportPanel audioFile={audioFile} imageFile={imageFile} settings={{ shape, color, sensitivity, background, title: videoTitle, logo, eyebrow, tagline, centerText }} onStart={() => audio.current?.pause()} />
    <footer><span>MTK — MUSIC, THE KEY.</span><span>실시간 미리보기 · 로컬 MP4 출력</span></footer>
    <audio ref={audio} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onLoadedMetadata={() => setDuration(Number.isFinite(audio.current!.duration) ? audio.current!.duration : 0)} onTimeUpdate={() => setPosition(audio.current!.currentTime)} onError={() => setError('파일을 읽을 수 없습니다. 다른 오디오 파일을 선택해 주세요.')}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
