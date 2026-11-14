/* Lyric Studio video looks: backgrounds, shapes, fonts, line animations, effects.
   Everything is drawn from time t alone (no stored particle state), so preview and
   the recorded video always match. */
(function(){
const R = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
const back = p => { p = clamp(p, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

function lin(c, H, stops){ const g = c.createLinearGradient(0, 0, 0, H); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
function blobs(c, W, H, t, lv, u, cols, speed, pulse){
  cols.forEach((col, i) => {
    const x = W * (.5 + .38 * Math.sin(t * speed + i * 2.1)), y = H * (.5 + .36 * Math.cos(t * speed * .8 + i * 1.7));
    const r = u * (.42 + .08 * i) * (1 + lv * pulse);
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
}

const BG = {
  sea: { name:'Calm seaside', sw:'#0b6e7c', ink:'#f3fbff', acc:'#7fe0d0', draw(c,W,H,t,lv,u){ c.fillStyle = lin(c,H,['#06283d','#0b6e7c']); c.fillRect(0,0,W,H); blobs(c,W,H,t,lv,u,['#1fb5b0','#3a7bd5','#7fe0d0'],.12,.15); } },
  dj: { name:'DJ lights', sw:'#7c3aed', ink:'#ffffff', acc:'#ff2e88', draw(c,W,H,t,lv,u){
    c.fillStyle = lin(c,H,['#12041f','#3a0a4f']); c.fillRect(0,0,W,H); blobs(c,W,H,t,lv,u,['#ff2e88','#7c3aed','#19d3ff'],.5,.6);
    c.save(); c.globalCompositeOperation = 'lighter';
    for(let i = 0; i < 4; i++){ const a = t * (.4 + i * .13) + i * 1.6, x = W * (i + .5) / 4;
      c.save(); c.translate(x, -H * .05); c.rotate(Math.sin(a) * .5);
      const g = c.createLinearGradient(0, 0, 0, H * 1.1); const col = ['#ff2e88','#19d3ff','#a66bff','#ffe14d'][i];
      g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00'); c.fillStyle = g;
      c.beginPath(); c.moveTo(-u*.01,0); c.lineTo(u*.01,0); c.lineTo(u*(.16+lv*.08),H*1.1); c.lineTo(-u*(.16+lv*.08),H*1.1); c.fill(); c.restore(); }
    c.restore(); } },
  gold: { name:'Marigold night', sw:'#ff8a1f', ink:'#fff7e6', acc:'#ffd166', draw(c,W,H,t,lv,u){ c.fillStyle = lin(c,H,['#120a02','#4a2206']); c.fillRect(0,0,W,H); blobs(c,W,H,t,lv,u,['#ffb020','#ff6a3d','#ffd98a'],.25,.35); } },
  petals: { name:'Festival petals', sw:'#e8590c', ink:'#fff8ec', acc:'#ffd43b', draw(c,W,H,t,lv,u){
    c.fillStyle = lin(c,H,['#5c0a14','#b3261e','#e8590c']); c.fillRect(0,0,W,H);
    for(let i = 0; i < 46; i++){ const sp = .05 + R(i) * .08, y = ((R(i + 9) + t * sp) % 1.15 - .08) * H, x = (R(i + 3) * W + Math.sin(t * .8 + i) * u * .05);
      const s = u * (.012 + R(i + 5) * .018) * (1 + lv * .3), rot = t * (R(i + 7) - .5) * 3 + i;
      c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = R(i + 11) > .5 ? '#ffb703' : '#fb8500'; c.globalAlpha = .85;
      c.beginPath(); c.ellipse(0, 0, s, s * .55, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    c.globalAlpha = 1; } },
  aurora: { name:'Northern lights', sw:'#2bd9a5', ink:'#f0fff9', acc:'#7dffcf', draw(c,W,H,t,lv,u){
    c.fillStyle = lin(c,H,['#020617','#071b33','#0b2a3a']); c.fillRect(0,0,W,H);
    c.save(); c.globalCompositeOperation = 'lighter';
    ['#2bd9a5','#7c5cff','#18c8ff'].forEach((col, k) => {
      c.beginPath(); const base = H * (.28 + k * .12), amp = H * (.06 + lv * .05);
      c.moveTo(0, H); for(let x = 0; x <= W; x += W / 40) c.lineTo(x, base + Math.sin(x / W * 5 + t * (.35 + k * .1) + k) * amp + Math.sin(x / W * 11 - t * .5) * amp * .4);
      c.lineTo(W, H); c.closePath();
      const g = c.createLinearGradient(0, base - amp, 0, base + H * .35); g.addColorStop(0, col + '00'); g.addColorStop(.15, col + '66'); g.addColorStop(1, col + '00');
      c.fillStyle = g; c.fill(); });
    c.restore();
    for(let i = 0; i < 70; i++){ c.globalAlpha = .3 + .7 * Math.abs(Math.sin(t * (1 + R(i)) + i)); c.fillStyle = '#fff'; c.fillRect(R(i) * W, R(i + 1) * H * .45, 2, 2); }
    c.globalAlpha = 1; } },
  neon: { name:'Neon highway', sw:'#ff3cac', ink:'#ffffff', acc:'#ff3cac', draw(c,W,H,t,lv,u){
    const hz = H * .58; c.fillStyle = lin(c,hz,['#0b0221','#3b0a57','#ff3cac']); c.fillRect(0,0,W,hz);
    const sr = u * (.22 + lv * .03), sx = W / 2, sy = hz - sr * .35;
    c.save(); c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.clip();
    const sg = c.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, '#ffe66d'); sg.addColorStop(1, '#ff3cac'); c.fillStyle = sg; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    c.fillStyle = '#3b0a57'; for(let k = 0; k < 7; k++){ const yy = sy + sr * (.1 + k * .14); c.fillRect(sx - sr, yy, sr * 2, sr * (.02 + k * .012)); }
    c.restore();
    c.fillStyle = '#0b0221'; c.fillRect(0, hz, W, H - hz);
    c.strokeStyle = '#ff3cac'; c.lineWidth = Math.max(1, u * .003); c.globalAlpha = .8;
    for(let k = -12; k <= 12; k++){ c.beginPath(); c.moveTo(W / 2 + k * W * .02, hz); c.lineTo(W / 2 + k * W * .22, H); c.stroke(); }
    const off = (t * (.6 + lv)) % 1;
    for(let k = 0; k < 14; k++){ const z = (k + off) / 14, y = hz + (H - hz) * z * z; c.globalAlpha = z; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.globalAlpha = 1; } },
  stars: { name:'Into space', sw:'#4c6ef5', ink:'#ffffff', acc:'#91a7ff', draw(c,W,H,t,lv,u){
    c.fillStyle = '#03030c'; c.fillRect(0,0,W,H); blobs(c,W,H,t,lv,u,['#3b2a8a','#13315c'],.05,.1);
    const cx = W / 2, cy = H / 2, sp = .08 + lv * .25;
    for(let i = 0; i < 160; i++){ const a = R(i) * Math.PI * 2, z = (R(i + 2) + t * sp * (.5 + R(i + 4))) % 1, d = z * z * Math.max(W, H) * .8;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, s = .6 + z * 3;
      c.globalAlpha = z; c.fillStyle = '#fff'; c.fillRect(x, y, s, s); }
    c.globalAlpha = 1; } },
  rain: { name:'Midnight rain', sw:'#1c7ed6', ink:'#eaf6ff', acc:'#74c0fc', draw(c,W,H,t,lv,u){
    c.fillStyle = lin(c,H,['#020c1b','#0b2545','#13315c']); c.fillRect(0,0,W,H);
    blobs(c,W,H,t,lv,u,['#1c7ed6','#5f3dc4'],.06,.1);
    c.strokeStyle = '#a5d8ff'; c.lineWidth = Math.max(1, u * .0018);
    for(let i = 0; i < 120; i++){ const sp = .9 + R(i) * .9, y = ((R(i + 1) + t * sp) % 1.1 - .05) * H, x = R(i + 2) * W, l = u * (.03 + R(i + 3) * .04);
      c.globalAlpha = .25 + R(i + 4) * .45; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * .18, y + l); c.stroke(); }
    if(lv > .78){ c.globalAlpha = (lv - .78) * 1.2; c.fillStyle = '#dbe4ff'; c.fillRect(0, 0, W, H); }
    c.globalAlpha = 1; } },
  sunset: { name:'Sunset beach', sw:'#ff922b', ink:'#fff9f0', acc:'#ffe066', draw(c,W,H,t,lv,u){
    const hz = H * .62; c.fillStyle = lin(c,hz,['#3b1f5c','#c2255c','#ff922b','#ffd43b']); c.fillRect(0,0,W,hz);
    const sr = u * (.16 + lv * .02); const g = c.createRadialGradient(W/2, hz, 0, W/2, hz, sr * 3); g.addColorStop(0, '#fff3bf'); g.addColorStop(.3, '#ffd43baa'); g.addColorStop(1, '#ffd43b00');
    c.fillStyle = g; c.fillRect(0, 0, W, hz); c.fillStyle = '#fff3bf'; c.beginPath(); c.arc(W/2, hz, sr, Math.PI, 0); c.fill();
    c.fillStyle = lin(c,H,['#1d3557','#0b132b']); c.fillRect(0, hz, W, H - hz);
    for(let k = 0; k < 26; k++){ const y = hz + (H - hz) * (k / 26) ** 1.4, w = W * (.08 + .5 * (1 - k / 26)) * (.6 + .4 * Math.sin(t * 1.5 + k));
      c.globalAlpha = .5 * (1 - k / 26); c.fillStyle = '#ffd8a8'; c.fillRect(W / 2 - w / 2 + Math.sin(t + k) * u * .02, y, w, Math.max(1, u * .004)); }
    c.globalAlpha = 1; } },
  eq: { name:'Equalizer', sw:'#40c057', ink:'#ffffff', acc:'#69db7c', draw(c,W,H,t,lv,u,spec){
    c.fillStyle = lin(c,H,['#06140b','#0b2b19']); c.fillRect(0,0,W,H); blobs(c,W,H,t,lv,u,['#2b8a3e','#1971c2'],.08,.2);
    const n = 32, bw = W / (n * 1.4), base = H * .9, cols = ['#69db7c','#38d9a9','#4dabf7'];
    for(let i = 0; i < n; i++){ const j = Math.abs(i - n / 2) | 0; let v = spec ? spec[Math.min(spec.length - 1, j * 2 + 1)] / 255 : (.3 + .3 * Math.sin(t * 3 + i));
      const h = H * .05 + v * H * .38, x = (i + .2) * W / n; c.fillStyle = cols[i % 3]; c.globalAlpha = .9;
      c.fillRect(x, base - h, bw, h); c.globalAlpha = .25; c.fillRect(x, base + u * .01, bw, h * .3); }
    c.globalAlpha = 1; } },
  vinyl: { name:'Spinning record', sw:'#c92a2a', ink:'#fff5f5', acc:'#ff8787', draw(c,W,H,t,lv,u){
    c.fillStyle = lin(c,H,['#1a0b0b','#2d1212']); c.fillRect(0,0,W,H); blobs(c,W,H,t,lv,u,['#c92a2a','#862e9c'],.07,.15);
    const r = u * .46 * (1 + lv * .02), cx = W / 2, cy = H / 2; c.save(); c.translate(cx, cy); c.rotate(t * 3.3);
    c.fillStyle = '#0c0c0c'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 1; for(let k = 1; k < 26; k++){ c.beginPath(); c.arc(0, 0, r * (.36 + k * .024), 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.09)'; c.beginPath(); c.moveTo(0,0); c.arc(0, 0, r, -.3, .15); c.fill();
    c.fillStyle = '#c92a2a'; c.beginPath(); c.arc(0, 0, r * .3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffd8a8'; c.fillRect(-r * .2, -r * .02, r * .4, r * .04);
    c.fillStyle = '#111'; c.beginPath(); c.arc(0, 0, r * .03, 0, Math.PI * 2); c.fill(); c.restore();
    c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, W, H); } },
  smoke: { name:'Smoke', sw:'#868e96', ink:'#ffffff', acc:'#dee2e6', draw(c,W,H,t,lv,u){
    c.fillStyle = '#050505'; c.fillRect(0,0,W,H);
    for(let i = 0; i < 9; i++){ const x = W * (.5 + .45 * Math.sin(t * .07 * (1 + R(i)) + i * 1.3)), y = H * (.5 + .45 * Math.cos(t * .05 * (1 + R(i + 1)) + i * 2.1)), r = u * (.3 + R(i + 2) * .35) * (1 + lv * .1);
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(180,180,190,.16)'); g.addColorStop(1, 'rgba(180,180,190,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); } } },
  paper: { name:'Clean paper', sw:'#f1e9da', ink:'#1d1a16', acc:'#d9480f', light:true, draw(c,W,H,t,lv,u){
    c.fillStyle = '#f4efe6'; c.fillRect(0,0,W,H);
    ['#ffd8a8','#c5f6fa','#ffdeeb'].forEach((col, i) => { const x = W * (.5 + .4 * Math.sin(t * .1 + i * 2)), y = H * (.5 + .4 * Math.cos(t * .08 + i * 1.4)), r = u * (.35 + i * .06) * (1 + lv * .1);
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + 'cc'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, W, H); }); } },
  photo: { name:'My photo', sw:'#adb5bd', ink:'#ffffff', acc:'#ffd166', draw(c,W,H,t,lv,u,spec,L){
    const img = L.photo; c.fillStyle = '#111'; c.fillRect(0,0,W,H); if(!img) return;
    const src = L.fx.blur && L.photoBlur ? L.photoBlur : img;
    const z = 1.08 + .06 * Math.sin(t * .05) + lv * .015, s = Math.max(W / img.width, H / img.height) * z;
    const dw = img.width * s, dh = img.height * s, dx = (W - dw) / 2 + Math.sin(t * .04) * W * .02, dy = (H - dh) / 2 + Math.cos(t * .05) * H * .02;
    c.drawImage(src, dx, dy, dw, dh); c.fillStyle = 'rgba(0,0,0,.38)'; c.fillRect(0, 0, W, H); } }
};

const RATIOS = { '9:16':{name:'Vertical 9:16', note:'Reels, Shorts', w:720, h:1280}, '16:9':{name:'Wide 16:9', note:'YouTube', w:1280, h:720},
  '1:1':{name:'Square 1:1', w:1080, h:1080}, '4:5':{name:'Portrait 4:5', note:'Instagram feed', w:864, h:1080}, '21:9':{name:'Cinema 21:9', w:1680, h:720} };

const FONTS = {
  bold:    { name:'Bold',        fam:'"Hanken Grotesk","Noto Sans Telugu","Noto Sans Devanagari",sans-serif', w:800, k:1 },
  poster:  { name:'Tall poster', fam:'"Bebas Neue","Ramabhadra","Rozha One",sans-serif', w:400, k:1.3, upper:true },
  elegant: { name:'Elegant',     fam:'"Playfair Display","Noto Serif Telugu","Noto Serif Devanagari",serif', w:700, k:1 },
  hand:    { name:'Handwritten', fam:'"Caveat","Mallanna","Kalam",cursive', w:700, k:1.18 },
  chunky:  { name:'Chunky',      fam:'"Unbounded","Ramabhadra","Rozha One",sans-serif', w:800, k:.82 }
};
const ANIMS = { rise:'Fade up', pop:'Pop', words:'Word by word', karaoke:'Karaoke', type:'Typewriter', slide:'Slide in', zoom:'Zoom in' };
const TSTYLES = { glow:'Soft shadow', outline:'Outline', box:'Highlight box', neon:'Neon glow' };
const COLORS = { theme:['Match background',null], white:['White','#ffffff'], gold:['Gold','#ffd166'], pink:['Pink','#ff6fa8'], cyan:['Cyan','#6ff3ff'], black:['Black','#111111'] };
const POS = { mid:'Middle', low:'Lower', high:'Upper' };
const FX = { pulse:'Beat pulse', sparkle:'Sparkles', grain:'Film grain', bars:'Cinema bars', next:'Show next line', info:'Song title', blur:'Blur photo' };

function defaults(){ return { bg:'sea', ratio:'9:16', font:'bold', anim:'rise', tstyle:'glow', color:'theme', pos:'mid',
  fx:{ pulse:true, sparkle:false, grain:false, bars:false, next:true, info:true, blur:true } }; }

let grainCv = null;
function grain(c, W, H, t){
  if(!grainCv){ grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = 192; const g = grainCv.getContext('2d'), d = g.createImageData(192, 192);
    for(let i = 0; i < d.data.length; i += 4){ const v = Math.random() * 255; d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 40; } g.putImageData(d, 0, 0); }
  const p = c.createPattern(grainCv, 'repeat'); const ox = (R(Math.floor(t * 24)) * 192) | 0, oy = (R(Math.floor(t * 24) + 1) * 192) | 0;
  c.save(); c.translate(-ox, -oy); c.fillStyle = p; c.globalAlpha = .55; c.fillRect(ox, oy, W, H); c.restore();
}

function layout(c, text, size, font, maxW){
  c.font = `${font.w} ${size}px ${font.fam}`;
  const sp = c.measureText(' ').width, rows = []; let row = { words:[], width:0 };
  text.split(/\s+/).filter(Boolean).forEach(w => { const ww = c.measureText(w).width;
    if(row.words.length && row.width + sp + ww > maxW){ rows.push(row); row = { words:[], width:0 }; }
    row.width += (row.words.length ? sp : 0) + ww; row.words.push({ w, ww }); });
  if(row.words.length) rows.push(row);
  return { rows, sp, lh: size * 1.25 };
}

function paintWord(c, L, txt, x, y, size, col, alpha, ink){
  if(alpha <= .01 || !txt) return;
  c.globalAlpha = alpha;
  const st = L.tstyle;
  if(st === 'outline'){ c.lineJoin = 'round'; c.lineWidth = size * .12; c.strokeStyle = ink === '#111111' || ink === '#1d1a16' ? '#ffffff' : '#000000'; c.strokeText(txt, x, y); c.fillStyle = col; c.fillText(txt, x, y); }
  else if(st === 'neon'){ c.shadowColor = col; c.shadowBlur = size * .55; c.fillStyle = col; c.fillText(txt, x, y); c.shadowBlur = size * .2; c.fillStyle = '#ffffff'; c.globalAlpha = alpha * .55; c.fillText(txt, x, y); c.shadowBlur = 0; }
  else { c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = st === 'box' ? 0 : size * .35; c.fillStyle = col; c.fillText(txt, x, y); c.shadowBlur = 0; }
  c.globalAlpha = 1;
}

/* Draw one lyric line with the chosen animation. p = seconds since the line started, dur = how long it stays. */
function drawLine(c, L, text, cx, cy, size, maxW, p, dur, ink, acc, baseAlpha){
  const font = FONTS[L.font] || FONTS.bold; size *= font.k; if(font.upper) text = text.toUpperCase();
  const lay = layout(c, text, size, font, maxW), n = lay.rows.reduce((a, r) => a + r.words.length, 0) || 1;
  const outA = clamp((dur - p) / .3, 0, 1) * baseAlpha;
  let scale = 1, dx = 0, dy = 0, inA = 1;
  if(L.anim === 'rise'){ inA = ease(p / .3); dy = (1 - ease(p / .4)) * size * .35; }
  else if(L.anim === 'pop'){ inA = clamp(p / .12, 0, 1); scale = .55 + .45 * back(p / .35); }
  else if(L.anim === 'slide'){ inA = ease(p / .3); dx = -(1 - ease(p / .45)) * maxW * .4; }
  else if(L.anim === 'zoom'){ inA = ease(p / .3); scale = 1 + (1 - ease(p / .5)) * .7; }
  const totalH = lay.rows.length * lay.lh, top = cy - totalH / 2 + lay.lh / 2;
  c.save(); c.translate(cx + dx, cy + dy); c.scale(scale, scale); c.translate(-cx, -cy);
  c.font = `${font.w} ${size}px ${font.fam}`; c.textBaseline = 'middle'; c.textAlign = 'left';
  if(L.tstyle === 'box'){
    c.globalAlpha = inA * outA * .9; c.fillStyle = acc;
    lay.rows.forEach((r, ri) => { const pad = size * .25; c.fillRect(cx - r.width / 2 - pad, top + ri * lay.lh - lay.lh / 2 + size * .08, r.width + pad * 2, lay.lh - size * .12); });
    c.globalAlpha = 1;
  }
  const boxInk = L.tstyle === 'box' ? (isLight(acc) ? '#111111' : '#ffffff') : ink;
  const wordDur = Math.max(.12, dur * .7 / n), chars = p * 22; let k = 0, charSeen = 0;
  lay.rows.forEach((r, ri) => {
    let x = cx - r.width / 2; const y = top + ri * lay.lh;
    r.words.forEach(wd => {
      let a = inA * outA, col = boxInk, txt = wd.w, wy = y;
      if(L.anim === 'words'){ const q = (p - k * wordDur) / .22; a = ease(q) * outA; wy = y + (1 - ease(q)) * size * .3; }
      else if(L.anim === 'karaoke'){ a = outA * clamp(p / .2, 0, 1); const lit = p / Math.max(.4, dur * .85) * n; col = k < lit ? acc : boxInk; if(k >= lit) a *= .55; }
      else if(L.anim === 'type'){ a = outA; const left = chars - charSeen; const gs = graphemes(wd.w); txt = left <= 0 ? '' : gs.slice(0, Math.ceil(left)).join(''); charSeen += gs.length + 1; }
      paintWord(c, L, txt, x, wy, size, col, a, ink);
      x += wd.ww + lay.sp; k++;
    });
  });
  c.restore();
  return totalH * scale;
}
const SEG = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity:'grapheme' }) : null;
const graphemes = w => SEG ? Array.from(SEG.segment(w), x => x.segment) : Array.from(w);
function isLight(hex){ const h = hex.replace('#',''); const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16); return (r * 299 + g * 587 + b * 114) / 1000 > 150; }

/* Full frame. o = { lines, title, artist, lineAt } */
function frame(c, W, H, t, lv, spec, L, o){
  const bg = BG[L.bg] || BG.sea, u = Math.min(W, H), plv = L.fx.pulse ? lv : lv * .25;
  c.save(); c.globalAlpha = 1; c.shadowBlur = 0;
  bg.draw(c, W, H, t, plv, u, spec, L);
  const vg = c.createRadialGradient(W/2, H/2, u * .3, W/2, H/2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, bg.light ? 'rgba(80,60,30,.18)' : 'rgba(0,0,0,.55)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  if(L.fx.sparkle){ c.save(); c.globalCompositeOperation = bg.light ? 'source-over' : 'lighter';
    for(let i = 0; i < 40; i++){ const y = (1 - ((R(i) + t * (.03 + R(i + 1) * .05)) % 1)) * H, x = R(i + 2) * W + Math.sin(t + i) * u * .02, s = u * (.003 + R(i + 3) * .006) * (1 + lv);
      c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 2 + i)); c.fillStyle = bg.acc; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill(); }
    c.restore(); }
  const ink = COLORS[L.color] && COLORS[L.color][1] ? COLORS[L.color][1] : bg.ink, acc = bg.acc === ink ? '#ffd166' : bg.acc;
  const bars = L.fx.bars ? H * .1 : 0, cy = L.pos === 'low' ? H * .7 : L.pos === 'high' ? H * .3 : H * .5, maxW = W * .84;
  const font = FONTS[L.font] || FONTS.bold, i = o.lineAt(t), first = o.lines.length ? o.lines[0].t : 1e9;
  if(i < 0){
    const a = Math.min(1, t / .6) * clamp((first - t) / .5, 0, 1);
    if(o.title){ let size = u * .09 * font.k; c.font = `${font.w} ${size}px ${font.fam}`; const tt = font.upper ? o.title.toUpperCase() : o.title;
      while(c.measureText(tt).width > W * .86 && size > 18){ size -= 2; c.font = `${font.w} ${size}px ${font.fam}`; }
      c.textAlign = 'center'; c.textBaseline = 'middle'; paintWord(c, L, tt, W / 2, H * .46, size, ink, a, ink); c.textAlign = 'left'; }
    if(o.artist){ c.font = `600 ${u * .042}px ${FONTS.bold.fam}`; c.textAlign = 'center'; c.textBaseline = 'middle'; paintWord(c, Object.assign({}, L, { tstyle:'glow' }), o.artist, W / 2, H * .46 + u * .11, u * .042, ink, a * .85, ink); c.textAlign = 'left'; }
  } else {
    const cur = o.lines[i], nxt = o.lines[i + 1], end = Math.min(nxt ? nxt.t : cur.t + 6, cur.t + 9), p = t - cur.t, dur = end - cur.t;
    const h = drawLine(c, L, cur.text, W / 2, cy, u * .08 * (1 + plv * .05), maxW, p, dur, ink, acc, 1);
    if(L.fx.next && nxt && nxt.t - t < 6){ const nf = FONTS[L.font] || FONTS.bold, ns = u * .04 * nf.k;
      c.font = `${nf.w} ${ns}px ${nf.fam}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      paintWord(c, Object.assign({}, L, { tstyle: L.tstyle === 'box' ? 'glow' : L.tstyle }), nf.upper ? nxt.text.toUpperCase() : nxt.text, W / 2, cy + h / 2 + u * .085, ns, ink, .38, ink); c.textAlign = 'left'; }
  }
  if(L.fx.info && (o.title || o.artist)){ c.font = `600 ${u * .03}px ${FONTS.bold.fam}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    paintWord(c, Object.assign({}, L, { tstyle:'glow' }), [o.title, o.artist].filter(Boolean).join('  ·  '), W / 2, H - bars - u * .07, u * .03, ink, .6, ink); c.textAlign = 'left'; }
  if(L.fx.grain) grain(c, W, H, t);
  if(bars){ c.fillStyle = '#000'; c.fillRect(0, 0, W, bars); c.fillRect(0, H - bars, W, bars); }
  c.restore();
}

function makeBlur(img){ const w = 96, h = Math.max(1, Math.round(96 * img.height / img.width)); const s = document.createElement('canvas'); s.width = w; s.height = h; s.getContext('2d').drawImage(img, 0, 0, w, h); return s; }
const FONT_LOADS = ['800 40px "Hanken Grotesk"','400 40px "Bebas Neue"','700 40px "Playfair Display"','700 40px "Caveat"','800 40px "Unbounded"','800 40px "Noto Sans Telugu"','800 40px "Noto Sans Devanagari"','700 40px "Noto Serif Telugu"','700 40px "Noto Serif Devanagari"','400 40px "Ramabhadra"','400 40px "Mallanna"','400 40px "Rozha One"','700 40px "Kalam"'];
function loadFonts(){ if(!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all(FONT_LOADS.map(f => document.fonts.load(f, 'Aaతెలుగుहिंदी').catch(() => {}))); }

window.LOOK = { BG, RATIOS, FONTS, ANIMS, TSTYLES, COLORS, POS, FX, defaults, frame, makeBlur, loadFonts, R };
})();
