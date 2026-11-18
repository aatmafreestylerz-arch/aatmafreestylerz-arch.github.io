/* Lyric Studio film editor: turns your own camera footage into a music video.
   Finds the beat of the song, lines up clips where you sing along, cuts on the beat,
   and adds camera moves (push-in, pans, tilts, dutch roll, beat punch) and transitions.
   The edit is drawn as a background layer, so lyrics, colour grades and effects go on top. */
(function(){
const MOVES = { push:'Slow push-in', pull:'Pull back', panL:'Pan left', panR:'Pan right', tiltU:'Tilt up', tiltD:'Tilt down', dutch:'Dutch roll', punch:'Beat punch', shake:'Beat shake', drift:'Handheld', still:'Locked off' };
const TRANS = { cut:'Cut', flash:'Flash', whip:'Whip pan', zoom:'Zoom blur', spin:'Spin', glitch:'Glitch', dip:'Dip to black' };
const CURVES = { normal:'Normal speed', slow:'Slow motion (½×)', super:'Super slow (¼×, film at 120 fps)', rampIn:'Ramp: fast to slow', rampOut:'Ramp: slow to fast', velocity:'Velocity (fast, slow on every beat)', freeze:'Freeze frame', reverse:'Reverse' };
const FX = { none:'No effect', echo:'Motion trail', rgb:'RGB split', strobe:'Strobe', mirror:'Mirror', bw:'Black and white', glow:'Dreamy glow' };
const SFX = { auto:'Sound: automatic', none:'Sound: none', whoosh:'Whoosh', impact:'Impact', hit:'Bass hit', boom:'Deep boom', riser:'Riser', glitch:'Glitch zap', shutter:'Camera shutter', rewind:'Rewind' };
const STYLES = {
  cinematic: { name:'Smooth cinematic', calm:[8, 4], busy:[4, 4, 2], moves:['push','pull','panL','panR','tiltU','dutch','drift','push'], trans:['cut','cut','dip','whip','zoom'], curves:['normal','normal','slow','rampIn'], fx:['none','none','none','glow'] },
  mixed:     { name:'Calm verses, fast chorus', calm:[4, 8], busy:[2, 1, 2], moves:['push','pull','panL','panR','dutch','punch','drift','tiltD','shake'], trans:['cut','cut','flash','whip','zoom','glitch'], curves:['normal','normal','rampIn','slow','rampOut'], fx:['none','none','none','rgb','echo'] },
  energetic: { name:'Fast and energetic', calm:[2, 4], busy:[1, 2, 1], moves:['punch','push','panL','panR','dutch','drift','punch','shake'], trans:['cut','flash','whip','zoom','spin','glitch'], curves:['normal','rampIn','rampOut','normal'], fx:['none','rgb','strobe','none','echo'] },
  velocity:  { name:'Velocity edit (speed ramps)', calm:[4, 2], busy:[2, 2, 1], moves:['punch','push','shake','dutch','punch'], trans:['flash','zoom','whip','glitch','cut'], curves:['velocity','velocity','rampIn','rampOut','velocity'], fx:['none','rgb','echo','none'] }
};
const rnd = s => { const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const ease = p => p * p * (3 - 2 * p);

/* ---------- audio analysis ---------- */
function monoOf(buf){ const n = buf.length, m = new Float32Array(n), ch = buf.numberOfChannels;
  for(let c = 0; c < ch; c++){ const d = buf.getChannelData(c); for(let i = 0; i < n; i++) m[i] += d[i] / ch; } return m; }
/* Onset strength at `rate` frames per second: rise in loudness of the high and low bands. */
function onsets(mono, sr, rate){
  const hop = Math.round(sr / rate), n = Math.floor(mono.length / hop), env = new Float32Array(n), rms = new Float32Array(n);
  let lpPrev = 0, prevL = 0, prevH = 0;
  for(let f = 0; f < n; f++){
    let lo = 0, hi = 0; const s0 = f * hop;
    for(let i = 0; i < hop; i++){ const x = mono[s0 + i]; lpPrev += .05 * (x - lpPrev); lo += lpPrev * lpPrev; const h = x - lpPrev; hi += h * h; }
    const L = Math.log(1e-6 + lo / hop), H = Math.log(1e-6 + hi / hop);
    env[f] = Math.max(0, L - prevL) + Math.max(0, H - prevH); prevL = L; prevH = H; rms[f] = Math.sqrt((lo + hi) / hop);
  }
  const mean = env.reduce((a, b) => a + b, 0) / (n || 1); for(let f = 0; f < n; f++) env[f] = Math.max(0, env[f] - mean);
  return { env, rms, rate: sr / hop };
}
function analyze(buf){
  const mono = monoOf(buf), { env, rms, rate } = onsets(mono, buf.sampleRate, 100), n = env.length;
  let best = 0, bestLag = 50;
  for(let bpm = 70; bpm <= 180; bpm += .5){ const lag = 60 * rate / bpm; let s = 0, c = 0;
    for(let f = 0; f + lag * 4 < n; f += 2){ s += env[f] * (env[Math.round(f + lag)] + .5 * env[Math.round(f + lag * 2)] + .25 * env[Math.round(f + lag * 4)]); c++; }
    const w = Math.exp(-Math.pow(Math.log2(bpm / 115), 2) / .5); s = s / (c || 1) * w;
    if(s > best){ best = s; bestLag = lag; } }
  let bestPh = 0, bs = -1; for(let ph = 0; ph < bestLag; ph += .5){ let s = 0; for(let f = ph; f < n; f += bestLag) s += env[Math.round(f)] || 0; if(s > bs){ bs = s; bestPh = ph; } }
  const beats = []; for(let f = bestPh; f < n; f += bestLag) beats.push(+(f / rate).toFixed(3));
  const loud = beats.map((b, i) => { const a = Math.round(b * rate), e = Math.round((beats[i + 1] || b + bestLag / rate) * rate); let s = 0, c = 0; for(let f = a; f < e && f < n; f++){ s += rms[f]; c++; } return c ? s / c : 0; });
  const sm = loud.map((_, i) => { let s = 0, c = 0; for(let k = Math.max(0, i - 4); k <= Math.min(loud.length - 1, i + 4); k++){ s += loud[k]; c++; } return s / c; });
  const sorted = sm.slice().sort((a, b) => a - b), lo = sorted[Math.floor(sorted.length * .15)] || 0, hi = sorted[Math.floor(sorted.length * .9)] || 1;
  const energy = sm.map(v => Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1))));
  return { bpm: +(60 * rate / bestLag).toFixed(1), beats, energy, dur: buf.duration };
}
/* Where a sung-along clip sits in the song: compares the loudness rhythm of the clip's sound with the song's. */
function findOffset(songBuf, clipBuf){
  const R = 50, a = onsets(monoOf(songBuf), songBuf.sampleRate, R).env, b = onsets(monoOf(clipBuf), clipBuf.sampleRate, R).env;
  const nb = Math.min(b.length, R * 60), bb = b.subarray(0, nb); let nb2 = 0; for(let i = 0; i < nb; i++) nb2 += bb[i] * bb[i];
  if(nb < R * 3 || nb2 === 0) return null;
  let best = -1, bestLag = 0; const scores = [];
  for(let lag = -nb + R * 2; lag < a.length - R * 2; lag++){ let s = 0, na = 0;
    for(let i = 0; i < nb; i++){ const j = i + lag; if(j < 0 || j >= a.length) continue; s += a[j] * bb[i]; na += a[j] * a[j]; }
    const v = na ? s / Math.sqrt(na * nb2) : 0; scores.push([v, lag]); if(v > best){ best = v; bestLag = lag; } }
  scores.sort((x, y) => y[0] - x[0]); const second = (scores.find(s => Math.abs(s[1] - bestLag) > R) || [0])[0];
  const sure = best > .5 || (best > .25 && best > second * 1.15);
  return { offset: bestLag / R, score: +best.toFixed(2), sure };
}

/* ---------- building the edit ---------- */
function build(o){   // o = { clips:[{dur, perf, off, sure}], an, dur, style, seed, slow, lines }
  const st = STYLES[o.style] || STYLES.mixed, beats = o.an.beats.filter(b => b < o.dur), cuts = [];
  if(!o.clips.length) return cuts;
  let i = 0, k = 0, prevClip = -1, prevMove = '';
  const cursors = o.clips.map((c, ci) => rnd(o.seed + ci * 7) * Math.max(0, c.dur - 4));
  const bound = [0];
  while(i < beats.length){ const e = o.an.energy[i] || 0, pool = e > .6 ? st.busy : st.calm; let step = pool[Math.floor(rnd(o.seed + k * 3.1) * pool.length)];
    if(step >= 4){ const rem = i % 4; if(rem) step = 4 - rem; }
    i += step; k++; if(i < beats.length && beats[i] - bound[bound.length - 1] >= .45) bound.push(beats[i]); }
  if(o.dur - bound[bound.length - 1] < 1 && bound.length > 1) bound.pop();
  bound.push(o.dur);
  const singing = t => (o.lines || []).some((l, j) => t >= l.t - .2 && t < ((o.lines[j + 1] || {}).t || l.t + 6));
  for(let c = 0; c + 1 < bound.length; c++){
    const a = bound[c], b = bound[c + 1], len = b - a, r = rnd(o.seed + c * 13.7);
    const perf = o.clips.map((cl, ci) => ci).filter(ci => o.clips[ci].perf && o.clips[ci].off != null && a - o.clips[ci].off >= 0 && b - o.clips[ci].off <= o.clips[ci].dur + .05);
    const roll = o.clips.map((cl, ci) => ci).filter(ci => !o.clips[ci].perf);
    let pool = (perf.length && (singing(a) ? r < .7 : r < .35)) || !roll.length ? (perf.length ? perf : roll) : roll;
    if(!pool.length) pool = o.clips.map((cl, ci) => ci);
    let pick = pool[Math.floor(rnd(o.seed + c * 5.3) * pool.length)]; if(pick === prevClip && pool.length > 1) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    const cl = o.clips[pick]; let src, speed = 1, curve = 'normal';
    const synced = cl.perf && cl.off != null && perf.includes(pick);
    if(synced) src = a - cl.off;
    else { curve = st.curves[Math.floor(rnd(o.seed + c * 6.7) * st.curves.length)]; if(o.slow && curve === 'normal') curve = 'slow';
      const need = len * avgSpeed(curve) + .5;
      if(cursors[pick] + need > cl.dur) cursors[pick] = 0; src = cursors[pick]; cursors[pick] += need + .3; }
    const fx = synced ? 'none' : st.fx[Math.floor(rnd(o.seed + c * 8.3) * st.fx.length)];
    let move = st.moves[Math.floor(rnd(o.seed + c * 2.9) * st.moves.length)]; if(move === prevMove) move = st.moves[(st.moves.indexOf(move) + 1) % st.moves.length];
    const trans = c === 0 ? 'dip' : st.trans[Math.floor(rnd(o.seed + c * 4.1) * st.trans.length)];
    cuts.push({ a: +a.toFixed(3), b: +b.toFixed(3), clip: pick, src: +src.toFixed(3), speed, curve, fx, move, trans, sfx: 'auto' });
    prevClip = pick; prevMove = move;
  }
  return cuts;
}

/* ---------- speed curves ---------- */
function avgSpeed(curve){ return { slow:.5, super:.25, rampIn:1.1, rampOut:1.1, velocity:1.3, freeze:.6, reverse:1 }[curve] || 1; }
function speedAt(cut, u, len){   // playback speed u seconds into the shot
  const p = Math.min(1, Math.max(0, u / len));
  switch(cut.curve){
    case 'slow': return .5;
    case 'super': return .25;
    case 'rampIn': return 2.2 - 1.9 * ease(Math.min(1, p / .6));
    case 'rampOut': return .3 + 1.9 * ease(Math.max(0, (p - .4) / .6));
    case 'velocity': { let d = 9; for(const b of F.beats){ const x = Math.abs(cut.a + u - b); if(x < d) d = x; if(b > cut.a + u + 1) break; } return .3 + 1.9 * ease(Math.min(1, d / .28)); }
    case 'freeze': return p < .55 ? 1 : 0;
    case 'reverse': return -1;
    default: return cut.speed || 1;
  }
}
function srcOffset(cut, u){   // seconds of footage used u seconds into the shot
  const len = Math.max(.01, cut.b - cut.a), c = cut.curve || 'normal';
  if(c === 'normal') return u * (cut.speed || 1);
  if(c === 'slow') return u * .5; if(c === 'super') return u * .25;
  if(c === 'reverse') return len - u;
  if(!cut._tab || cut._tabKey !== c + len){ const n = Math.ceil(len * 120) + 1, tab = new Float32Array(n); let acc = 0;
    for(let i = 1; i < n; i++){ acc += speedAt(cut, (i - .5) / 120, len) / 120; tab[i] = acc; }
    Object.defineProperty(cut, '_tab', { value: tab, writable: true, enumerable: false, configurable: true }); Object.defineProperty(cut, '_tabKey', { value: c + len, writable: true, enumerable: false, configurable: true }); }
  const f = Math.min(cut._tab.length - 1, Math.max(0, u * 120)), i = Math.floor(f), k = f - i;
  return cut._tab[i] + ((cut._tab[i + 1] != null ? cut._tab[i + 1] : cut._tab[i]) - cut._tab[i]) * k;
}

/* ---------- playing and drawing ---------- */
const F = { clips: [], cuts: [], beats: [], active: [], sfxOn: true, sfxVol: .8 };
function cutAt(t){ const c = F.cuts; let lo = 0, hi = c.length - 1; if(!c.length) return -1; if(t < c[0].a) return 0;
  while(lo < hi){ const m = (lo + hi + 1) >> 1; if(c[m].a <= t) lo = m; else hi = m - 1; } return lo; }
/* The video elements a shot needs and the footage time for each (a clone shot uses two or three). */
function sources(cut, t){
  const cl = F.clips[cut.clip]; if(!cl) return [];
  const u = Math.max(0, t - cut.a), off = srcOffset(cut, u);
  const one = (it, base) => { const el = it.el, d = el && el.duration || 0; let x = base + off; if(d) x = ((x % d) + d) % d; return { el, x }; };
  if(cl.type === 'clone') return cl.members.map(m => { const it = F.clips[m]; if(!it || !it.el) return null;
    const base = it.perf && it.off != null && cl.perf ? cut.a - it.off : cut.src + (it.lag || 0); return one(it, base); }).filter(Boolean);
  return [one(cl, cut.src)];
}
function sync(t, live){
  const i = cutAt(t); if(i < 0) return; const cut = F.cuts[i], list = sources(cut, t), els = list.map(s => s.el);
  F.active.forEach(el => { if(!els.includes(el)) try{ el.pause(); }catch(e){} });
  const v = speedAt(cut, t - cut.a, Math.max(.01, cut.b - cut.a)), smooth = live && v > 0 && cut.curve !== 'reverse';
  list.forEach(({ el, x }) => {
    const fresh = !F.active.includes(el);
    if(smooth){ try{ el.playbackRate = Math.min(4, Math.max(.0625, v)); }catch(e){}
      if(fresh || Math.abs(el.currentTime - x) > .3) try{ el.currentTime = x; }catch(e){}
      if(el.paused) el.play().catch(() => {}); }
    else { if(!el.paused) el.pause(); if(Math.abs(el.currentTime - x) > (live ? .05 : .03)) try{ el.currentTime = x; }catch(e){} }
  });
  F.active = els;
}
function pauseAll(){ F.clips.forEach(c => { try{ c.el && c.el.pause(); }catch(e){} }); F.active = []; }
function seek(v, t, tol){ return new Promise(res => { if(!v || !v.duration){ res(); return; } if(Math.abs(v.currentTime - t) < (tol || 1e-3) && v.readyState >= 2){ res(); return; }
  const done = () => { clearTimeout(to); v.removeEventListener('seeked', done); res(); }; const to = setTimeout(done, 1500); v.addEventListener('seeked', done); v.currentTime = t; }); }
async function prepare(t, fps){ const i = cutAt(t); if(i < 0) return; const list = sources(F.cuts[i], t);
  F.active.forEach(el => { if(!list.some(s => s.el === el)) try{ el.pause(); }catch(e){} }); F.active = list.map(s => s.el);
  await Promise.all(list.map(({ el, x }) => { try{ el.pause(); }catch(e){} return seek(el, x, fps ? .45 / fps : 0); })); }
function beatKick(t){ let k = 0; for(const b of F.beats){ if(b > t) break; const d = t - b; if(d < .3) k = Math.max(k, Math.exp(-d * 12)); } return k; }

/* Off-screen canvases for clone shots and effects. */
const pool = {}; function cnv(name, w, h){ let c = pool[name]; if(!c){ c = pool[name] = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })); }
  if(c.width !== w) c.width = w; if(c.height !== h) c.height = h; return c; }
/* Clone: each take fills its own strip of the frame, with soft edges, so you appear two or three times. */
function cloneFrame(cl, list){
  const base = list[0] && list[0].el; if(!base || !base.videoWidth) return null;
  const sc = Math.min(1, 1920 / Math.max(base.videoWidth, base.videoHeight)), w = Math.round(base.videoWidth * sc), h = Math.round(base.videoHeight * sc);
  const out = cnv('clone', w, h), o = out.getContext('2d'); o.globalCompositeOperation = 'source-over'; o.drawImage(base, 0, 0, w, h);
  const splits = cl.splits || [.5], fe = Math.max(.005, cl.feather || .05) * w;
  for(let k = 1; k < list.length; k++){ const el = list[k].el; if(!el.videoWidth || el.readyState < 2) continue;
    const x0 = (splits[k - 1] != null ? splits[k - 1] : k / list.length) * w, x1 = (splits[k] != null ? splits[k] : 1) * w;
    const m = cnv('mask', w, h), mc = m.getContext('2d'); mc.globalCompositeOperation = 'source-over'; mc.clearRect(0, 0, w, h); mc.drawImage(el, 0, 0, w, h);
    const g = mc.createLinearGradient(x0 - fe, 0, x1 + fe, 0), span = (x1 - x0) + 2 * fe, a = fe * 2 / span;
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(Math.min(.49, a), 'rgba(0,0,0,1)'); g.addColorStop(Math.max(.51, 1 - (k === list.length - 1 && x1 >= w - 1 ? 0 : a)), 'rgba(0,0,0,1)'); g.addColorStop(1, k === list.length - 1 && x1 >= w - 1 ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)');
    mc.globalCompositeOperation = 'destination-in'; mc.fillStyle = g; mc.fillRect(0, 0, w, h); mc.globalCompositeOperation = 'source-over';
    o.drawImage(m, 0, 0); }
  return out;
}

function draw(c, W, H, t, lv){
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const i = cutAt(t); if(i < 0) return; const cut = F.cuts[i], cl = F.clips[cut.clip]; if(!cl) return;
  const list = sources(cut, t); if(!list.length) return;
  let img = list[0].el;
  if(cl.type === 'clone'){ img = cloneFrame(cl, list); if(!img) return; }
  else if(!img.videoWidth || img.readyState < 2) return;
  const iw = img.videoWidth || img.width, ih = img.videoHeight || img.height;
  const len = Math.max(.01, cut.b - cut.a), p = Math.min(1, Math.max(0, (t - cut.a) / len)), e = ease(p), since = t - cut.a, kick = beatKick(t);
  let z = 1.12, x = 0, y = 0, rot = 0;
  switch(cut.move){
    case 'push': z = 1.06 + .22 * e; break;
    case 'pull': z = 1.3 - .22 * e; break;
    case 'panL': z = 1.3; x = .5 - e; break;
    case 'panR': z = 1.3; x = e - .5; break;
    case 'tiltU': z = 1.3; y = .5 - e; break;
    case 'tiltD': z = 1.3; y = e - .5; break;
    case 'dutch': z = 1.28 + .05 * e; rot = (-3 + 6 * e) * Math.PI / 180; break;
    case 'punch': z = 1.14 + .22 * Math.exp(-since * 7) + .05 * kick; break;
    case 'shake': z = 1.2 + .04 * kick; x = kick * .35 * Math.sin(t * 91); y = kick * .3 * Math.cos(t * 77); rot = kick * .02 * Math.sin(t * 63); break;
    case 'drift': z = 1.18; x = .25 * Math.sin(t * .9 + i) + .06 * Math.sin(t * 3.1); y = .2 * Math.cos(t * .7 + i) + .05 * Math.sin(t * 2.3); rot = .006 * Math.sin(t * 1.3); break;
    default: z = 1.06;
  }
  let blur = 0, ox, oy;
  if(cut.trans === 'zoom' && since < .28){ const q = since / .28; z *= 1 + .6 * Math.pow(1 - q, 2); blur = Math.round(18 * (1 - q)); }
  if(cut.trans === 'spin' && since < .3){ const q = since / .3; rot += (1 - ease(q)) * Math.PI / 2; z *= 1 + .3 * (1 - q); blur = Math.round(14 * (1 - q)); }
  const s = Math.max(W / iw, H / ih) * z, dw = iw * s, dh = ih * s, sx = Math.max(0, (dw - W) / 2), sy = Math.max(0, (dh - H) / 2);
  ox = x * sx * 1.6; oy = y * sy * 1.6;
  if(cut.trans === 'whip' && since < .24){ const q = since / .24; ox += W * .55 * Math.pow(1 - q, 3); blur = Math.round(26 * (1 - q)); }
  if(cut.trans !== 'whip') { ox = Math.max(-sx, Math.min(sx, ox)); oy = Math.max(-sy, Math.min(sy, oy)); }
  const fx = cut.fx || 'none';
  const paint = (cc, extraX) => { cc.save(); let f = ''; if(blur) f += 'blur(' + blur + 'px) '; if(fx === 'bw') f += 'grayscale(1) contrast(1.15) ';
    if(f && 'filter' in cc) cc.filter = f.trim(); cc.translate(W / 2 + ox + (extraX || 0), H / 2 + oy); if(rot) cc.rotate(rot); cc.drawImage(img, -dw / 2, -dh / 2, dw, dh); cc.restore(); };
  if(fx === 'rgb' || (cut.trans === 'glitch' && since < .22)){
    const amt = fx === 'rgb' ? 6 + 22 * kick : 30 * (1 - since / .22), base = cnv('fxbase', W, H), bc = base.getContext('2d');
    bc.globalCompositeOperation = 'source-over'; bc.fillStyle = '#000'; bc.fillRect(0, 0, W, H); paint(bc);
    const ch = (name, col) => { const l = cnv(name, W, H), lc = l.getContext('2d'); lc.globalCompositeOperation = 'source-over'; lc.drawImage(base, 0, 0); lc.globalCompositeOperation = 'multiply'; lc.fillStyle = col; lc.fillRect(0, 0, W, H); lc.globalCompositeOperation = 'source-over'; return l; };
    const r = ch('fxr', '#f00'), g = ch('fxg', '#0f0'), b = ch('fxb', '#00f');
    c.save(); c.globalCompositeOperation = 'lighter'; c.drawImage(r, amt, 0); c.drawImage(g, 0, 0); c.drawImage(b, -amt, 0); c.restore();
    if(cut.trans === 'glitch' && since < .22){ const n = 7; for(let k = 0; k < n; k++){ const yy = Math.floor(rnd(k + Math.floor(since * 40)) * H), hh = 8 + rnd(k * 3.3) * H * .06, dx = (rnd(k * 7.1 + since) - .5) * W * .12; c.drawImage(base, 0, yy, W, hh, dx, yy, W, hh); } }
  } else if(fx === 'echo'){
    const tr = cnv('trail', W, H), tc = tr.getContext('2d'); if(F._trailCut !== i){ tc.fillStyle = '#000'; tc.fillRect(0, 0, W, H); F._trailCut = i; }
    tc.globalAlpha = .38; paint(tc); tc.globalAlpha = 1; c.drawImage(tr, 0, 0);
  } else paint(c);
  if(fx === 'mirror'){ c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(c.canvas, 0, 0, W / 2, H, 0, 0, W / 2, H); c.restore(); }
  if(fx === 'glow'){ const gl = cnv('glow', W >> 2, H >> 2), gc = gl.getContext('2d'); gc.drawImage(c.canvas, 0, 0, gl.width, gl.height); c.save(); if('filter' in c) c.filter = 'blur(6px)'; c.globalCompositeOperation = 'screen'; c.globalAlpha = .55; c.drawImage(gl, 0, 0, W, H); c.restore(); }
  if(fx === 'strobe' && kick > .55){ c.fillStyle = 'rgba(255,255,255,' + ((kick - .55) * 1.2).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  if(cut.curve === 'freeze' && p >= .55 && p < .62){ c.fillStyle = 'rgba(255,255,255,' + (.7 * (1 - (p - .55) / .07)).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  const next = F.cuts[i + 1]; if(next && next.trans === 'dip' && next.a - t < .25){ c.fillStyle = 'rgba(0,0,0,' + (1 - (next.a - t) / .25).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  if(cut.trans === 'dip' && since < .35){ c.fillStyle = 'rgba(0,0,0,' + (1 - since / .35).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  if(cut.trans === 'flash' && since < .16){ c.fillStyle = 'rgba(255,255,255,' + (.85 * (1 - since / .16)).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, 0, W, H);
}

/* ---------- sound effects (made here, no downloads) ---------- */
const sfxCache = {};
function synth(kind, sr){
  const L = { whoosh:.55, impact:1.2, hit:.6, boom:2.2, riser:2.4, glitch:.35, shutter:.25, rewind:.9 }[kind] || .5, n = Math.floor(L * sr), o = new Float32Array(n);
  let seed = 1, lp = 0, lp2 = 0; const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; };
  for(let i = 0; i < n; i++){ const t = i / sr, p = i / n; let v = 0;
    switch(kind){
      case 'whoosh': { const f = .02 + .25 * Math.sin(Math.PI * p); lp += f * (noise() - lp); v = lp * Math.sin(Math.PI * p) * 2.2; break; }
      case 'impact': { lp += .08 * (noise() - lp); v = Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-t * 18)) * t) * Math.exp(-t * 4) * .9 + lp * Math.exp(-t * 9) * 1.6; break; }
      case 'hit': v = Math.sin(2 * Math.PI * (48 + 160 * Math.exp(-t * 30)) * t) * Math.exp(-t * 9); break;
      case 'boom': { lp += .02 * (noise() - lp); v = Math.sin(2 * Math.PI * (32 + 30 * Math.exp(-t * 3)) * t) * Math.exp(-t * 1.6) + lp * Math.exp(-t * 2) * 2; break; }
      case 'riser': { const f = .01 + .4 * p * p; lp += f * (noise() - lp); v = (lp * 1.6 + .15 * Math.sin(2 * Math.PI * (200 + 1400 * p * p) * t)) * p * p; break; }
      case 'glitch': v = (Math.sign(Math.sin(2 * Math.PI * (300 + 900 * Math.floor(p * 9) / 9) * t)) * .35 + noise() * .2) * (Math.floor(p * 14) % 2 ? 1 : .2) * (1 - p); break;
      case 'shutter': v = noise() * (Math.exp(-t * 60) + (t > .09 ? Math.exp(-(t - .09) * 70) : 0)) * .8; break;
      case 'rewind': { lp += .3 * (noise() - lp); v = (Math.sin(2 * Math.PI * (900 - 700 * p) * t) * .25 + lp * .6) * Math.sin(Math.PI * p) * (1 + .5 * Math.sin(2 * Math.PI * 18 * t)); break; }
    }
    lp2 += .5 * (v - lp2); o[i] = Math.max(-1, Math.min(1, lp2 * .8)); }
  return o;
}
function sfxData(kind, sr){ const k = kind + sr; return sfxCache[k] || (sfxCache[k] = synth(kind, sr)); }
function autoSfx(cut, prev){ if(cut.trans === 'whip' || cut.trans === 'zoom' || cut.trans === 'spin') return 'whoosh'; if(cut.trans === 'flash') return 'impact'; if(cut.trans === 'glitch') return 'glitch';
  if(cut.curve === 'reverse') return 'rewind'; if(cut.curve === 'freeze') return 'shutter'; if(cut.move === 'punch') return 'hit'; return null; }
const LEAD = { whoosh:.25, riser:2.3, rewind:.1 };
function sfxEvents(an){
  if(!F.sfxOn) return [];
  const ev = []; F.cuts.forEach((c, i) => { const k = c.sfx && c.sfx !== 'auto' ? (c.sfx === 'none' ? null : c.sfx) : autoSfx(c, F.cuts[i - 1]);
    if(k && i > 0) ev.push({ t: Math.max(0, c.a - (LEAD[k] || 0)), kind: k });
    if(c.curve === 'freeze') ev.push({ t: c.a + (c.b - c.a) * .55, kind: 'shutter' }); });
  if(an && an.energy){ let prevHigh = true; an.beats.forEach((b, i) => { const hi = (an.energy[i] || 0) > .6; if(hi && !prevHigh && b > 3){ ev.push({ t: b - LEAD.riser, kind: 'riser' }); ev.push({ t: b, kind: 'boom' }); } prevHigh = hi; }); }
  return ev.sort((a, b) => a.t - b.t);
}
/* Adds the sound effects to the song for export. */
function mixInto(buf, an){
  const ev = sfxEvents(an); if(!ev.length) return buf;
  const sr = buf.sampleRate, out = new AudioBuffer({ length: buf.length, numberOfChannels: buf.numberOfChannels, sampleRate: sr }), g = F.sfxVol * .5;
  for(let ch = 0; ch < buf.numberOfChannels; ch++){ const d = buf.getChannelData(ch).slice(); 
    for(const e of ev){ const s = sfxData(e.kind, sr), o0 = Math.floor(e.t * sr); for(let i = 0; i < s.length && o0 + i < d.length; i++) if(o0 + i >= 0) d[o0 + i] += s[i] * g; }
    for(let i = 0; i < d.length; i++){ const x = d[i]; d[i] = x > 1 ? 1 : x < -1 ? -1 : x; }
    out.copyToChannel(d, ch); }
  return out;
}
/* For the live preview and quick record: sound effects between two moments of the song. */
function sfxBetween(a, b, an){ if(!F.sfxOn || b <= a || b - a > .5) return []; if(!F._ev || F._evKey !== F.cuts.length + ':' + F.sfxOn){ F._ev = sfxEvents(an); F._evKey = F.cuts.length + ':' + F.sfxOn; } return F._ev.filter(e => e.t > a && e.t <= b); }
function sfxBuffer(kind, ac){ const d = sfxData(kind, ac.sampleRate), b = ac.createBuffer(1, d.length, ac.sampleRate); b.copyToChannel(d, 0); return b; }
function resetSfx(){ F._ev = null; }

/* ---------- shot list ---------- */
const SHOTS = {
  intro: ['Wide shot of the location: walk the camera slowly towards it (Follow mode)', 'Silhouette against a bright sky or street light, low angle', 'Detail close-ups with the zoom lens: hands, shoes, chain, eyes', 'You walking into frame from far away'],
  verse: ['Medium shot singing to the camera, Pocket on the tripod at chest height (sing the whole song along)', 'Side profile close-up singing, zoom lens', 'Walking towards the camera while singing, face tracking on', 'Over-the-shoulder shot looking out at the road or city', 'Sitting shot: steps, car bonnet or rooftop edge, singing'],
  hook: ['Low-angle hero shot: Pocket near the ground, tilted up at you singing', '360° orbit: hold the Pocket at arm\'s length and walk a full circle around yourself while singing', 'Fast whip pans between two spots (great for beat cuts)', 'Slow motion (4K 120 or 240 fps): hair flick, turning round, throwing a jacket, a dance move', 'Close-up singing straight into the lens, with energy'],
  outro: ['Pull back: walk the camera slowly away while you finish singing', 'You walking away into the distance', 'Last close-up: look into the lens, then look away', 'Wide shot of the empty location (to end on)']
};
function shotList(an, lines, dur){
  const first = lines.length ? lines[0].t : dur * .1, last = lines.length ? lines[lines.length - 1].t + 4 : dur * .9, secs = [];
  const eAt = t => { const b = an.beats; let i = 0; while(i + 1 < b.length && b[i + 1] <= t) i++; return an.energy[i] || 0; };
  if(first > 2) secs.push({ kind:'intro', a: 0, b: first });
  let cur = null;
  for(let t = first; t < Math.min(last, dur); t += 2){ const kind = eAt(t) > .6 ? 'hook' : 'verse';
    if(cur && cur.kind === kind) cur.b = t + 2; else { if(cur && cur.b - cur.a < 8 && secs.length){ secs[secs.length - 1].b = t + 2; cur = secs[secs.length - 1]; continue; } cur = { kind, a: t, b: t + 2 }; secs.push(cur); } }
  if(dur - last > 2) secs.push({ kind:'outro', a: Math.min(last, dur), b: dur });
  const names = { intro:'Intro', verse:'Verse', hook:'Chorus / hook', outro:'Outro' }, count = {};
  return secs.map((s, i) => { count[s.kind] = (count[s.kind] || 0) + 1;
    const ls = lines.filter(l => l.t >= s.a && l.t < s.b), list = SHOTS[s.kind], n = s.kind === 'verse' || s.kind === 'hook' ? 3 : 2;
    const shots = []; for(let k = 0; k < n; k++) shots.push(list[(k + count[s.kind] - 1) % list.length]);
    return { name: names[s.kind] + (s.kind === 'verse' || s.kind === 'hook' ? ' ' + count[s.kind] : ''), a: s.a, b: s.b, first: ls[0] ? ls[0].text : '', shots }; });
}
const TIPS = [
  'For every singing take, play the song out loud from your phone and sing along from the very start. The app finds where each take fits in the song by itself.',
  'Film each singing take twice: once wide (1x lens) and once close (zoom lens). The editor switches between them.',
  'Record 4K at 30 fps. In the camera settings choose H.264 and normal colour (not D-Log or HEVC) so the phone can read the files.',
  'For slow-motion shots use 4K at 120 or 240 fps and keep them short (5 to 10 seconds).',
  'Hold each B-roll shot still for a second at the start and end. Golden hour, night streets and neon look the most cinematic.',
  'Clone shot (you in 2 or 3 places at once): put the Pocket on a tripod and do not move it. Film one take standing on the left, one in the middle, one on the right, each singing the full song. Keep the light the same and do not cross into the other places.'
];

function cloneStill(cl){ const list = cl.members.map(m => F.clips[m]).filter(it => it && it.el).map(it => ({ el: it.el })); return cloneFrame(cl, list); }
window.FILM = { cloneStill, MOVES, TRANS, CURVES, FX, SFX, STYLES, TIPS, analyze, findOffset, build, shotList, F, cutAt, sync, pauseAll, prepare, draw, mixInto, sfxBetween, sfxBuffer, sfxData, resetSfx };
})();
