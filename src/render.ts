import { bandEnergy } from './presets';
export type Shape = 'ring' | 'bars' | 'keys';
export interface VisualSettings { shape: Shape; color: string; sensitivity: number; background: string; title: string; logo?: string; eyebrow?: string; tagline?: string; centerText?: string; }
export function drawSpectrum(ctx: CanvasRenderingContext2D, w: number, h: number, bins: Uint8Array, settings: VisualSettings, smoothed: number, active = true) {
 const { shape, color, sensitivity } = settings;
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
        ctx.fillText(settings.centerText ?? 'MUSIC, THE KEY.', x, y + radius * 0.9, radius*2.5);
        return;
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
      ctx.fillText(settings.centerText ?? 'MUSIC, THE KEY.', x, y + 4, radius*1.65);

}

export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, bins: Uint8Array, settings: VisualSettings, smoothed: number, image?: CanvasImageSource) {
 ctx.save(); ctx.fillStyle = settings.background; ctx.fillRect(0, 0, w, h);
 if (image) {
  const source = image as { width: number; height: number };
  const scale = Math.max(w / source.width, h / source.height);
  ctx.drawImage(image, (w-source.width*scale)/2, (h-source.height*scale)/2, source.width*scale, source.height*scale);
  ctx.fillStyle = '#00000066'; ctx.fillRect(0,0,w,h);
 }
 const shade = ctx.createRadialGradient(w*.72,h*.45,0,w*.72,h*.45,w*.85);
 shade.addColorStop(0,'#03090d00'); shade.addColorStop(1,'#03090d99'); ctx.fillStyle=shade; ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#ffffff04'; ctx.lineWidth=1;
 for(let x=0;x<w;x+=52){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=0;y<h;y+=52){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 drawSpectrum(ctx,w,h,bins,settings,smoothed);
 ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.textAlign='left';
 const unit=w/1200;ctx.fillStyle='#b3bac0';ctx.font=`${8*unit}px sans-serif`;
 ctx.fillText(settings.eyebrow ?? 'ONE TRACK. A WHOLE NEW MOOD.',w*.09,h*.36,w*.38);
 ctx.fillStyle='#fff';
 const logo=settings.logo ?? 'MTK';
 let logoSize=140*unit;ctx.font=`900 ${logoSize}px sans-serif`;
 while(ctx.measureText(logo+'.').width>w*.39 && logoSize>10){logoSize-=2;ctx.font=`900 ${logoSize}px sans-serif`;}
 ctx.fillText(logo,w*.09,h*.56);
 if(logo){ctx.fillStyle=settings.color;ctx.fillText('.',w*.09+ctx.measureText(logo).width,h*.56);}
 ctx.fillStyle='#d0d7db';ctx.font=`${12*unit}px sans-serif`;ctx.fillText(settings.tagline ?? 'MUSIC, THE KEY.',w*.09,h*.62,w*.38);
 ctx.fillStyle='#bac1c8';ctx.font=`${12*unit}px sans-serif`;ctx.fillText(settings.title,w*.025,h*.95,w*.85);ctx.restore();
}
