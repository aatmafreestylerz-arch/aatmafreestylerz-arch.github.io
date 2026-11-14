/* Lyric Studio video looks.
   Everything is drawn from time t alone (no stored particle state), so preview and the
   recorded video always match. "gen" backgrounds come from a seed, so Shuffle gives an
   endless supply of new ones. */
(function(){
const R = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
const back = p => { p = clamp(p, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const TAU = Math.PI * 2;
function hexA(hex, a){ const h = String(hex || '#ffffff').replace('#',''); const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6);
  const n = parseInt(f, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function hsl(h, s, l){ h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
function lin(c, H, stops){ const g = c.createLinearGradient(0, 0, 0, H); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
function fill(c, W, H, stops){ c.fillStyle = lin(c, H, stops); c.fillRect(0, 0, W, H); }
function blobs(c, W, H, t, lv, u, cols, speed, pulse, a){
  cols.forEach((col, i) => {
    const x = W * (.5 + .38 * Math.sin(t * speed + i * 2.1)), y = H * (.5 + .36 * Math.cos(t * speed * .8 + i * 1.7));
    const r = u * (.42 + .08 * i) * (1 + lv * pulse);
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hexA(col, a == null ? .67 : a)); g.addColorStop(1, hexA(col, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
}
function dots(c, n, seed, fn){ for(let i = 0; i < n; i++) fn(i, R(seed + i), R(seed + i + 101), R(seed + i + 202), R(seed + i + 303)); }

/* ---------------- preset backgrounds ---------------- */
const BG = {
  sea: { name:'Calm seaside', sw:'#0b6e7c', ink:'#f3fbff', acc:'#7fe0d0', draw(c,W,H,t,lv,u){ fill(c,W,H,['#06283d','#0b6e7c']); blobs(c,W,H,t,lv,u,['#1fb5b0','#3a7bd5','#7fe0d0'],.12,.15); } },
  dj: { name:'DJ lights', sw:'#7c3aed', ink:'#ffffff', acc:'#ff2e88', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#12041f','#3a0a4f']); blobs(c,W,H,t,lv,u,['#ff2e88','#7c3aed','#19d3ff'],.5,.6);
    c.save(); c.globalCompositeOperation = 'lighter';
    for(let i = 0; i < 4; i++){ const a = t * (.4 + i * .13) + i * 1.6, x = W * (i + .5) / 4, col = ['#ff2e88','#19d3ff','#a66bff','#ffe14d'][i];
      c.save(); c.translate(x, -H * .05); c.rotate(Math.sin(a) * .5);
      const g = c.createLinearGradient(0, 0, 0, H * 1.1); g.addColorStop(0, hexA(col, .53)); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g;
      c.beginPath(); c.moveTo(-u*.01,0); c.lineTo(u*.01,0); c.lineTo(u*(.16+lv*.08),H*1.1); c.lineTo(-u*(.16+lv*.08),H*1.1); c.fill(); c.restore(); }
    c.restore(); } },
  gold: { name:'Marigold night', sw:'#ff8a1f', ink:'#fff7e6', acc:'#ffd166', draw(c,W,H,t,lv,u){ fill(c,W,H,['#120a02','#4a2206']); blobs(c,W,H,t,lv,u,['#ffb020','#ff6a3d','#ffd98a'],.25,.35); } },
  petals: { name:'Festival petals', sw:'#e8590c', ink:'#fff8ec', acc:'#ffd43b', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#5c0a14','#b3261e','#e8590c']);
    dots(c, 46, 0, (i, a, b, d, e) => { const y = ((b + t * (.05 + a * .08)) % 1.15 - .08) * H, x = d * W + Math.sin(t * .8 + i) * u * .05, s = u * (.012 + e * .018) * (1 + lv * .3);
      c.save(); c.translate(x, y); c.rotate(t * (a - .5) * 3 + i); c.fillStyle = e > .5 ? '#ffb703' : '#fb8500'; c.globalAlpha = .85;
      c.beginPath(); c.ellipse(0, 0, s, s * .55, 0, 0, TAU); c.fill(); c.restore(); }); c.globalAlpha = 1; } },
  aurora: { name:'Northern lights', sw:'#2bd9a5', ink:'#f0fff9', acc:'#7dffcf', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#020617','#071b33','#0b2a3a']);
    c.save(); c.globalCompositeOperation = 'lighter';
    ['#2bd9a5','#7c5cff','#18c8ff'].forEach((col, k) => {
      c.beginPath(); const base = H * (.28 + k * .12), amp = H * (.06 + lv * .05);
      c.moveTo(0, H); for(let x = 0; x <= W; x += W / 40) c.lineTo(x, base + Math.sin(x / W * 5 + t * (.35 + k * .1) + k) * amp + Math.sin(x / W * 11 - t * .5) * amp * .4);
      c.lineTo(W, H); c.closePath();
      const g = c.createLinearGradient(0, base - amp, 0, base + H * .35); g.addColorStop(0, hexA(col, 0)); g.addColorStop(.15, hexA(col, .4)); g.addColorStop(1, hexA(col, 0));
      c.fillStyle = g; c.fill(); });
    c.restore(); twinkle(c, W, H * .45, t, 70, 1); } },
  neon: { name:'Neon highway', sw:'#ff3cac', ink:'#ffffff', acc:'#ff3cac', draw(c,W,H,t,lv,u){
    const hz = H * .58; c.fillStyle = lin(c,hz,['#0b0221','#3b0a57','#ff3cac']); c.fillRect(0,0,W,hz);
    const sr = u * (.22 + lv * .03), sx = W / 2, sy = hz - sr * .35;
    c.save(); c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.clip();
    const sg = c.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, '#ffe66d'); sg.addColorStop(1, '#ff3cac'); c.fillStyle = sg; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    c.fillStyle = '#3b0a57'; for(let k = 0; k < 7; k++){ const yy = sy + sr * (.1 + k * .14); c.fillRect(sx - sr, yy, sr * 2, sr * (.02 + k * .012)); }
    c.restore(); c.fillStyle = '#0b0221'; c.fillRect(0, hz, W, H - hz);
    c.strokeStyle = '#ff3cac'; c.lineWidth = Math.max(1, u * .003); c.globalAlpha = .8;
    for(let k = -12; k <= 12; k++){ c.beginPath(); c.moveTo(W / 2 + k * W * .02, hz); c.lineTo(W / 2 + k * W * .22, H); c.stroke(); }
    const off = (t * (.6 + lv)) % 1;
    for(let k = 0; k < 14; k++){ const z = (k + off) / 14, y = hz + (H - hz) * z * z; c.globalAlpha = z; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.globalAlpha = 1; } },
  stars: { name:'Into space', sw:'#4c6ef5', ink:'#ffffff', acc:'#91a7ff', draw(c,W,H,t,lv,u){
    c.fillStyle = '#03030c'; c.fillRect(0,0,W,H); blobs(c,W,H,t,lv,u,['#3b2a8a','#13315c'],.05,.1);
    warp(c, W, H, t, .08 + lv * .25, 160, '#ffffff'); } },
  galaxy: { name:'Galaxy spiral', sw:'#9775fa', ink:'#ffffff', acc:'#e599f7', draw(c,W,H,t,lv,u){
    c.fillStyle = '#05030f'; c.fillRect(0,0,W,H); const cx = W / 2, cy = H / 2;
    c.save(); c.globalCompositeOperation = 'lighter';
    dots(c, 420, 7, (i, a, b, d) => { const arm = i % 3, r = Math.pow(a, .7) * u * .62, ang = arm * TAU / 3 + r / (u * .12) + t * .12 + (b - .5) * .5;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * .62; c.fillStyle = d > .7 ? '#e599f7' : d > .4 ? '#91a7ff' : '#ffffff';
      c.globalAlpha = .25 + .75 * (1 - a); const s = 1 + (1 - a) * 2.4 * (1 + lv); c.fillRect(x, y, s, s); });
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, u * .18); g.addColorStop(0, 'rgba(255,240,255,.9)'); g.addColorStop(1, 'rgba(160,100,255,0)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0,0,W,H);
    c.restore(); } },
  rain: { name:'Midnight rain', sw:'#1c7ed6', ink:'#eaf6ff', acc:'#74c0fc', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#020c1b','#0b2545','#13315c']); blobs(c,W,H,t,lv,u,['#1c7ed6','#5f3dc4'],.06,.1); rainFx(c, W, H, t, u, 120, '#a5d8ff');
    if(lv > .78){ c.globalAlpha = (lv - .78) * 1.2; c.fillStyle = '#dbe4ff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; } } },
  sunset: { name:'Sunset beach', sw:'#ff922b', ink:'#fff9f0', acc:'#ffe066', draw(c,W,H,t,lv,u){
    const hz = H * .62; c.fillStyle = lin(c,hz,['#3b1f5c','#c2255c','#ff922b','#ffd43b']); c.fillRect(0,0,W,hz);
    const sr = u * (.16 + lv * .02); const g = c.createRadialGradient(W/2, hz, 0, W/2, hz, sr * 3); g.addColorStop(0, '#fff3bf'); g.addColorStop(.3, 'rgba(255,212,59,.66)'); g.addColorStop(1, 'rgba(255,212,59,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, hz); c.fillStyle = '#fff3bf'; c.beginPath(); c.arc(W/2, hz, sr, Math.PI, 0); c.fill();
    c.fillStyle = lin(c,H,['#1d3557','#0b132b']); c.fillRect(0, hz, W, H - hz);
    for(let k = 0; k < 26; k++){ const y = hz + (H - hz) * (k / 26) ** 1.4, w = W * (.08 + .5 * (1 - k / 26)) * (.6 + .4 * Math.sin(t * 1.5 + k));
      c.globalAlpha = .5 * (1 - k / 26); c.fillStyle = '#ffd8a8'; c.fillRect(W / 2 - w / 2 + Math.sin(t + k) * u * .02, y, w, Math.max(1, u * .004)); }
    c.globalAlpha = 1; } },
  city: { name:'City at night', sw:'#364fc7', ink:'#ffffff', acc:'#ffd43b', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#0b0f2b','#1b2059','#3b2f78']); twinkle(c, W, H * .5, t, 60, 3);
    for(let layer = 0; layer < 3; layer++){ const base = H * (.62 + layer * .12), col = ['#1d2252','#141838','#0a0c1f'][layer], sc = 1 + layer * .4;
      let x = 0, i = 0;
      while(x < W){ const bw = u * (.06 + R(layer * 50 + i) * .1) * sc, bh = H * (.12 + R(layer * 50 + i + 7) * .3) * (1 - layer * .2);
        c.fillStyle = col; c.fillRect(x, base - bh, bw, H); c.fillStyle = 'rgba(255,214,102,.75)';
        for(let wy = base - bh + u * .02; wy < base - u * .02; wy += u * .03) for(let wx = x + u * .012; wx < x + bw - u * .015; wx += u * .022)
          if(R(wx * .13 + wy * .7 + layer) > .62 + .2 * Math.sin(t * .3 + wx)) c.fillRect(wx, wy, u * .008, u * .012);
        x += bw + u * .006; i++; } } } },
  fire: { name:'Fire', sw:'#f76707', ink:'#fffaf0', acc:'#ffd43b', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#0d0300','#2b0800','#5c1500']); c.save(); c.globalCompositeOperation = 'lighter';
    dots(c, 70, 11, (i, a, b, d, e) => { const life = (b + t * (.25 + a * .35)) % 1, x = d * W + Math.sin(t * 2 + i) * u * .04 * life, y = H * (1.05 - life * (.75 + lv * .2)), r = u * (.08 + e * .12) * (1 - life) + 1;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,${Math.round(180 - life * 120)},40,${.55 * (1 - life)})`); g.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); });
    c.restore(); embers(c, W, H, t, u, 40, '#ffb347', 1); } },
  hearts: { name:'Love hearts', sw:'#f06595', ink:'#ffffff', acc:'#ffdeeb', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#4a0d2b','#a61e4d','#f06595']); blobs(c,W,H,t,lv,u,['#ff8787','#e64980'],.1,.2,.4); heartsFx(c, W, H, t, u, 30, ['#ffdeeb','#ff8fab','#ffffff'], 1 + lv); } },
  snow: { name:'Snowfall', sw:'#a5d8ff', ink:'#ffffff', acc:'#d0ebff', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#0b1d36','#1c3d63','#4a6d8c']); blobs(c,W,H,t,lv,u,['#4dabf7','#e7f5ff'],.04,.1,.25); snowFx(c, W, H, t, u, 140, 1); } },
  matrix: { name:'Code rain', sw:'#37b24d', ink:'#d3f9d8', acc:'#69db7c', draw(c,W,H,t,lv,u){
    c.fillStyle = '#010802'; c.fillRect(0,0,W,H); const fs = Math.max(12, u * .028), cols = Math.ceil(W / fs), glyphs = 'అఆఇఈఉఊకఖగఘచజటడతదనపబమయరలవశసహअआइईकखगघचजटडतदनपबमयरलवसह01';
    c.font = `${fs}px monospace`; c.textBaseline = 'top';
    for(let i = 0; i < cols; i++){ const sp = .25 + R(i) * .5, head = ((R(i + 5) + t * sp) % 1.4) * H / fs;
      for(let k = 0; k < 22; k++){ const row = Math.floor(head) - k; if(row < 0) continue; const y = row * fs; if(y > H) continue;
        c.fillStyle = k === 0 ? '#e6ffe9' : `rgba(64,192,87,${(1 - k / 22) * .9})`;
        c.fillText(glyphs[Math.floor(R(i * 31 + row + (k === 0 ? Math.floor(t * 8) : 0)) * glyphs.length)], i * fs, y); } } } },
  rangoli: { name:'Rangoli', sw:'#d6336c', ink:'#ffffff', acc:'#fcc419', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#1a0b2e','#3b0f3f']); const cx = W / 2, cy = H / 2, cols = ['#fcc419','#f76707','#d6336c','#7048e8','#12b886'];
    c.save(); c.translate(cx, cy); c.rotate(t * .08);
    for(let ring = 6; ring >= 1; ring--){ const n = 6 + ring * 2, r = u * ring * .075 * (1 + lv * .05); c.fillStyle = cols[ring % cols.length];
      for(let k = 0; k < n; k++){ c.save(); c.rotate(k * TAU / n + (ring % 2 ? t * .1 : -t * .1)); c.beginPath(); c.ellipse(r, 0, u * .05, u * .02, 0, 0, TAU); c.globalAlpha = .85; c.fill(); c.restore(); } }
    c.globalAlpha = 1; c.fillStyle = '#fff3bf'; c.beginPath(); c.arc(0, 0, u * .04, 0, TAU); c.fill(); c.restore();
    c.fillStyle = 'rgba(10,0,20,.35)'; c.fillRect(0,0,W,H); } },
  diyas: { name:'Diya lamps', sw:'#fab005', ink:'#fff9db', acc:'#ffd43b', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#080306','#1f0b0b','#3d1508']); c.save(); c.globalCompositeOperation = 'lighter';
    dots(c, 26, 21, (i, a, b, d) => { const x = a * W, y = H * (.35 + b * .6), s = u * (.02 + d * .03) * (1 + .15 * Math.sin(t * 9 + i)) * (1 + lv * .2);
      const g = c.createRadialGradient(x, y, 0, x, y, s * 6); g.addColorStop(0, 'rgba(255,200,80,.5)'); g.addColorStop(1, 'rgba(255,120,0,0)'); c.fillStyle = g; c.fillRect(x - s * 6, y - s * 6, s * 12, s * 12);
      c.fillStyle = '#ffe8a3'; c.beginPath(); c.ellipse(x, y - s * .6, s * .35, s * .8, 0, 0, TAU); c.fill(); });
    c.restore(); } },
  disco: { name:'Disco ball', sw:'#e64980', ink:'#ffffff', acc:'#74c0fc', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#0d0221','#240046']); const cx = W / 2, cy = H * .22, r = u * .14;
    c.save(); c.globalCompositeOperation = 'lighter';
    dots(c, 60, 31, (i, a, b) => { const ang = a * TAU + t * .5, d = u * (.3 + b * .8), x = cx + Math.cos(ang) * d, y = cy + Math.abs(Math.sin(ang)) * d * 1.3 + u * .1;
      c.fillStyle = ['#ff6b6b','#74c0fc','#ffd43b','#e599f7'][i % 4]; c.globalAlpha = Math.min(1, .35 + .65 * Math.abs(Math.sin(t * 3 + i)) * (.6 + lv)); c.beginPath(); c.arc(x, y, u * .012, 0, TAU); c.fill(); });
    c.restore(); c.globalAlpha = 1;
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip(); c.fillStyle = '#adb5bd'; c.fillRect(cx - r, cy - r, r * 2, r * 2);
    for(let y = -r; y < r; y += r * .16) for(let x = -r; x < r; x += r * .16){ c.fillStyle = `hsl(220,10%,${Math.round(40 + 50 * R(x * 3 + y + Math.floor(t * 6)))}%)`; c.fillRect(cx + x, cy + y, r * .15, r * .15); }
    c.restore(); c.strokeStyle = '#868e96'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, cy - r); c.stroke(); } },
  lava: { name:'Lava lamp', sw:'#ff6b6b', ink:'#ffffff', acc:'#ffe066', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#2b0a3d','#5f0f40']);
    dots(c, 9, 41, (i, a, b, d) => { const y = H * (.5 + .5 * Math.sin(t * (.15 + a * .2) + i)), x = W * (.2 + b * .6) + Math.sin(t * .3 + i) * u * .05, r = u * (.12 + d * .14) * (1 + lv * .1);
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, i % 2 ? '#ff8787' : '#ffd43b'); g.addColorStop(.6, i % 2 ? 'rgba(255,107,107,.8)' : 'rgba(255,169,77,.8)'); g.addColorStop(1, 'rgba(255,107,107,0)'); c.fillStyle = g; c.fillRect(0,0,W,H); }); } },
  holi: { name:'Holi colors', sw:'#ae3ec9', ink:'#ffffff', acc:'#ffe066', draw(c,W,H,t,lv,u){
    c.fillStyle = '#1b1021'; c.fillRect(0,0,W,H); const cols = ['#f03e3e','#fcc419','#40c057','#228be6','#ae3ec9','#f76707','#e64980'];
    dots(c, 14, 51, (i, a, b, d, e) => { const cyc = 5 + a * 4, ph = ((t + e * cyc) % cyc) / cyc, x = b * W, y = d * H, r = u * (.1 + ph * .5);
      const g = c.createRadialGradient(x, y, 0, x, y, r); const col = cols[i % cols.length]; g.addColorStop(0, hexA(col, .6 * (1 - ph))); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g; c.fillRect(0,0,W,H); });
    dots(c, 80, 61, (i, a, b, d) => { const x = a * W + Math.sin(t + i) * u * .03, y = ((b * H - t * 10 * (1 + d * 3)) % H + H) % H; c.fillStyle = cols[i % cols.length]; c.globalAlpha = .6; c.fillRect(x, y, 3, 3); }); c.globalAlpha = 1; } },
  dunes: { name:'Desert dunes', sw:'#e8a33d', ink:'#ffffff', acc:'#fff3bf', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#ff9f68','#ffcf8b','#ffe3b3']); c.fillStyle = 'rgba(255,255,230,.9)'; c.beginPath(); c.arc(W * .75, H * .25, u * .08, 0, TAU); c.fill();
    ['#e8a33d','#d4862b','#b8691f','#8c4a14'].forEach((col, k) => { c.fillStyle = col; c.beginPath(); const base = H * (.55 + k * .12);
      c.moveTo(0, H); for(let x = 0; x <= W; x += W / 30) c.lineTo(x, base + Math.sin(x / W * (2 + k) + k + t * .03 * (k + 1)) * H * .05); c.lineTo(W, H); c.fill(); }); } },
  eq: { name:'Equalizer', sw:'#40c057', ink:'#ffffff', acc:'#69db7c', draw(c,W,H,t,lv,u,spec){
    fill(c,W,H,['#06140b','#0b2b19']); blobs(c,W,H,t,lv,u,['#2b8a3e','#1971c2'],.08,.2); eqBars(c, W, H, t, u, spec, ['#69db7c','#38d9a9','#4dabf7'], H * .9, .38); } },
  vinyl: { name:'Spinning record', sw:'#c92a2a', ink:'#fff5f5', acc:'#ff8787', draw(c,W,H,t,lv,u){
    fill(c,W,H,['#1a0b0b','#2d1212']); blobs(c,W,H,t,lv,u,['#c92a2a','#862e9c'],.07,.15);
    const r = u * .46 * (1 + lv * .02), cx = W / 2, cy = H / 2; c.save(); c.translate(cx, cy); c.rotate(t * 3.3);
    c.fillStyle = '#0c0c0c'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 1; for(let k = 1; k < 26; k++){ c.beginPath(); c.arc(0, 0, r * (.36 + k * .024), 0, TAU); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.09)'; c.beginPath(); c.moveTo(0,0); c.arc(0, 0, r, -.3, .15); c.fill();
    c.fillStyle = '#c92a2a'; c.beginPath(); c.arc(0, 0, r * .3, 0, TAU); c.fill(); c.fillStyle = '#ffd8a8'; c.fillRect(-r * .2, -r * .02, r * .4, r * .04);
    c.fillStyle = '#111'; c.beginPath(); c.arc(0, 0, r * .03, 0, TAU); c.fill(); c.restore();
    c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, W, H); } },
  smoke: { name:'Smoke', sw:'#868e96', ink:'#ffffff', acc:'#dee2e6', draw(c,W,H,t,lv,u){ c.fillStyle = '#050505'; c.fillRect(0,0,W,H); fogFx(c, W, H, t, u, 9, 'rgba(180,180,190,', .16 * (1 + lv * .5)); } },
  paper: { name:'Clean paper', sw:'#f1e9da', ink:'#1d1a16', acc:'#d9480f', light:true, draw(c,W,H,t,lv,u){
    c.fillStyle = '#f4efe6'; c.fillRect(0,0,W,H); blobs(c,W,H,t,lv,u,['#ffd8a8','#c5f6fa','#ffdeeb'],.1,.1,.8); } },
  gen: { name:'Generated', sw:'conic-gradient(#f03e3e,#fcc419,#40c057,#228be6,#ae3ec9,#f03e3e)', ink:'#ffffff', acc:'#ffd166', draw(c,W,H,t,lv,u,spec,L){ genDraw(c,W,H,t,lv,u,spec,L.gen || GEN_DEFAULT); } },
  photo: { name:'My photo', sw:'#adb5bd', ink:'#ffffff', acc:'#ffd166', draw(c,W,H,t,lv,u,spec,L){ mediaDraw(c,W,H,t,lv, L.photo, L.fx.blur && L.photoBlur ? L.photoBlur : null); } },
  ai: { name:'AI background', sw:'linear-gradient(135deg,#7048e8,#e64980)', ink:'#ffffff', acc:'#ffd166', draw(c,W,H,t,lv,u,spec,L){ mediaDraw(c,W,H,t,lv, L.aiImg, L.fx.blur && L.aiBlur ? L.aiBlur : null); } },
  video: { name:'My video clip', sw:'#495057', ink:'#ffffff', acc:'#ffd166', draw(c,W,H,t,lv,u,spec,L){ mediaDraw(c,W,H,t,lv, L.videoEl && L.videoEl.readyState >= 2 ? L.videoEl : null, null, true); } }
};
function mediaDraw(c, W, H, t, lv, img, blurImg, isVideo){
  c.fillStyle = '#111'; c.fillRect(0,0,W,H); if(!img) return;
  const iw = img.videoWidth || img.width, ih = img.videoHeight || img.height; if(!iw || !ih) return;
  const src = blurImg || img;
  const z = (isVideo ? 1.02 : 1.08 + .06 * Math.sin(t * .05)) + lv * .015, s = Math.max(W / iw, H / ih) * z;
  const dw = iw * s, dh = ih * s, dx = (W - dw) / 2 + (isVideo ? 0 : Math.sin(t * .04) * W * .02), dy = (H - dh) / 2 + (isVideo ? 0 : Math.cos(t * .05) * H * .02);
  c.drawImage(src, dx, dy, dw, dh); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, W, H);
}

/* ---------------- generated backgrounds (endless) ---------------- */
const GEN_KINDS = { blobs:'Soft blobs', waves:'Waves', rays:'Light rays', rings:'Rings', stripes:'Stripes', mesh:'Mesh glow', shapes:'Floating shapes', bubbles:'Bubbles', grid:'Grid', spiral:'Spiral', zigzag:'Zigzag', tiles:'Tiles' };
const GEN_DEFAULT = { seed: 7, kind:'mesh', bg1:'#140f2e', bg2:'#311a5c', cols:['#ff5a6e','#8f6bff','#20c997','#ffd43b'] };
function randomGen(seed){
  seed = seed == null ? Math.floor(Math.random() * 1e6) : seed;
  const r = k => R(seed * 1.37 + k), kinds = Object.keys(GEN_KINDS), hue = r(1) * 360, scheme = Math.floor(r(2) * 4);
  const off = [[0, 30, 60, 90], [0, 180, 30, 210], [0, 120, 240, 60], [0, 15, 330, 345]][scheme];
  const dark = r(3) < .82;
  return { seed, kind: kinds[Math.floor(r(4) * kinds.length)],
    bg1: dark ? hsl(hue + 200, 35 + r(5) * 30, 5 + r(6) * 8) : hsl(hue + 200, 30, 92), bg2: dark ? hsl(hue + 230, 45 + r(7) * 30, 14 + r(8) * 14) : hsl(hue + 230, 40, 82),
    cols: off.map((o, i) => hsl(hue + o, 70 + r(9 + i) * 25, dark ? 55 + r(13 + i) * 15 : 45 + r(13 + i) * 10)), light: !dark };
}
function genDraw(c, W, H, t, lv, u, spec, g){
  const k = g.kind, cols = g.cols, s = g.seed || 0;
  fill(c, W, H, [g.bg1, g.bg2]);
  if(k === 'blobs') blobs(c, W, H, t, lv, u, cols, .1 + R(s) * .3, .3);
  else if(k === 'mesh'){ cols.forEach((col, i) => { const x = W * (.5 + .45 * Math.sin(t * .09 + i * 1.9 + s)), y = H * (.5 + .45 * Math.cos(t * .07 + i * 2.6 + s)), r = u * .7 * (1 + lv * .2);
      const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(col, .75)); gr.addColorStop(1, hexA(col, 0)); c.fillStyle = gr; c.fillRect(0,0,W,H); }); }
  else if(k === 'waves'){ cols.forEach((col, i) => { c.beginPath(); const base = H * (.35 + i * .14), amp = H * (.05 + lv * .04), f = 2 + R(s + i) * 3;
      c.moveTo(0, H); for(let x = 0; x <= W; x += W / 50) c.lineTo(x, base + Math.sin(x / W * f * TAU / 2 + t * (.5 + i * .2) + i) * amp); c.lineTo(W, H); c.fillStyle = hexA(col, .55); c.fill(); }); }
  else if(k === 'rays'){ c.save(); c.translate(W / 2, H * (R(s) < .5 ? -.05 : .5)); c.rotate(t * .05); c.globalCompositeOperation = 'lighter';
      for(let i = 0; i < 18; i++){ c.rotate(TAU / 18); c.fillStyle = hexA(cols[i % cols.length], .14 + lv * .1); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.max(W, H) * 1.5, -u * .08); c.lineTo(Math.max(W, H) * 1.5, u * .08); c.fill(); } c.restore(); }
  else if(k === 'rings'){ c.lineWidth = u * .012; const M = Math.max(W, H) * .8; for(let i = 0; i < 16; i++){ const r = ((i / 16 + t * .05) % 1) * M; c.strokeStyle = hexA(cols[i % cols.length], Math.min(1, .6 * (1 - r / M) * (1 + lv * .5)));
      c.beginPath(); c.arc(W / 2, H / 2, r, 0, TAU); c.stroke(); } }
  else if(k === 'stripes'){ c.save(); c.translate(W / 2, H / 2); c.rotate(-.5 + R(s)); const bw = u * .08, M = Math.max(W, H), off = (t * u * .05) % (bw * cols.length);
      for(let x = -M * 1.2 - off, j = 0; x < M * 1.2; x += bw, j++){ c.fillStyle = hexA(cols[j % cols.length], .35); c.fillRect(x, -M, bw * .6, M * 2); } c.restore(); }
  else if(k === 'shapes'){ dots(c, 26, s, (i, a, b, d, e) => { const x = (((a + t * .01 * (d - .5)) % 1) + 1) % 1 * W, y = ((b * H - t * u * .03 * (.3 + d)) % H + H) % H, sz = u * (.03 + e * .08) * (1 + lv * .2);
      c.save(); c.translate(x, y); c.rotate(t * (d - .5) + i); c.fillStyle = hexA(cols[i % cols.length], .55); c.beginPath(); const n = 3 + (i % 4);
      for(let q = 0; q < n; q++) c.lineTo(Math.cos(q * TAU / n) * sz, Math.sin(q * TAU / n) * sz); c.closePath(); c.fill(); c.restore(); }); }
  else if(k === 'bubbles'){ dots(c, 40, s, (i, a, b, d) => { const y = H - ((b + t * (.03 + d * .05)) % 1.1) * H * 1.1, x = a * W + Math.sin(t + i) * u * .03, r = u * (.015 + d * .05) * (1 + lv * .3);
      c.strokeStyle = hexA(cols[i % cols.length], .7); c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.fillStyle = hexA(cols[i % cols.length], .12); c.fill(); }); }
  else if(k === 'grid'){ const sz = u * .08, off = (t * u * .03) % sz; c.lineWidth = 1.5;
      for(let x = -off; x < W; x += sz){ c.strokeStyle = hexA(cols[0], Math.min(1, .25 + lv * .3)); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for(let y = -off; y < H; y += sz){ c.strokeStyle = hexA(cols[1], Math.min(1, .25 + lv * .3)); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      blobs(c, W, H, t, lv, u, cols.slice(2), .1, .2, .35); }
  else if(k === 'spiral'){ c.save(); c.translate(W / 2, H / 2); c.globalCompositeOperation = 'lighter';
      for(let i = 0; i < 300; i++){ const a = i * .25 + t * .4, r = i * u * .0022 * (1 + lv * .2); c.fillStyle = hexA(cols[i % cols.length], .7); c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, u * .006 + i * u * .00004, 0, TAU); c.fill(); } c.restore(); }
  else if(k === 'zigzag'){ c.lineWidth = u * .015; const step = u * .08; cols.forEach((col, i) => { c.strokeStyle = hexA(col, .5); c.beginPath(); const base = H * (.2 + i * .2), amp = u * .05 * (1 + lv), sh = (t * u * .05) % (step * 2);
      for(let x = -step * 2, j = 0; x <= W + step * 2; x += step, j++){ c.lineTo(x + sh, base + (j % 2 ? amp : -amp)); } c.stroke(); }); }
  else if(k === 'tiles'){ const n = 8, tw = W / n, th = tw; for(let y = 0; y < H; y += th) for(let x = 0; x < W; x += tw){ const v = Math.sin(t * .8 + x * .01 + y * .013 + s) * .5 + .5;
      c.fillStyle = hexA(cols[Math.floor(R(x + y * 3 + s) * cols.length)], Math.min(1, .12 + v * .35 * (1 + lv * .5))); c.fillRect(x + 2, y + 2, tw - 4, th - 4); } }
}

/* ---------------- shared particle helpers ---------------- */
function twinkle(c, W, H, t, n, seed){ for(let i = 0; i < n; i++){ c.globalAlpha = .3 + .7 * Math.abs(Math.sin(t * (1 + R(i + seed)) + i)); c.fillStyle = '#fff'; c.fillRect(R(i + seed) * W, R(i + seed + 1) * H, 2, 2); } c.globalAlpha = 1; }
function warp(c, W, H, t, sp, n, col){ const cx = W / 2, cy = H / 2; for(let i = 0; i < n; i++){ const a = R(i) * TAU, z = (R(i + 2) + t * sp * (.5 + R(i + 4))) % 1, d = z * z * Math.max(W, H) * .8;
  c.globalAlpha = z; c.fillStyle = col; const s = .6 + z * 3; c.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, s); } c.globalAlpha = 1; }
function rainFx(c, W, H, t, u, n, col){ c.strokeStyle = col; c.lineWidth = Math.max(1, u * .0018);
  for(let i = 0; i < n; i++){ const y = ((R(i + 1) + t * (.9 + R(i) * .9)) % 1.1 - .05) * H, x = R(i + 2) * W, l = u * (.03 + R(i + 3) * .04);
    c.globalAlpha = .25 + R(i + 4) * .45; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * .18, y + l); c.stroke(); } c.globalAlpha = 1; }
function snowFx(c, W, H, t, u, n, k){ c.fillStyle = '#fff'; for(let i = 0; i < n; i++){ const y = ((R(i + 7) + t * (.04 + R(i) * .06)) % 1.05) * H, x = (R(i + 8) * W + Math.sin(t * .7 + i) * u * .03), s = u * (.002 + R(i + 9) * .006) * k;
  c.globalAlpha = .5 + R(i + 10) * .5; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); } c.globalAlpha = 1; }
function embers(c, W, H, t, u, n, col, k){ c.save(); c.globalCompositeOperation = 'lighter'; for(let i = 0; i < n; i++){ const life = (R(i + 3) + t * (.12 + R(i) * .15)) % 1, x = R(i + 4) * W + Math.sin(t * 2 + i) * u * .05, y = H * (1 - life * 1.1);
  c.globalAlpha = (1 - life) * .9; c.fillStyle = col; c.beginPath(); c.arc(x, y, u * .004 * k * (1 + R(i + 5)), 0, TAU); c.fill(); } c.restore(); }
function heartShape(c, x, y, s){ c.beginPath(); c.moveTo(x, y + s * .3); c.bezierCurveTo(x, y, x - s * .5, y, x - s * .5, y + s * .3); c.bezierCurveTo(x - s * .5, y + s * .6, x, y + s * .8, x, y + s); c.bezierCurveTo(x, y + s * .8, x + s * .5, y + s * .6, x + s * .5, y + s * .3); c.bezierCurveTo(x + s * .5, y, x, y, x, y + s * .3); c.fill(); }
function heartsFx(c, W, H, t, u, n, cols, k){ for(let i = 0; i < n; i++){ const y = H - ((R(i + 1) + t * (.04 + R(i) * .05)) % 1.15) * H * 1.15, x = R(i + 2) * W + Math.sin(t + i) * u * .03, s = u * (.02 + R(i + 3) * .04) * k;
  c.globalAlpha = .55; c.fillStyle = cols[i % cols.length]; heartShape(c, x, y, s); } c.globalAlpha = 1; }
function fogFx(c, W, H, t, u, n, rgb, a){ for(let i = 0; i < n; i++){ const x = W * (.5 + .45 * Math.sin(t * .07 * (1 + R(i)) + i * 1.3)), y = H * (.5 + .45 * Math.cos(t * .05 * (1 + R(i + 1)) + i * 2.1)), r = u * (.3 + R(i + 2) * .35);
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgb + Math.min(1, a) + ')'); g.addColorStop(1, rgb + '0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); } }
function eqBars(c, W, H, t, u, spec, cols, base, hmax){ const n = 32, bw = W / (n * 1.4);
  for(let i = 0; i < n; i++){ const j = Math.abs(i - n / 2) | 0; const v = spec ? spec[Math.min(spec.length - 1, j * 2 + 1)] / 255 : (.3 + .3 * Math.sin(t * 3 + i));
    const h = H * .03 + v * H * hmax, x = (i + .2) * W / n; c.fillStyle = cols[i % cols.length]; c.globalAlpha = .9; c.fillRect(x, base - h, bw, h); c.globalAlpha = .25; c.fillRect(x, base + u * .01, bw, h * .3); } c.globalAlpha = 1; }

/* ---------------- shapes, fonts, text ---------------- */
const RATIOS = { '9:16':{name:'Vertical 9:16', note:'Reels, Shorts', w:720, h:1280}, '16:9':{name:'Wide 16:9', note:'YouTube', w:1280, h:720},
  '1:1':{name:'Square 1:1', w:1080, h:1080}, '4:5':{name:'Portrait 4:5', note:'Insta feed', w:864, h:1080}, '3:4':{name:'3:4', w:810, h:1080}, '4:3':{name:'4:3', w:1280, h:960},
  '2:3':{name:'2:3', note:'Pinterest', w:720, h:1080}, '1.91:1':{name:'1.91:1', note:'Facebook', w:1280, h:670}, '2:1':{name:'2:1', w:1440, h:720}, '21:9':{name:'Cinema 21:9', w:1680, h:720},
  custom:{name:'Custom size', w:1080, h:1350} };

const FONTS = {
  bold:    { name:'Bold',        fam:'"Hanken Grotesk","Noto Sans Telugu","Noto Sans Devanagari",sans-serif', w:800, k:1 },
  poster:  { name:'Tall poster', fam:'"Bebas Neue","Ramabhadra","Rozha One",sans-serif', w:400, k:1.3, upper:true },
  impact:  { name:'Impact',      fam:'"Anton","NTR","Teko",sans-serif', w:400, k:1.15, upper:true },
  elegant: { name:'Elegant',     fam:'"Playfair Display","Noto Serif Telugu","Noto Serif Devanagari",serif', w:700, k:1 },
  classic: { name:'Classic',     fam:'"Cinzel","Ramaraja","Martel",serif', w:700, k:.95 },
  hand:    { name:'Handwritten', fam:'"Caveat","Mallanna","Kalam",cursive', w:700, k:1.18 },
  marker:  { name:'Marker',      fam:'"Permanent Marker","Gidugu","Kalam",cursive', w:400, k:1 },
  script:  { name:'Script',      fam:'"Pacifico","Gurajada","Amita",cursive', w:400, k:.95 },
  retro:   { name:'Retro',       fam:'"Lobster","Suravaram","Yatra One",cursive', w:400, k:1.05 },
  chunky:  { name:'Chunky',      fam:'"Unbounded","Ramabhadra","Rozha One",sans-serif', w:800, k:.82 },
  round:   { name:'Rounded',     fam:'"Baloo 2","Baloo Tammudu 2",sans-serif', w:800, k:1.05 },
  neonf:   { name:'Neon sign',   fam:'"Righteous","Mandali","Baloo 2",sans-serif', w:400, k:1 },
  future:  { name:'Futuristic',  fam:'"Orbitron","Timmana","Khand",sans-serif', w:800, k:.85 },
  comic:   { name:'Comic',       fam:'"Bangers","Ponnala","Baloo 2",cursive', w:400, k:1.15 },
  fat:     { name:'Fat serif',   fam:'"Abril Fatface","Peddana","Eczar",serif', w:400, k:1 },
  blocky:  { name:'Blocky',      fam:'"Bungee","Dhurjati","Sura",sans-serif', w:400, k:.85 },
  sporty:  { name:'Sporty',      fam:'"Russo One","Sree Krushnadevaraya","Teko",sans-serif', w:400, k:.95 },
  pixel:   { name:'Pixel',       fam:'"Press Start 2P","Tenali Ramakrishna","Hind",monospace', w:400, k:.6 }
};
const ANIMS = { rise:'Fade up', pop:'Pop', words:'Word by word', karaoke:'Karaoke', type:'Typewriter', slide:'Slide in', slideup:'Slide up', zoom:'Zoom in', drop:'Drop', spin:'Spin in', bounce:'Bounce words', wave:'Wavy', flicker:'Flicker', stack:'One big word' };
const TSTYLES = { glow:'Soft shadow', outline:'Outline', box:'Highlight box', neon:'Neon glow', shadow3d:'3D shadow', gradient:'Gradient', plain:'Plain' };
const COLORS = { theme:['Match background',null], white:['White','#ffffff'], gold:['Gold','#ffd166'], pink:['Pink','#ff6fa8'], cyan:['Cyan','#6ff3ff'], lime:['Lime','#b2f2bb'], orange:['Orange','#ffa94d'], purple:['Purple','#d0bfff'], red:['Red','#ff6b6b'], black:['Black','#111111'], rainbow:['Rainbow','rainbow'], custom:['Pick any color','custom'] };
const ALIGNS = { center:'Center', left:'Left', right:'Right' };
const GRADES = { none:'No filter', bw:'Black & white', noir:'Noir', sepia:'Sepia', warm:'Warm', cool:'Cool', vivid:'Vivid', faded:'Faded', dream:'Dreamy pink', matrix:'Green tint', teal:'Teal & orange', night:'Night blue' };
const FX = { pulse:'Beat pulse', shake:'Camera shake', zoompulse:'Zoom on beat', sparkle:'Sparkles', confetti:'Confetti', snow:'Snow', rain:'Rain', hearts:'Hearts', bokeh:'Bokeh lights', embers:'Fire embers', stars:'Twinkling stars', shooting:'Shooting stars', fog:'Fog', lightleak:'Light leaks', flare:'Lens flare', spotlight:'Spotlight', strobe:'Strobe on beat', lightning:'Lightning', eqfx:'Equalizer bars', waveform:'Sound wave', circle:'Circle visualizer', rgb:'RGB split', glitch:'Glitch', vhs:'VHS tape', scanlines:'Scanlines', grain:'Film grain', vignette:'Strong vignette', bars:'Cinema bars', mirror:'Mirror', next:'Show next line', info:'Song title', blur:'Blur photo' };

const CHAR_MOVES = { dance:'Dance', bounce:'Bounce to beat', sway:'Sway', float:'Float', pulse:'Pulse', walk:'Side to side', jump:'Jump on beat', spin:'Turn around', still:'Still' };
const CHAR_POS = { center:'Center', left:'Left', right:'Right' };
const CHAR_CUT = { auto:'Remove plain background', off:'Keep its background' };
const CHAR_SRC = { video:'Dancing video', image:'Picture' };
/* Live background removal for a character video (green screen or any plain color). */
let keyCv = null, keyCache = { v:null, t:-1, mode:'', w:0 };
function keyedVideoFrame(v, mode){
  if(keyCache.v === v && keyCache.t === v.currentTime && keyCache.mode === mode && keyCv) return keyCv;
  const vw = v.videoWidth, vh = v.videoHeight; if(!vw || !vh) return null;
  const sc = Math.min(1, 720 / Math.max(vw, vh)), w = Math.max(1, Math.round(vw * sc)), h = Math.max(1, Math.round(vh * sc));
  if(!keyCv) keyCv = document.createElement('canvas'); if(keyCv.width !== w) keyCv.width = w; if(keyCv.height !== h) keyCv.height = h;
  const g = keyCv.getContext('2d', { willReadFrequently: true }); g.clearRect(0, 0, w, h); g.drawImage(v, 0, 0, w, h);
  if(mode !== 'off'){
    const im = g.getImageData(0, 0, w, h), d = im.data, p = Math.max(2, Math.round(Math.min(w, h) * .02));
    let r = 0, gg = 0, b = 0, n = 0;
    [[0,0],[w-p,0],[0,h-p],[w-p,h-p]].forEach(([x0,y0]) => { for(let y = y0; y < y0 + p; y++) for(let x = x0; x < x0 + p; x++){ const k = (y * w + x) * 4; r += d[k]; gg += d[k+1]; b += d[k+2]; n++; } });
    r /= n; gg /= n; b /= n;
    if(gg > r + 40 && gg > b + 40){
      for(let k = 0; k < d.length; k += 4){ const m = Math.max(d[k], d[k+2]), ex = d[k+1] - m;
        if(ex > 55 && d[k+1] > 70) d[k+3] = 0; else if(ex > 20){ d[k+3] = Math.round(255 * (1 - (ex - 20) / 35)); d[k+1] = m; } else if(ex > 0) d[k+1] = m + ex * .5; }
    } else {
      const tol = 55, t2 = tol * tol, s2 = (tol * 1.6) * (tol * 1.6);
      for(let k = 0; k < d.length; k += 4){ const dr = d[k] - r, dg = d[k+1] - gg, db = d[k+2] - b, dd = dr * dr + dg * dg + db * db;
        if(dd < t2) d[k+3] = 0; else if(dd < s2) d[k+3] = Math.round(255 * (Math.sqrt(dd) - tol) / (tol * .6)); }
    }
    g.putImageData(im, 0, 0);
  }
  keyCache = { v, t: v.currentTime, mode };
  return keyCv;
}
function drawChar(c, W, H, t, lv, u, L){
  if(!L.charOn) return;
  const useVid = L.charSrc === 'video' && L.charVid && L.charVid.readyState >= 2;
  const img = useVid ? keyedVideoFrame(L.charVid, L.charCut || 'auto') : L.charImg; if(!img) return;
  const iw = img.width, ih = img.height; if(!iw || !ih) return;
  if(L._ct != null) t = L._ct;
  let s = H * (L.charSize || .6) / ih; if(iw * s > W * .95) s = W * .95 / iw;
  const dw = iw * s, dh = ih * s, x0 = L.charPos === 'left' ? Math.max(dw / 2, W * .28) : L.charPos === 'right' ? Math.min(W - dw / 2, W * .72) : W / 2;
  let rot = 0, sx = 1, sy = 1, dx = 0, dy = 0; const m = L.charMove || 'dance', beat = Math.abs(Math.sin(t * 3.2));
  if(m === 'dance'){ rot = Math.sin(t * 3.2) * .07; dy = -beat * u * .035 - lv * u * .03; sx = sy = 1 + lv * .04; }
  else if(m === 'bounce'){ dy = -lv * u * .08 - Math.abs(Math.sin(t * 2.5)) * u * .01; sy = 1 + lv * .04; sx = 1 - lv * .02; }
  else if(m === 'sway'){ rot = Math.sin(t * 1.4) * .06; }
  else if(m === 'float'){ dy = Math.sin(t * .9) * u * .025 - u * .02; rot = Math.sin(t * .7) * .02; }
  else if(m === 'pulse'){ sx = sy = 1 + lv * .1; }
  else if(m === 'walk'){ dx = Math.sin(t * .5) * (W - dw) * .35; rot = Math.sin(t * 4) * .03; dy = -Math.abs(Math.sin(t * 4)) * u * .015; }
  else if(m === 'jump'){ const j = Math.max(0, lv - .45) * 2; dy = -j * u * .14; sy = 1 - Math.max(0, .5 - lv) * .06; }
  else if(m === 'spin'){ sx = Math.cos(t * 1.2); if(Math.abs(sx) < .08) sx = sx < 0 ? -.08 : .08; }
  c.save(); c.translate(x0 + dx, H + dy); c.rotate(rot);
  c.globalAlpha = .35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(0, -u * .005 - dy, dw * .32, u * .018, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
  c.scale(sx, sy);
  if(L.charGlow !== false){ c.shadowColor = L._acc || '#ffffff'; c.shadowBlur = u * (.03 + lv * .05); }
  c.drawImage(img, -dw / 2, -dh, dw, dh);
  c.restore();
}

function defaults(){ return { charSrc:'image', charOn:false, charMove:'dance', charPos:'center', charSize:.6, charCut:'auto', charGlow:true, bg:'sea', ratio:'9:16', cw:1080, ch:1350, font:'bold', anim:'rise', tstyle:'glow', color:'theme', ink:'#ffffff', acc:'', align:'center', grade:'none',
  tsize:1, ty:.5, speed:1, fxAmt:1, gen: randomGen(7), fx:{ pulse:true, next:true, info:true, blur:true } }; }

let grainCv = null;
function grain(c, W, H, t, a){
  if(!grainCv){ grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = 192; const g = grainCv.getContext('2d'), d = g.createImageData(192, 192);
    for(let i = 0; i < d.data.length; i += 4){ const v = Math.random() * 255; d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 40; } g.putImageData(d, 0, 0); }
  const p = c.createPattern(grainCv, 'repeat'); const ox = (R(Math.floor(t * 24)) * 192) | 0, oy = (R(Math.floor(t * 24) + 1) * 192) | 0;
  c.save(); c.translate(-ox, -oy); c.fillStyle = p; c.globalAlpha = Math.min(1, .55 * a); c.fillRect(ox, oy, W, H); c.restore();
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
function isLight(hex){ if(!/^#?[0-9a-f]{6}$/i.test(String(hex))) return false; const h = hex.replace('#',''); const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16); return (r * 299 + g * 587 + b * 114) / 1000 > 150; }
const SEG = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity:'grapheme' }) : null;
const graphemes = w => SEG ? Array.from(SEG.segment(w), x => x.segment) : Array.from(w);

function paintWord(c, L, txt, x, y, size, col, alpha, ink, k){
  if(alpha <= .01 || !txt) return;
  const st = L.tstyle, amt = L.fxAmt || 1;
  if(col === 'rainbow') col = hsl((k || 0) * 47 + (L._t || 0) * 60, 90, 68);
  if(L.fx && L.fx.rgb){ c.globalAlpha = alpha * .7; const o = size * .04 * amt * (1 + (L._lv || 0) * 2); c.fillStyle = '#ff0040'; c.fillText(txt, x - o, y); c.fillStyle = '#00e5ff'; c.fillText(txt, x + o, y); }
  c.globalAlpha = alpha;
  if(st === 'outline'){ c.lineJoin = 'round'; c.lineWidth = size * .12; c.strokeStyle = isLight(col) ? '#000000' : '#ffffff'; c.strokeText(txt, x, y); c.fillStyle = col; c.fillText(txt, x, y); }
  else if(st === 'neon'){ c.shadowColor = col; c.shadowBlur = size * .55; c.fillStyle = col; c.fillText(txt, x, y); c.shadowBlur = size * .2; c.fillStyle = '#ffffff'; c.globalAlpha = alpha * .55; c.fillText(txt, x, y); c.shadowBlur = 0; }
  else if(st === 'shadow3d'){ const d = Math.max(2, size * .06); c.fillStyle = 'rgba(0,0,0,.65)'; for(let i = d; i > 0; i -= Math.max(1, d / 4)) c.fillText(txt, x + i, y + i); c.fillStyle = col; c.fillText(txt, x, y); }
  else if(st === 'gradient'){ const m = c.measureText(txt).width, g = c.createLinearGradient(x, y - size / 2, x + m, y + size / 2); g.addColorStop(0, col); g.addColorStop(1, L._acc || '#ff6fa8');
    c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = size * .25; c.fillStyle = g; c.fillText(txt, x, y); c.shadowBlur = 0; }
  else if(st === 'plain'){ c.fillStyle = col; c.fillText(txt, x, y); }
  else { c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = st === 'box' ? 0 : size * .35; c.fillStyle = col; c.fillText(txt, x, y); c.shadowBlur = 0; }
  c.globalAlpha = 1;
}

/* Draw one lyric line with the chosen animation. p = seconds since the line started, dur = how long it stays. */
function drawLine(c, L, text, cx, cy, size, maxW, p, dur, ink, acc, baseAlpha){
  const font = FONTS[L.font] || FONTS.bold; size *= font.k; if(font.upper) text = text.toUpperCase();
  if(L.anim === 'stack'){ const words = text.split(/\s+/).filter(Boolean), n = Math.max(1, words.length), wd = Math.max(.15, dur / n), wi = Math.min(n - 1, Math.floor(p / wd));
    text = words[wi] || ''; size *= 1.7; p = p - wi * wd; dur = wi === n - 1 ? dur - wi * wd : wd + .3; }
  const lay = layout(c, text, size, font, maxW), n = lay.rows.reduce((a, r) => a + r.words.length, 0) || 1;
  const outA = clamp((dur - p) / .3, 0, 1) * baseAlpha;
  let scale = 1, dx = 0, dy = 0, inA = 1, rot = 0;
  const A = L.anim;
  if(A === 'rise'){ inA = ease(p / .3); dy = (1 - ease(p / .4)) * size * .35; }
  else if(A === 'pop' || A === 'stack'){ inA = clamp(p / .12, 0, 1); scale = .55 + .45 * back(p / .35); }
  else if(A === 'slide'){ inA = ease(p / .3); dx = -(1 - ease(p / .45)) * maxW * .4; }
  else if(A === 'slideup'){ inA = ease(p / .3); dy = (1 - ease(p / .45)) * size * 2.5; }
  else if(A === 'zoom'){ inA = ease(p / .3); scale = 1 + (1 - ease(p / .5)) * .7; }
  else if(A === 'drop'){ inA = clamp(p / .1, 0, 1); dy = -(1 - back(p / .5)) * size * 3; }
  else if(A === 'spin'){ inA = ease(p / .3); rot = (1 - ease(p / .5)) * -.6; scale = .6 + .4 * ease(p / .5); }
  else if(A === 'flicker'){ inA = p < .5 ? (R(Math.floor(p * 30)) > .4 ? 1 : .15) : 1; }
  const totalH = lay.rows.length * lay.lh, top = cy - totalH / 2 + lay.lh / 2;
  const align = L.align || 'center', edge = (c.canvas.width - maxW) / 2;
  c.save(); c.translate(cx + dx, cy + dy); c.rotate(rot); c.scale(scale, scale); c.translate(-cx, -cy);
  c.font = `${font.w} ${size}px ${font.fam}`; c.textBaseline = 'middle'; c.textAlign = 'left';
  const rowX = r => align === 'left' ? edge : align === 'right' ? edge + maxW - r.width : cx - r.width / 2;
  if(L.tstyle === 'box'){
    c.globalAlpha = inA * outA * .9; c.fillStyle = acc;
    lay.rows.forEach((r, ri) => { const pad = size * .25; c.fillRect(rowX(r) - pad, top + ri * lay.lh - lay.lh / 2 + size * .08, r.width + pad * 2, lay.lh - size * .12); });
    c.globalAlpha = 1;
  }
  const boxInk = L.tstyle === 'box' ? (isLight(acc) ? '#111111' : '#ffffff') : ink;
  const wordDur = Math.max(.12, dur * .7 / n), chars = p * 22; let k = 0, charSeen = 0;
  lay.rows.forEach((r, ri) => {
    let x = rowX(r); const y = top + ri * lay.lh;
    r.words.forEach(wd => {
      let a = inA * outA, col = boxInk, txt = wd.w, wy = y;
      if(A === 'words'){ const q = (p - k * wordDur) / .22; a = ease(q) * outA; wy = y + (1 - ease(q)) * size * .3; }
      else if(A === 'bounce'){ const q = (p - k * wordDur) / .3; a = clamp(q * 3, 0, 1) * outA; wy = q < 1 ? y - (1 - back(q)) * size * .8 : y; }
      else if(A === 'wave'){ wy = y + Math.sin(p * 4 + k * .8) * size * .12; }
      else if(A === 'karaoke'){ a = outA * clamp(p / .2, 0, 1); const lit = p / Math.max(.4, dur * .85) * n; col = k < lit ? acc : boxInk; if(k >= lit) a *= .55; }
      else if(A === 'type'){ a = outA; const left = chars - charSeen, gs = graphemes(wd.w); txt = left <= 0 ? '' : gs.slice(0, Math.ceil(left)).join(''); charSeen += gs.length + 1; }
      paintWord(c, L, txt, x, wy, size, col, a, ink, k);
      x += wd.ww + lay.sp; k++;
    });
  });
  c.restore();
  return totalH * scale;
}

/* ---------------- effects ---------------- */
function preFx(c, W, H, t, lv, u, spec, L, light){
  const f = L.fx, a = L.fxAmt || 1, acc = L._acc;
  if(f.fog) fogFx(c, W, H, t, u, 7, light ? 'rgba(255,255,255,' : 'rgba(200,200,215,', .14 * a);
  if(f.stars) twinkle(c, W, H, t, Math.round(70 * a), 9);
  if(f.shooting){ for(let i = 0; i < 3; i++){ const cyc = 4 + i * 1.7, ph = ((t + i * 1.3) % cyc) / cyc; if(ph > .25) continue; const q = ph / .25, n = Math.floor((t + i * 1.3) / cyc), x0 = R(i + n * 3) * W, y0 = R(i + 9 + n) * H * .5;
    const x = x0 + q * u * .6, y = y0 + q * u * .3, g = c.createLinearGradient(x - u * .2, y - u * .1, x, y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.9)');
    c.strokeStyle = g; c.lineWidth = u * .004; c.beginPath(); c.moveTo(x - u * .2, y - u * .1); c.lineTo(x, y); c.stroke(); } }
  if(f.bokeh){ c.save(); c.globalCompositeOperation = light ? 'source-over' : 'lighter';
    dots(c, Math.round(22 * a), 71, (i, p1, p2, p3) => { const x = p1 * W + Math.sin(t * .2 + i) * u * .05, y = p2 * H + Math.cos(t * .15 + i) * u * .05, r = u * (.03 + p3 * .07) * (1 + lv * .2);
      const g = c.createRadialGradient(x, y, r * .6, x, y, r); g.addColorStop(0, hexA(i % 2 ? acc : '#ffffff', .18)); g.addColorStop(1, hexA(i % 2 ? acc : '#ffffff', 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
    c.restore(); }
  if(f.spotlight){ const x = W * (.5 + .35 * Math.sin(t * .6)), y = H * (.5 + .25 * Math.cos(t * .45)), g = c.createRadialGradient(x, y, u * .05, x, y, u * .6);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.6 * Math.min(1, a)})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  if(f.eqfx) eqBars(c, W, H, t, u, spec, [acc, '#ffffff', acc], H * .97, .22 * a);
  if(f.circle){ const cx = W / 2, cy = H * ((L.ty == null ? .5 : L.ty) < .5 ? .72 : .28), r0 = u * .14; c.save(); c.translate(cx, cy); c.strokeStyle = acc; c.lineWidth = Math.max(2, u * .006);
    for(let i = 0; i < 64; i++){ const v = spec ? spec[(i % 32) * 2 + 1] / 255 : .3 + .3 * Math.sin(t * 4 + i); const ang = i / 64 * TAU; c.globalAlpha = .85;
      c.beginPath(); c.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); c.lineTo(Math.cos(ang) * (r0 + v * u * .15 * a), Math.sin(ang) * (r0 + v * u * .15 * a)); c.stroke(); }
    c.restore(); c.globalAlpha = 1; }
  if(f.waveform){ c.strokeStyle = hexA(acc, .85); c.lineWidth = Math.max(2, u * .005); c.beginPath(); const yb = H * .86;
    for(let i = 0; i <= 64; i++){ const v = spec ? spec[Math.min(spec.length - 1, i)] / 255 : .3 + .2 * Math.sin(t * 5 + i * .4); const x = i / 64 * W, y = yb + Math.sin(i * .9 + t * 8) * v * u * .08 * a; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
}
function partFx(c, W, H, t, lv, u, L, light){
  const f = L.fx, a = L.fxAmt || 1, acc = L._acc;
  if(f.sparkle){ c.save(); c.globalCompositeOperation = light ? 'source-over' : 'lighter';
    for(let i = 0; i < Math.round(40 * a); i++){ const y = (1 - ((R(i) + t * (.03 + R(i + 1) * .05)) % 1)) * H, x = R(i + 2) * W + Math.sin(t + i) * u * .02, s = u * (.003 + R(i + 3) * .006) * (1 + lv);
      c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 2 + i)); c.fillStyle = acc; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); }
    c.restore(); }
  if(f.confetti){ const cols = ['#ff6b6b','#ffd43b','#69db7c','#4dabf7','#da77f2','#ffa94d'];
    for(let i = 0; i < Math.round(60 * a); i++){ const y = ((R(i + 4) + t * (.08 + R(i) * .1)) % 1.1 - .05) * H, x = R(i + 5) * W + Math.sin(t * 2 + i) * u * .03, s = u * .012;
      c.save(); c.translate(x, y); c.rotate(t * 4 * (R(i + 6) - .5) + i); c.scale(1, Math.abs(Math.sin(t * 5 + i)) + .05); c.fillStyle = cols[i % cols.length]; c.fillRect(-s / 2, -s / 4, s, s / 2); c.restore(); } }
  if(f.snow) snowFx(c, W, H, t, u, Math.round(110 * a), 1);
  if(f.rain) rainFx(c, W, H, t, u, Math.round(110 * a), light ? '#4a6d8c' : '#cfe8ff');
  if(f.hearts) heartsFx(c, W, H, t, u, Math.round(18 * a), ['#ff8fab','#ffdeeb','#ff4d6d'], 1 + lv * .5);
  if(f.embers) embers(c, W, H, t, u, Math.round(45 * a), '#ffb347', 1.2);
}
function postFx(c, W, H, t, lv, u, L, bars){
  const f = L.fx, a = L.fxAmt || 1;
  if(f.lightleak){ c.save(); c.globalCompositeOperation = 'screen'; const x = W * (.5 + .6 * Math.sin(t * .23)), g = c.createRadialGradient(x, 0, 0, x, 0, u * 1.1);
    g.addColorStop(0, `rgba(255,140,60,${Math.min(1, .45 * a)})`); g.addColorStop(.5, `rgba(255,60,120,${Math.min(1, .18 * a)})`); g.addColorStop(1, 'rgba(255,60,120,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }
  if(f.flare){ c.save(); c.globalCompositeOperation = 'screen'; const fx = W * (.2 + .6 * (.5 + .5 * Math.sin(t * .15))), fy = H * .18;
    [[0, .2, .5], [.35, .05, .25], [.6, .08, .2], [.85, .03, .3]].forEach(([d, r, al], i) => { const x = fx + (W / 2 - fx) * d * 2, y = fy + (H / 2 - fy) * d * 2, rr = u * r;
      const g = c.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, `rgba(255,${230 - i * 30},${200 - i * 40},${Math.min(1, al * a)})`); g.addColorStop(1, 'rgba(255,200,150,0)'); c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2); });
    c.restore(); }
  if(f.lightning){ const cyc = 5.3, ph = (t % cyc) / cyc; if(ph < .04 || (ph > .06 && ph < .08)){ c.fillStyle = `rgba(220,230,255,${Math.min(1, .55 * a)})`; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#ffffff'; c.lineWidth = u * .006; c.beginPath(); let x = R(Math.floor(t / cyc)) * W, y = 0; c.moveTo(x, y); while(y < H * .7){ x += (R(x + y) - .5) * u * .12; y += u * .06; c.lineTo(x, y); } c.stroke(); } }
  if(f.strobe && lv > .72){ c.fillStyle = `rgba(255,255,255,${Math.min(1, (lv - .72) * 1.6 * a)})`; c.fillRect(0, 0, W, H); }
  if(f.glitch && (lv > .6 || R(Math.floor(t * 6)) > .85)){ const fr = Math.floor(t * 12); for(let i = 0; i < 6; i++){ const y = R(i + fr) * H, h = u * (.01 + R(i + 3 + fr) * .05), dx = (R(i + 7 + fr) - .5) * u * .12 * a;
    try{ c.drawImage(c.canvas, 0, y, W, h, dx, y, W, h); }catch(e){} } }
  if(f.vhs){ c.fillStyle = `rgba(0,0,0,${Math.min(1, .18 * a)})`; for(let y = 0; y < H; y += 4) c.fillRect(0, y, W, 2);
    const by = ((t * .15) % 1) * H; c.fillStyle = `rgba(255,255,255,${Math.min(1, .06 * a)})`; c.fillRect(0, by, W, u * .04);
    c.font = `600 ${u * .035}px monospace`; c.fillStyle = 'rgba(255,255,255,.75)'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('▶ PLAY', u * .04, bars + u * .04); }
  else if(f.scanlines){ c.fillStyle = `rgba(0,0,0,${Math.min(1, .22 * a)})`; for(let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1); }
  if(f.grain) grain(c, W, H, t, a);
  if(f.vignette){ const vg = c.createRadialGradient(W/2, H/2, u * .15, W/2, H/2, Math.max(W, H) * .65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${Math.min(.95, .8 * a)})`); c.fillStyle = vg; c.fillRect(0, 0, W, H); }
}
function grade(c, W, H, g){
  if(!g || g === 'none') return;
  const op = (mode, col, a) => { c.save(); c.globalCompositeOperation = mode; c.globalAlpha = a; c.fillStyle = col; c.fillRect(0, 0, W, H); c.restore(); };
  if(g === 'bw') op('saturation', '#808080', 1);
  else if(g === 'noir'){ op('saturation', '#808080', 1); op('multiply', '#9a9a9a', .6); op('overlay', '#000000', .25); }
  else if(g === 'sepia'){ op('saturation', '#808080', 1); op('color', '#a0703c', .55); }
  else if(g === 'warm') op('soft-light', '#ff9a3c', .45);
  else if(g === 'cool') op('soft-light', '#3c8dff', .45);
  else if(g === 'vivid') op('saturation', '#ff0000', .35);
  else if(g === 'faded'){ op('screen', '#5a5a64', .35); op('saturation', '#808080', .3); }
  else if(g === 'dream'){ op('screen', '#ff9ec7', .22); op('soft-light', '#c8a2ff', .3); }
  else if(g === 'matrix') op('color', '#2bdc5a', .35);
  else if(g === 'teal'){ op('soft-light', '#00a6a6', .35); op('overlay', '#ff8c3c', .12); }
  else if(g === 'night'){ op('multiply', '#4a5a9a', .45); op('saturation', '#808080', .3); }
}

/* Full frame. o = { lines, title, artist, lineAt } */
function frame(c, W, H, t, lv, spec, L, o){
  const bg = BG[L.bg] || BG.sea, u = Math.min(W, H), amt = L.fxAmt || 1, plv = L.fx.pulse ? lv * amt : lv * .25, tb = t * (L.speed == null ? 1 : L.speed);
  const gen = L.bg === 'gen' && L.gen;
  const light = gen ? !!L.gen.light : !!bg.light;
  const bgAcc = gen ? L.gen.cols[0] : bg.acc;
  const baseInk = light ? '#1d1a16' : (gen ? '#ffffff' : bg.ink);
  const ink = L.color === 'custom' ? (L.ink || '#ffffff') : COLORS[L.color] && COLORS[L.color][1] ? COLORS[L.color][1] : baseInk;
  const acc = L.acc || (bgAcc === ink ? '#ffd166' : bgAcc);
  const soft = ink === 'rainbow' ? '#ffffff' : ink;
  L._acc = acc; L._t = t; L._lv = lv;
  c.save(); c.globalAlpha = 1; c.shadowBlur = 0;
  if(L.fx.shake && lv > .55){ const s = (lv - .55) * u * .03 * amt; c.translate((R(Math.floor(t * 30)) - .5) * s, (R(Math.floor(t * 30) + 1) - .5) * s); }
  if(L.fx.zoompulse){ const z = 1 + lv * .05 * amt; c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2); }
  bg.draw(c, W, H, tb, plv, u, spec, L);
  if(L.fx.mirror){ c.save(); c.setTransform(-1, 0, 0, 1, W, 0); c.globalAlpha = .5; try{ c.drawImage(c.canvas, 0, 0, W / 2, H, W / 2, 0, W / 2, H); }catch(e){} c.restore(); }
  const vg = c.createRadialGradient(W/2, H/2, u * .3, W/2, H/2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, light ? 'rgba(80,60,30,.18)' : 'rgba(0,0,0,.5)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  preFx(c, W, H, tb, lv, u, spec, L, light);
  drawChar(c, W, H, t, lv, u, L);
  partFx(c, W, H, tb, lv, u, L, light);
  grade(c, W, H, L.grade);
  const bars = L.fx.bars ? H * .1 : 0, cy = H * clamp(L.ty == null ? .5 : L.ty, .08, .92), maxW = W * .84, ts = L.tsize || 1;
  const font = FONTS[L.font] || FONTS.bold, i = o.lineAt(t), first = o.lines.length ? o.lines[0].t : 1e9;
  const plainL = Object.assign({}, L, { tstyle:'glow', fx:{} });
  const titleY = L.charOn && L.charImg ? H * Math.min(.3, clamp(L.ty == null ? .5 : L.ty, .12, .3)) : H * .46;
  if(i < 0){
    const a = Math.min(1, t / .6) * clamp((first - t) / .5, 0, 1);
    if(o.title){ let size = u * .09 * font.k * ts; c.font = `${font.w} ${size}px ${font.fam}`; const tt = font.upper ? o.title.toUpperCase() : o.title;
      while(c.measureText(tt).width > W * .86 && size > 18){ size -= 2; c.font = `${font.w} ${size}px ${font.fam}`; }
      c.textAlign = 'center'; c.textBaseline = 'middle'; paintWord(c, L, tt, W / 2, titleY, size, ink, a, ink, 0); c.textAlign = 'left'; }
    if(o.artist){ c.font = `600 ${u * .042}px ${FONTS.bold.fam}`; c.textAlign = 'center'; c.textBaseline = 'middle'; paintWord(c, plainL, o.artist, W / 2, titleY + u * .11, u * .042, soft, a * .85, ink); c.textAlign = 'left'; }
  } else {
    const cur = o.lines[i], nxt = o.lines[i + 1], end = Math.min(nxt ? nxt.t : cur.t + 6, cur.t + 9), p = t - cur.t, dur = end - cur.t;
    const h = drawLine(c, L, cur.text, W / 2, cy, u * .08 * ts * (1 + plv * .05), maxW, p, dur, ink, acc, 1);
    if(L.fx.next && nxt && nxt.t - t < 6 && L.anim !== 'stack'){ const nf = FONTS[L.font] || FONTS.bold, ns = u * .04 * nf.k * ts;
      c.font = `${nf.w} ${ns}px ${nf.fam}`; c.textAlign = L.align === 'left' ? 'left' : L.align === 'right' ? 'right' : 'center'; c.textBaseline = 'middle';
      const nx = L.align === 'left' ? (W - maxW) / 2 : L.align === 'right' ? (W + maxW) / 2 : W / 2;
      paintWord(c, Object.assign({}, L, { tstyle: L.tstyle === 'box' ? 'glow' : L.tstyle, fx:{} }), nf.upper ? nxt.text.toUpperCase() : nxt.text, nx, cy + h / 2 + u * .085, ns, soft, .38, ink); c.textAlign = 'left'; }
  }
  if(L.fx.info && (o.title || o.artist)){ c.font = `600 ${u * .03}px ${FONTS.bold.fam}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    paintWord(c, plainL, [o.title, o.artist].filter(Boolean).join('  ·  '), W / 2, H - bars - u * .07, u * .03, soft, .6, ink); c.textAlign = 'left'; }
  postFx(c, W, H, t, lv, u, L, bars);
  if(bars){ c.fillStyle = '#000'; c.fillRect(0, 0, W, bars); c.fillRect(0, H - bars, W, bars); }
  c.restore();
}

function makeBlur(img){ const iw = img.videoWidth || img.width, ih = img.videoHeight || img.height; const w = 96, h = Math.max(1, Math.round(96 * ih / iw)); const s = document.createElement('canvas'); s.width = w; s.height = h; s.getContext('2d').drawImage(img, 0, 0, w, h); return s; }
const loaded = new Set();
function loadFonts(key){
  if(!document.fonts || !document.fonts.load) return Promise.resolve();
  const jobs = [], f = FONTS[key] || FONTS.bold;
  f.fam.split(',').map(s => s.trim()).filter(s => s.startsWith('"')).forEach(fam => { const id = f.w + ' 40px ' + fam; if(!loaded.has(id)){ loaded.add(id); jobs.push(document.fonts.load(id, 'Aaతెలుగుहिंदी').catch(() => {})); } });
  ['800 40px "Hanken Grotesk"','600 40px "Hanken Grotesk"','800 40px "Noto Sans Telugu"','800 40px "Noto Sans Devanagari"'].forEach(s => { if(!loaded.has(s)){ loaded.add(s); jobs.push(document.fonts.load(s, 'Aaతెలుగుहिंदी').catch(() => {})); } });
  return Promise.all(jobs);
}

window.LOOK = { CHAR_SRC, CHAR_MOVES, CHAR_POS, CHAR_CUT, BG, RATIOS, FONTS, ANIMS, TSTYLES, COLORS, ALIGNS, GRADES, FX, GEN_KINDS, defaults, frame, makeBlur, loadFonts, randomGen, R };
})();
