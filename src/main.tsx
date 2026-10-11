import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { bandEnergy, formatTime, presets, type PresetKey } from './presets';
import './style.css';

function App() {
  const audio = useRef<HTMLAudioElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const context = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const audioUrl = useRef<string | null>(null);
  const backgroundUrl = useRef<string | null>(null);
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
      const x = w * (w < 600 ? 0.5 : 0.73), y = h * (w < 600 ? 0.62 : 0.5);
      const radius = Math.min(w * (w < 600 ? 0.21 : 0.145), h * 0.27) * (1 + smoothed * 0.12);
      if (shape !== 'ring') {
        const width = radius * 2.6, left = x - width / 2;
        const count = shape === 'bars' ? 32 : 24, gap = shape === 'bars' ? 4 : 2;
        const keyWidth = width / count;
        for (let i = 0; i < count; i++) {
          const energy = active ? bandEnergy(bins, 2 + i * 5, 7 + i * 5) * sensitivity : 0;
          const height = shape === 'bars' ? 5 + Math.min(energy, 2) * radius : radius * 1.05;
          const bottom = y + radius * 0.6;
          ctx.fillStyle = shape === 'bars' ? color : '#edf1f6';
          ctx.globalAlpha = shape === 'keys' ? 0.22 + Math.min(energy, 1) * 0.78 : 0.9;
          ctx.shadowColor = color; ctx.shadowBlur = energy * 18;
          ctx.fillRect(left + i * keyWidth, bottom - height, keyWidth - gap, height);
          if (shape === 'keys') {
            ctx.globalAlpha = 1; ctx.fillStyle = color;
            ctx.fillRect(left + i * keyWidth, bottom - Math.min(energy, 1) * height, keyWidth - gap, Math.min(energy, 1) * height);
          }
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        if (shape === 'keys') {
          for (let i = 0; i < count - 1; i++) {
            if ([0, 1, 3, 4, 5].includes(i % 7)) {
              ctx.fillStyle = '#080b10';
              ctx.fillRect(left + (i + 1) * keyWidth - keyWidth * 0.3, y - radius * 0.45, keyWidth * 0.6, radius * 0.65);
            }
          }
        }
        ctx.fillStyle = '#ffffff99'; ctx.textAlign = 'center'; ctx.font = '10px sans-serif';
        ctx.fillText('MUSIC IS THE KEY', x, y + radius * 0.9);
        frame = requestAnimationFrame(draw); return;
      }
      ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 22 + smoothed * 20;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
      const count = 160;
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2 - Math.PI / 2;
        const mirrored = i < count / 2 ? i : count - i - 1;
        const energy = active ? (bins[2 + Math.floor(mirrored / (count / 2) * 160)] || 0) / 255 : 0;
        const length = 3 + Math.min(energy * sensitivity, 2) * radius * 0.45;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * (radius + 8), y + Math.sin(angle) * (radius + 8));
        ctx.lineTo(x + Math.cos(angle) * (radius + 8 + length), y + Math.sin(angle) * (radius + 8 + length));
        ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, radius * 0.87, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
      ctx.font = `600 ${Math.max(10, radius * 0.12)}px sans-serif`;
      ctx.fillText('MUSIC IS THE KEY', x, y + 4);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [color, sensitivity, shape]);

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
    audio.current?.pause();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = URL.createObjectURL(file);
    audio.current!.src = audioUrl.current; audio.current!.load();
    setTrack(file.name.replace(/\.[^.]+$/, '')); setPosition(0); setDuration(0); setError('');
  }
  function selectPreset(key: PresetKey) {
    setPreset(key); setColor(presets[key].color); setSensitivity(presets[key].sensitivity); setBackground(presets[key].background);
  }
  return <main>
    <header><a className="brand" href="#">MTK<span>STUDIO</span></a><span className="badge">MUSIC VISUALIZER / V.01</span></header>
    <section className="intro"><div><p className="eyebrow">SOUND INTO MOTION</p><h1>음악을, 눈으로 느끼다.</h1><p className="subtitle">당신의 사운드에 MTK의 시그니처를 더하세요.</p></div><span className="live"><i/> LIVE PREVIEW</span></section>
    <div className="stage" ref={stage} style={{ backgroundColor: background, ...(image ? { backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,.2)),url("${image}")` } : {}) }}>
      <div className="grid"/><canvas ref={canvas} aria-label={`음악에 반응하는 ${shape === 'ring' ? '원형' : shape === 'bars' ? '막대형' : '건반형'} 비주얼라이저`}/>
      <div className="wordmark"><span className="tiny">FEEL THE FREQUENCY</span><strong>MTK<span>.</span></strong><span className="tagline">MUSIC IS THE KEY</span></div>
      <div className="stage-footer"><span>{track || 'YOUR SOUND. YOUR WORLD.'}</span><button onClick={async () => { try { if (fullscreen) await document.exitFullscreen(); else await stage.current?.requestFullscreen(); } catch { setError('이 브라우저에서는 전체 화면을 사용할 수 없습니다.'); } }} aria-label="전체 화면">{fullscreen ? '축소 ↙' : '전체 화면 ↗'}</button></div>
    </div>
    <section className="transport"><button className="play" disabled={!track} onClick={() => void togglePlay()} aria-label={playing ? '일시정지' : '재생'}>{playing ? 'Ⅱ' : '▶'}</button><div className="track"><strong>{track || '음악을 업로드해 시작하세요'}</strong><span>{track ? 'LOCAL AUDIO · MTK STUDIO' : 'MP3, WAV, OGG · 브라우저에서 처리'}</span></div><span className="time">{formatTime(position)}</span><input aria-label="재생 위치" type="range" min="0" max={duration || 0} step="0.1" value={position} disabled={!duration} onChange={e => { const value = Number(e.target.value); audio.current!.currentTime = value; setPosition(value); }}/><span className="time">{formatTime(duration)}</span><label className="volume">음량<input aria-label="음량" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))}/></label></section>
    {error && <p className="error" role="alert">{error}</p>}
    <section className="controls"><div className="panel"><h2><span>01</span> 음악 & 배경</h2><label className="upload">＋ 음악 파일 선택<input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }}/></label><div className="background-controls"><label className="secondary">배경 이미지<input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (backgroundUrl.current) URL.revokeObjectURL(backgroundUrl.current); backgroundUrl.current = URL.createObjectURL(file); setImage(backgroundUrl.current); e.target.value = ''; }}/></label><button className="secondary" disabled={!image} onClick={() => { setImage(''); if (backgroundUrl.current) URL.revokeObjectURL(backgroundUrl.current); backgroundUrl.current = null; }}>초기화</button><input type="color" aria-label="배경 색상" value={background} onChange={e => setBackground(e.target.value)}/></div><p className="hint">파일은 서버에 업로드되지 않습니다.</p></div>
    <div className="panel"><h2><span>02</span> 비주얼라이저 & 프리셋</h2><div className="shapes" role="group" aria-label="비주얼라이저 형태">{([{ key: 'ring', name: '◯ 원형' }, { key: 'bars', name: '▥ 막대형' }, { key: 'keys', name: '▤ 건반형' }] as const).map(item => <button key={item.key} aria-pressed={shape === item.key} className={shape === item.key ? 'selected' : ''} onClick={() => setShape(item.key)}>{item.name}</button>)}</div><div className="presets">{(Object.keys(presets) as PresetKey[]).map(key => <button key={key} className={preset === key ? 'selected' : ''} aria-pressed={preset === key} onClick={() => selectPreset(key)}><i style={{ background: presets[key].color }}/>{presets[key].name}</button>)}</div><p className="hint">색상과 반응 강도를 한 번에 바꿔보세요.</p></div>
    <div className="panel"><h2><span>03</span> 디테일 조절</h2><label className="setting">비주얼 색상<input type="color" value={color} onChange={e => setColor(e.target.value)}/></label><label className="setting">민감도<span>{sensitivity.toFixed(1)}×</span></label><input aria-label="민감도" type="range" min="0.3" max="3" step="0.1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))}/></div></section>
    <footer><span>MTK — MUSIC IS THE KEY</span><span>실시간 미리보기 · 영상 출력은 후속 버전에서 지원 예정</span></footer>
    <audio ref={audio} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onLoadedMetadata={() => setDuration(Number.isFinite(audio.current!.duration) ? audio.current!.duration : 0)} onTimeUpdate={() => setPosition(audio.current!.currentTime)} onError={() => setError('파일을 읽을 수 없습니다. 다른 오디오 파일을 선택해 주세요.')}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
