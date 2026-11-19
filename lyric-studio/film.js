/* Lyric Studio film editor: turns your own camera footage into a music video.
   Finds the beat of the song, lines up clips where you sing along, cuts on the beat,
   and adds camera moves (push-in, pans, tilts, dutch roll, beat punch) and transitions.
   The edit is drawn as a background layer, so lyrics, colour grades and effects go on top. */
(function(){
const MOVES = { push:'Slow push-in', pull:'Pull back', crash:'Crash zoom', snap:'Snap zoom on beat', vertigo:'Vertigo zoom', panL:'Pan left', panR:'Pan right', tiltU:'Tilt up', tiltD:'Tilt down', crane:'Crane up', arc:'Orbit arc', dutch:'Dutch roll', focus:'Rack focus', float:'Floating', punch:'Beat punch', shake:'Beat shake', drift:'Handheld', reveal:'Letterbox reveal', still:'Locked off', custom:'Custom (keyframes)' };
const TRANS = { cut:'Cut', dissolve:'Cross dissolve', blurx:'Blur dissolve', flash:'Flash', whip:'Whip pan', push:'Push', slide:'Slide up', zoom:'Zoom blur', zoomout:'Zoom out', spin:'Spin', glitch:'Glitch', burn:'Film burn', leak:'Light leak', dip:'Dip to black' };
const TWO = { dissolve:.45, blurx:.45, push:.3, slide:.3, burn:.5, leak:.5, zoomout:.3 };
const CURVES = { normal:'Normal speed', slow:'Slow motion (½×)', super:'Super slow (¼×, film at 120 fps)', rampIn:'Ramp: fast to slow', rampOut:'Ramp: slow to fast', velocity:'Velocity (fast, slow on every beat)', freeze:'Freeze frame', reverse:'Reverse' };
const FX = { none:'No effect', grain:'Film grain', leaks:'Light leaks', flare:'Lens flare', halation:'Halation', glow:'Dreamy glow', prism:'Prism', chroma:'Chromatic fringe', vhs:'VHS tape', echo:'Motion trail', rgb:'RGB split', strobe:'Strobe', mirror:'Mirror', bw:'Black and white' };
const BGFX = { none:'Keep background', blur:'Blur background (portrait)', pop:'Colour pop (background black and white)', dark:'Dark background', studio:'Studio backdrop', outline:'Neon outline' };
const LOOKS = { none:'As filmed', teal:'Teal and orange', warm:'Warm film', cold:'Cold steel', sunset:'Golden hour', neon:'Neon night', bleach:'Bleach bypass', noir:'Noir', matrix:'Matrix green', pastel:'Soft pastel', vivid:'Vivid' };
const LOOKF = { none:['',null], teal:['contrast(1.12) saturate(1.15)',['soft-light','#0e7c86',.32,'overlay','#ff9a3c',.12]], warm:['sepia(.25) saturate(1.1) contrast(1.05)',['soft-light','#ff8a3d',.22]], cold:['saturate(.8) contrast(1.12) hue-rotate(-8deg)',['soft-light','#3d7bff',.24]], sunset:['sepia(.35) saturate(1.3)',['soft-light','#ff6a00',.25]], neon:['saturate(1.5) contrast(1.15)',['soft-light','#c400ff',.22]], bleach:['saturate(.45) contrast(1.35)',null], noir:['grayscale(1) contrast(1.35) brightness(.95)',null], matrix:['saturate(.7) contrast(1.15)',['soft-light','#29ff6a',.3]], pastel:['saturate(.8) brightness(1.08) contrast(.9)',['soft-light','#ffc8e6',.25]], vivid:['saturate(1.45) contrast(1.1)',null] };
const SFX = { auto:'Sound: automatic', none:'Sound: none', whoosh:'Whoosh', impact:'Impact', hit:'Bass hit', boom:'Deep boom', riser:'Riser', glitch:'Glitch zap', shutter:'Camera shutter', rewind:'Rewind' };
const STYLES = {
  cinematic: { name:'Smooth cinematic', calm:[8, 4], busy:[4, 4, 2], moves:['push','pull','panL','panR','tiltU','crane','arc','focus','float','dutch','drift'], trans:['cut','dissolve','cut','dip','whip','blurx','leak'], curves:['normal','normal','slow','rampIn'], fx:['none','none','none','glow'] },
  mixed:     { name:'Calm verses, fast chorus', calm:[4, 8], busy:[2, 1, 2], moves:['push','pull','panL','panR','dutch','punch','drift','tiltD','shake','arc','snap','crane'], trans:['cut','cut','flash','whip','zoom','glitch','dissolve','push','burn'], curves:['normal','normal','rampIn','slow','rampOut'], fx:['none','none','none','rgb','echo'] },
  energetic: { name:'Fast and energetic', calm:[2, 4], busy:[1, 2, 1], moves:['punch','crash','snap','push','panL','panR','dutch','drift','shake','vertigo'], trans:['cut','flash','whip','zoom','spin','glitch','push','slide','zoomout'], curves:['normal','rampIn','rampOut','normal'], fx:['none','rgb','strobe','none','echo'] },
  velocity:  { name:'Velocity edit (speed ramps)', calm:[4, 2], busy:[2, 2, 1], moves:['punch','crash','snap','shake','dutch','vertigo'], trans:['flash','zoom','whip','glitch','cut','zoomout'], curves:['velocity','velocity','rampIn','rampOut','velocity'], fx:['none','rgb','echo','none'] }
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
    cuts.push({ a: +a.toFixed(3), b: +b.toFixed(3), clip: pick, src: +src.toFixed(3), speed, curve, fx, move, trans, sfx: 'auto', look: 'inherit' });
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
function inTwo(i, t){ const c = F.cuts[i]; return i > 0 && TWO[c.trans] && t - c.a < TWO[c.trans]; }
function sync(t, live){
  const i = cutAt(t); if(i < 0) return; const groups = [[F.cuts[i], sources(F.cuts[i], t)]];
  if(inTwo(i, t)) groups.unshift([F.cuts[i - 1], sources(F.cuts[i - 1], t)]);
  const all = []; groups.forEach(g => g[1].forEach(s => { if(!all.includes(s.el)) all.push(s.el); }));
  F.active.forEach(el => { if(!all.includes(el)) try{ el.pause(); }catch(e){} });
  groups.forEach(([cut, list]) => {
    const v = speedAt(cut, t - cut.a, Math.max(.01, cut.b - cut.a)), smooth = live && v > 0 && cut.curve !== 'reverse';
    list.forEach(({ el, x }) => { const fresh = !F.active.includes(el);
      if(smooth){ try{ el.playbackRate = Math.min(4, Math.max(.0625, v)); }catch(e){}
        if(fresh || Math.abs(el.currentTime - x) > .3) try{ el.currentTime = x; }catch(e){}
        if(el.paused) el.play().catch(() => {}); }
      else { if(!el.paused) el.pause(); if(Math.abs(el.currentTime - x) > (live ? .05 : .03)) try{ el.currentTime = x; }catch(e){} } });
  });
  F.active = all;
  const cc = F.cuts[i]; if(needsMask(cc) && !F._segBusy){ F._segBusy = true; segment(sources(cc, t)[0].el).catch(() => {}).then(() => { F._segBusy = false; }); }
}
function pauseAll(){ F.clips.forEach(c => { try{ c.el && c.el.pause(); }catch(e){} }); F.active = []; }
function seek(v, t, tol){ return new Promise(res => { if(!v || !v.duration){ res(); return; } if(Math.abs(v.currentTime - t) < (tol || 1e-3) && v.readyState >= 2){ res(); return; }
  const done = () => { clearTimeout(to); v.removeEventListener('seeked', done); res(); }; const to = setTimeout(done, 1500); v.addEventListener('seeked', done); v.currentTime = t; }); }
async function prepare(t, fps){ const i = cutAt(t); if(i < 0) return; let list = sources(F.cuts[i], t);
  if(inTwo(i, t)) list = list.concat(sources(F.cuts[i - 1], t).filter(s => !list.some(x => x.el === s.el)));
  F.active.forEach(el => { if(!list.some(s => s.el === el)) try{ el.pause(); }catch(e){} }); F.active = list.map(s => s.el);
  await Promise.all(list.map(({ el, x }) => { try{ el.pause(); }catch(e){} return seek(el, x, fps ? .45 / fps : 0); }));
  const cur = F.cuts[i]; if(needsMask(cur)) try{ await segment(sources(cur, t)[0].el); }catch(e){}
  if(inTwo(i, t) && needsMask(F.cuts[i - 1])) try{ await segment(sources(F.cuts[i - 1], t)[0].el); }catch(e){} }
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

/* ---------- keyframes ---------- */
function kfAt(kf, p){ if(!kf || !kf.length) return { z: 1.1, x: 0, y: 0, r: 0 }; const k = kf.slice().sort((a, b) => a.p - b.p);
  if(p <= k[0].p) return k[0]; if(p >= k[k.length - 1].p) return k[k.length - 1];
  for(let i = 0; i + 1 < k.length; i++){ const a = k[i], b = k[i + 1]; if(p >= a.p && p <= b.p){ const q = ease((p - a.p) / Math.max(1e-3, b.p - a.p)); return { z: a.z + (b.z - a.z) * q, x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q, r: a.r + (b.r - a.r) * q }; } }
  return k[0]; }

/* ---------- stabilise and follow (reads the clip at 10 frames a second) ---------- */
async function readFrames(el, w, onP, each){
  const dur = el.duration || 0, rate = 10, n = Math.max(2, Math.floor(dur * rate)), h = Math.round(w * el.videoHeight / el.videoWidth);
  const c = cnv('ana', w, h), x = c.getContext('2d', { willReadFrequently: true }); const was = el.currentTime; try{ el.pause(); }catch(e){}
  for(let i = 0; i < n; i++){ await seek(el, i / rate); x.drawImage(el, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
    for(let k = 0, j = 0; k < g.length; k++, j += 4) g[k] = d[j] * .3 + d[j + 1] * .59 + d[j + 2] * .11; each(g, w, h, i); onP && onP((i + 1) / n); if(i % 8 === 0) await new Promise(r => setTimeout(r, 0)); }
  try{ el.currentTime = was; }catch(e){} return { rate, n, w, h };
}
function shiftOf(a, b, w, h, R){ let best = 1e18, bx = 0, by = 0; const m = R + 2;
  for(let dy = -R; dy <= R; dy++) for(let dx = -R; dx <= R; dx++){ let sum = 0;
    for(let y = m; y < h - m; y += 2) for(let x = m; x < w - m; x += 2){ const v = a[y * w + x] - b[(y + dy) * w + x + dx]; sum += v < 0 ? -v : v; }
    if(sum < best){ best = sum; bx = dx; by = dy; } }
  return [bx, by]; }
async function stabilise(it, onP){
  let prev = null; const px = [0], py = [0];
  const info = await readFrames(it.el, 96, onP, (g, w, h, i) => { if(prev){ const [dx, dy] = shiftOf(prev, g, w, h, 10); px.push(px[px.length - 1] + dx); py.push(py[py.length - 1] + dy); } prev = g; });
  const sm = a => a.map((_, i) => { let s = 0, c = 0; for(let k = Math.max(0, i - 8); k <= Math.min(a.length - 1, i + 8); k++){ s += a[k]; c++; } return s / c; });
  const sx = sm(px), sy = sm(py);
  const cl = v => Math.max(-.07, Math.min(.07, v)); it.stab = { rate: info.rate, dx: px.map((v, i) => +cl((sx[i] - v) / info.w).toFixed(4)), dy: py.map((v, i) => +cl((sy[i] - v) / info.w).toFixed(4)) };
  return it.stab;
}
async function follow(it, nx, ny, t0, onP){
  const frames = []; const info = await readFrames(it.el, 160, onP, g => { const u = new Uint8Array(g.length); for(let k = 0; k < g.length; k++) u[k] = g[k]; frames.push(u); });
  const { w, h, rate } = info, T = 10, R = 10, n = frames.length, xs = new Array(n), ys = new Array(n);
  const tplAt = (g, tx, ty) => { const t = new Float32Array(4 * T * T); for(let y = -T; y < T; y++) for(let x = -T; x < T; x++){ const yy = Math.min(h - 1, Math.max(0, ty + y)), xx = Math.min(w - 1, Math.max(0, tx + x)); t[(y + T) * 2 * T + x + T] = g[yy * w + xx]; } return t; };
  const step = (g, tpl, tx, ty) => { let best = 1e18, bx = tx, by = ty;
    for(let dy = -R; dy <= R; dy++) for(let dx = -R; dx <= R; dx++){ const cx = tx + dx, cy = ty + dy; if(cx - T < 0 || cy - T < 0 || cx + T >= w || cy + T >= h) continue; let sum = 0;
      for(let y = -T; y < T; y += 2) for(let x = -T; x < T; x += 2){ const v = tpl[(y + T) * 2 * T + x + T] - g[(cy + y) * w + cx + x]; sum += v < 0 ? -v : v; }
      if(sum < best){ best = sum; bx = cx; by = cy; } }
    return [bx, by]; };
  const k0 = Math.min(n - 1, Math.max(0, Math.round(t0 * rate))), sx = Math.round(nx * w), sy = Math.round(ny * h);
  xs[k0] = sx; ys[k0] = sy;
  for(const dir of [1, -1]){ let tx = sx, ty = sy, tpl = tplAt(frames[k0], tx, ty);
    for(let k = k0 + dir; k >= 0 && k < n; k += dir){ [tx, ty] = step(frames[k], tpl, tx, ty); xs[k] = tx; ys[k] = ty;
      const fresh = tplAt(frames[k], tx, ty); for(let q = 0; q < tpl.length; q++) tpl[q] = tpl[q] * .6 + fresh[q] * .4; } }
  const sm = a => a.map((_, i) => { let s = 0, c = 0; for(let k = Math.max(0, i - 4); k <= Math.min(a.length - 1, i + 4); k++){ s += a[k]; c++; } return +(s / c).toFixed(4); });
  it.track = { rate, x: sm(xs.map(v => v / w)), y: sm(ys.map(v => v / h)) }; return it.track;
}
function sampleAt(arr, rate, x){ if(!arr || !arr.length) return 0; const f = Math.min(arr.length - 1, Math.max(0, x * rate)), i = Math.floor(f), k = f - i; return arr[i] + ((arr[i + 1] != null ? arr[i + 1] : arr[i]) - arr[i]) * k; }

/* ---------- background cut-out (MediaPipe selfie segmentation, loaded only when used) ---------- */
const SEG_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/';
let segP = null, segQ = Promise.resolve(); const masks = new Map();
function segmenter(){ if(segP) return segP; segP = new Promise((res, rej) => {
  const go = async () => { try{ const seg = new window.SelfieSegmentation({ locateFile: f => (F.segBase || SEG_URL) + f }); seg.setOptions({ modelSelection: 1, selfieMode: false });
    seg.onResults(r => { const m = r.segmentationMask, job = seg._job; if(!job) return; const c = job.canvas; c.width = m.width; c.height = m.height; const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(m, 0, 0); job.done(); });
    await seg.initialize(); res(seg); }catch(e){ segP = null; rej(e); } };
  if(window.SelfieSegmentation) return go();
  const sc = document.createElement('script'); sc.src = (F.segBase || SEG_URL) + 'selfie_segmentation.js'; sc.crossOrigin = 'anonymous'; sc.onload = go; sc.onerror = () => { segP = null; rej(new Error('Could not load the cut-out tool. Check the internet connection.')); }; document.head.appendChild(sc); });
  return segP; }
/* Works out the mask for the frame the video is showing now. */
function segment(el){ const run = async () => { const seg = await segmenter(); let m = masks.get(el); if(!m){ m = { canvas: document.createElement('canvas'), t: -1 }; masks.set(el, m); }
    if(Math.abs(m.t - el.currentTime) < 1e-3 && m.ok) return m; const t = el.currentTime;
    await new Promise(r => { seg._job = { canvas: m.canvas, done: r }; seg.send({ image: el }).catch(() => r()); setTimeout(r, 4000); }); seg._job = null; m.t = t; m.ok = true; return m; };
  const p = segQ.then(run, run); segQ = p.catch(() => {}); return p; }
function needsMask(cut){ return cut && cut.bgfx && cut.bgfx !== 'none' && F.clips[cut.clip] && F.clips[cut.clip].type !== 'clone'; }

/* Film grain texture, made once. */
let grainTex = null;
function grain(){ if(grainTex) return grainTex; const g = cnv('grain', 256, 256), x = g.getContext('2d'), d = x.createImageData(256, 256); let sd = 7;
  for(let i = 0; i < d.data.length; i += 4){ sd = (sd * 16807) % 2147483647; const v = sd % 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return grainTex = g; }
function tintFill(c, W, H, list){ if(!list) return; for(let k = 0; k < list.length; k += 3){ c.save(); c.globalCompositeOperation = list[k]; c.globalAlpha = list[k + 2]; c.fillStyle = list[k + 1]; c.fillRect(0, 0, W, H); c.restore(); } }
function gradeFilter(){ const g = F.grade || {}; let f = '';
  if(g.exposure) f += 'brightness(' + (1 + g.exposure).toFixed(3) + ') ';
  if(g.contrast) f += 'contrast(' + (1 + g.contrast).toFixed(3) + ') ';
  if(g.saturation) f += 'saturate(' + Math.max(0, 1 + g.saturation).toFixed(3) + ') ';
  return f; }
function gradeOverlay(c, W, H){ const g = F.grade || {};
  if(g.warmth){ c.save(); c.globalCompositeOperation = 'soft-light'; c.globalAlpha = Math.min(.6, Math.abs(g.warmth) * .6); c.fillStyle = g.warmth > 0 ? '#ff8c2a' : '#2a7dff'; c.fillRect(0, 0, W, H); c.restore(); }
  if(g.tint){ c.save(); c.globalCompositeOperation = 'soft-light'; c.globalAlpha = Math.min(.5, Math.abs(g.tint) * .5); c.fillStyle = g.tint > 0 ? '#ff3dd6' : '#36ff6a'; c.fillRect(0, 0, W, H); c.restore(); }
  if(g.fade){ c.save(); c.globalCompositeOperation = 'lighten'; c.globalAlpha = g.fade * .5; c.fillStyle = '#2b2b30'; c.fillRect(0, 0, W, H); c.restore(); }
  if(g.vignette){ const r = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .72); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,' + (g.vignette * .85).toFixed(3) + ')'); c.fillStyle = r; c.fillRect(0, 0, W, H); }
  if(g.grain){ c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = g.grain * .35; const tex = grain(), pat = c.createPattern(tex, 'repeat'), o = Math.floor(performance.now() / 41) % 8; c.translate(-o * 31, -o * 17); c.fillStyle = pat; c.fillRect(0, 0, W + 256, H + 256); c.restore(); }
}

/* Draws one shot (camera move, speed, effect, colour) at time t. */
function shot(c, W, H, i, t, extra){
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const cut = F.cuts[i], cl = cut && F.clips[cut.clip]; if(!cl) return;
  const list = sources(cut, t); if(!list.length) return;
  let img = list[0].el;
  if(cl.type === 'clone'){ img = cloneFrame(cl, list); if(!img) return; }
  else if(!img.videoWidth || img.readyState < 2) return;
  const iw = img.videoWidth || img.width, ih = img.videoHeight || img.height;
  const len = Math.max(.01, cut.b - cut.a), p = Math.min(1, Math.max(0, (t - cut.a) / len)), e = ease(p), since = t - cut.a, kick = beatKick(t);
  let z = 1.12, x = 0, y = 0, rot = 0, blur = (extra && extra.blur) || 0;
  switch(cut.move){
    case 'push': z = 1.06 + .22 * e; break;
    case 'pull': z = 1.3 - .22 * e; break;
    case 'crash': z = 1.04 + .5 * ease(Math.min(1, since / .35)); blur += since < .3 ? Math.round(8 * Math.sin(Math.PI * since / .3)) : 0; break;
    case 'snap': { let lb = cut.a; for(const b of F.beats){ if(b > t) break; if(b >= cut.a) lb = b; } const n = F.beats.filter(b => b >= cut.a && b <= t).length; z = 1.06 + .14 * Math.min(4, n) * (1 - Math.exp(-(t - lb) * 25)) + .14 * Math.max(0, Math.min(4, n) - 1) * Math.exp(-(t - lb) * 25); break; }
    case 'vertigo': z = 1.05 + .45 * e; y = -.15 * e; rot = .01 * Math.sin(t * 2); break;
    case 'panL': z = 1.3; x = .5 - e; break;
    case 'panR': z = 1.3; x = e - .5; break;
    case 'tiltU': z = 1.3; y = .5 - e; break;
    case 'tiltD': z = 1.3; y = e - .5; break;
    case 'crane': z = 1.32 - .16 * e; y = .55 - 1.1 * e; break;
    case 'arc': z = 1.3; x = Math.sin((e - .5) * 2.2) * .9; rot = (e - .5) * 5 * Math.PI / 180; break;
    case 'dutch': z = 1.28 + .05 * e; rot = (-3 + 6 * e) * Math.PI / 180; break;
    case 'focus': z = 1.1 + .05 * e; blur += Math.round(14 * Math.max(0, 1 - since / Math.min(1.2, len * .5))); break;
    case 'float': z = 1.16 + .03 * Math.sin(t * .6); x = .3 * Math.sin(t * .35 + i); y = .25 * Math.sin(t * .5 + i * 2); break;
    case 'punch': z = 1.14 + .22 * Math.exp(-since * 7) + .05 * kick; break;
    case 'shake': z = 1.2 + .04 * kick; x = kick * .35 * Math.sin(t * 91); y = kick * .3 * Math.cos(t * 77); rot = kick * .02 * Math.sin(t * 63); break;
    case 'drift': z = 1.18; x = .25 * Math.sin(t * .9 + i) + .06 * Math.sin(t * 3.1); y = .2 * Math.cos(t * .7 + i) + .05 * Math.sin(t * 2.3); rot = .006 * Math.sin(t * 1.3); break;
    case 'reveal': z = 1.08 + .06 * e; break;
    case 'custom': { const k = kfAt(cut.kf, p); z = k.z; x = k.x; y = k.y; rot = (k.r || 0) * Math.PI / 180; break; }
    default: z = 1.06;
  }
  const own = !extra || !extra.noIn;
  if(own && cut.trans === 'zoom' && since < .28){ const q = since / .28; z *= 1 + .6 * Math.pow(1 - q, 2); blur += Math.round(18 * (1 - q)); }
  if(own && cut.trans === 'spin' && since < .3){ const q = since / .3; rot += (1 - ease(q)) * Math.PI / 2; z *= 1 + .3 * (1 - q); blur += Math.round(14 * (1 - q)); }
  if(extra && extra.z) z *= extra.z;
  if(cl.stabOn && cl.stab && z < 1.14) z = 1.14;
  const s = Math.max(W / iw, H / ih) * z, dw = iw * s, dh = ih * s, sx = Math.max(0, (dw - W) / 2), sy = Math.max(0, (dh - H) / 2);
  const lx = list[0].x; let fxk = cl.frameX != null ? cl.frameX : .5, fyk = cl.frameY != null ? cl.frameY : .5;
  let ox = x * sx * 1.6 + (.5 - fxk) * 2 * sx, oy = y * sy * 1.6 + (.5 - fyk) * 2 * sy;
  if(cl.followOn && cl.track && cut.follow !== false){ ox = x * sx * .6 + (.5 - sampleAt(cl.track.x, cl.track.rate, lx)) * dw; oy = y * sy * .6 + (.45 - sampleAt(cl.track.y, cl.track.rate, lx)) * dh; }
  if(cl.stabOn && cl.stab){ ox += sampleAt(cl.stab.dx, cl.stab.rate, lx) * dw; oy += sampleAt(cl.stab.dy, cl.stab.rate, lx) * dw; }
  if(own && cut.trans === 'whip' && since < .24){ const q = since / .24; ox += W * .55 * Math.pow(1 - q, 3); blur += Math.round(26 * (1 - q)); }
  if(!(own && cut.trans === 'whip' && since < .24)){ ox = Math.max(-sx, Math.min(sx, ox)); oy = Math.max(-sy, Math.min(sy, oy)); }
  const fx = cut.fx || 'none', lk = LOOKF[cut.look && cut.look !== 'inherit' ? cut.look : (F.look || 'none')] || LOOKF.none;
  const paint = (cc, dx, dy, extraF, alpha) => { cc.save(); let f = gradeFilter() + lk[0] + ' '; if(blur) f += 'blur(' + blur + 'px) '; if(fx === 'bw') f += 'grayscale(1) contrast(1.15) '; if(extraF) f += extraF;
    f = f.trim(); if(f && 'filter' in cc) cc.filter = f; if(alpha != null) cc.globalAlpha = alpha;
    cc.translate(W / 2 + ox + (dx || 0), H / 2 + oy + (dy || 0)); if(rot) cc.rotate(rot); cc.drawImage(img, -dw / 2, -dh / 2, dw, dh); cc.restore(); };
  const split = fx === 'rgb' || fx === 'chroma' || fx === 'vhs' || (own && cut.trans === 'glitch' && since < .22);
  if(split){
    const amt = fx === 'rgb' ? 6 + 22 * kick : fx === 'chroma' ? 4 : fx === 'vhs' ? 5 + 3 * Math.sin(t * 7) : 30 * (1 - since / .22), base = cnv('fxbase', W, H), bc = base.getContext('2d');
    bc.globalCompositeOperation = 'source-over'; bc.fillStyle = '#000'; bc.fillRect(0, 0, W, H); paint(bc, 0, 0, fx === 'vhs' ? 'saturate(1.35) contrast(1.1)' : '');
    const ch = (name, col) => { const l = cnv(name, W, H), lc = l.getContext('2d'); lc.globalCompositeOperation = 'source-over'; lc.drawImage(base, 0, 0); lc.globalCompositeOperation = 'multiply'; lc.fillStyle = col; lc.fillRect(0, 0, W, H); lc.globalCompositeOperation = 'source-over'; return l; };
    const r = ch('fxr', '#f00'), g = ch('fxg', '#0f0'), b = ch('fxb', '#00f');
    c.save(); c.globalCompositeOperation = 'lighter'; c.drawImage(r, amt, 0); c.drawImage(g, 0, 0); c.drawImage(b, -amt, 0); c.restore();
    if(own && cut.trans === 'glitch' && since < .22){ for(let k = 0; k < 7; k++){ const yy = Math.floor(rnd(k + Math.floor(since * 40)) * H), hh = 8 + rnd(k * 3.3) * H * .06, dx = (rnd(k * 7.1 + since) - .5) * W * .12; c.drawImage(base, 0, yy, W, hh, dx, yy, W, hh); } }
    if(fx === 'vhs'){ c.save(); c.globalAlpha = .18; c.fillStyle = '#000'; for(let yy = 0; yy < H; yy += 4) c.fillRect(0, yy, W, 2); c.restore();
      const band = ((t * .23) % 1) * H; c.save(); c.globalAlpha = .25; c.drawImage(base, 0, band, W, H * .04, 12, band, W, H * .04); c.restore(); }
  } else if(fx === 'echo'){
    const tr = cnv('trail', W, H), tc = tr.getContext('2d'); if(F._trailCut !== i){ tc.fillStyle = '#000'; tc.fillRect(0, 0, W, H); F._trailCut = i; }
    tc.globalAlpha = .38; paint(tc); tc.globalAlpha = 1; c.drawImage(tr, 0, 0);
  } else if(needsMask(cut) && masks.get(img) && masks.get(img).ok){
    const m = masks.get(img).canvas, bgm = cut.bgfx, P = cnv('person', W, H), pc = P.getContext('2d');
    pc.globalCompositeOperation = 'source-over'; pc.clearRect(0, 0, W, H); paint(pc);
    const M = cnv('pmask', W, H), mc = M.getContext('2d'); mc.clearRect(0, 0, W, H); mc.save(); if('filter' in mc) mc.filter = 'blur(2px)'; mc.translate(W / 2 + ox, H / 2 + oy); if(rot) mc.rotate(rot); mc.drawImage(m, -dw / 2, -dh / 2, dw, dh); mc.restore();
    pc.globalCompositeOperation = 'destination-in'; pc.drawImage(M, 0, 0); pc.globalCompositeOperation = 'source-over';
    if(bgm === 'blur') paint(c, 0, 0, 'blur(' + Math.round(W / 60) + 'px)');
    else if(bgm === 'pop') paint(c, 0, 0, 'grayscale(1) contrast(1.1)');
    else if(bgm === 'dark') paint(c, 0, 0, 'brightness(.22) saturate(.6)');
    else if(bgm === 'studio'){ const g = c.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .7); g.addColorStop(0, '#5a5f73'); g.addColorStop(1, '#0c0d12'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    else paint(c, 0, 0, 'brightness(.35)');
    if(bgm === 'outline'){ const O = cnv('pout', W, H), oc = O.getContext('2d'); oc.clearRect(0, 0, W, H); oc.drawImage(M, 0, 0); oc.globalCompositeOperation = 'source-in'; oc.fillStyle = F.outline || '#36e2ff'; oc.fillRect(0, 0, W, H); oc.globalCompositeOperation = 'source-over';
      c.save(); if('filter' in c) c.filter = 'blur(' + Math.round(W / 70) + 'px)'; c.globalCompositeOperation = 'lighter'; c.drawImage(O, 0, 0); c.drawImage(O, 0, 0); c.restore(); }
    c.drawImage(P, 0, 0);
  } else paint(c);
  tintFill(c, W, H, lk[1]);
  if(fx === 'mirror'){ c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(c.canvas, 0, 0, W / 2, H, 0, 0, W / 2, H); c.restore(); }
  if(fx === 'prism'){ paint(c, W * .025, 0, 'hue-rotate(90deg)', .28); paint(c, -W * .025, 0, 'hue-rotate(-90deg)', .22); }
  if(fx === 'glow' || fx === 'halation'){ const gl = cnv('glow', W >> 2, H >> 2), gc = gl.getContext('2d'); gc.drawImage(c.canvas, 0, 0, gl.width, gl.height); c.save(); if('filter' in c) c.filter = 'blur(6px)' + (fx === 'halation' ? ' sepia(1) saturate(4) hue-rotate(-25deg)' : ''); c.globalCompositeOperation = 'screen'; c.globalAlpha = fx === 'halation' ? .45 : .55; c.drawImage(gl, 0, 0, W, H); c.restore(); }
  if(fx === 'leaks'){ c.save(); c.globalCompositeOperation = 'screen'; for(let k = 0; k < 2; k++){ const cx = W * (.5 + .55 * Math.sin(t * .4 + k * 2.4)), cy = H * (.3 + .4 * Math.cos(t * .3 + k)), r = Math.max(W, H) * .55, g = c.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, k ? 'rgba(255,80,40,.55)' : 'rgba(255,190,60,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); } c.restore(); }
  if(fx === 'flare'){ const fx0 = W * (.2 + .6 * e), fy0 = H * .22; c.save(); c.globalCompositeOperation = 'screen'; let g = c.createRadialGradient(fx0, fy0, 0, fx0, fy0, W * .35); g.addColorStop(0, 'rgba(255,240,200,.85)'); g.addColorStop(.2, 'rgba(255,170,80,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createLinearGradient(0, fy0 - 3, 0, fy0 + 3); c.globalAlpha = .55; c.fillStyle = 'rgba(120,180,255,.8)'; c.fillRect(0, fy0 - 2, W, 4);
    [.4, .7, 1.1].forEach((k, j) => { const gx = fx0 + (W / 2 - fx0) * k * 2, gy = fy0 + (H / 2 - fy0) * k * 2, rr = W * (.03 + .02 * j); const gg = c.createRadialGradient(gx, gy, 0, gx, gy, rr); gg.addColorStop(0, 'rgba(160,255,200,.35)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(gx - rr, gy - rr, rr * 2, rr * 2); }); c.restore(); }
  if(fx === 'grain'){ c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = .45; const pat = c.createPattern(grain(), 'repeat'), o = Math.floor(t * 24) % 8; c.translate(-o * 31, -o * 17); c.fillStyle = pat; c.fillRect(0, 0, W + 256, H + 256); c.restore(); }
  if(fx === 'strobe' && kick > .55){ c.fillStyle = 'rgba(255,255,255,' + ((kick - .55) * 1.2).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  if(cut.move === 'reveal'){ const bar = H * .5 * (1 - ease(Math.min(1, since / Math.min(1.5, len * .6)))) + H * .1 * ease(Math.min(1, since / Math.min(1.5, len * .6))); c.fillStyle = '#000'; c.fillRect(0, 0, W, bar * (W > H ? 1 : .35)); c.fillRect(0, H - bar * (W > H ? 1 : .35), W, bar * (W > H ? 1 : .35)); }
  if(cut.curve === 'freeze' && p >= .55 && p < .62){ c.fillStyle = 'rgba(255,255,255,' + (.7 * (1 - (p - .55) / .07)).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
}

function draw(c, W, H, t, lv){
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const i = cutAt(t); if(i < 0) return; const cut = F.cuts[i]; if(!F.clips[cut.clip]) return;
  const since = t - cut.a, d = TWO[cut.trans];
  if(i > 0 && d && since < d){
    const q = ease(Math.min(1, since / d)), A = cnv('shotA', W, H), B = cnv('shotB', W, H);
    shot(A.getContext('2d'), W, H, i - 1, t, { noIn: true, blur: cut.trans === 'blurx' ? Math.round(20 * q) : 0, z: cut.trans === 'zoomout' ? 1 + .4 * q : 1 });
    shot(B.getContext('2d'), W, H, i, t, { blur: cut.trans === 'blurx' ? Math.round(20 * (1 - q)) : 0, z: cut.trans === 'zoomout' ? 1.4 - .4 * q : 1 });
    if(cut.trans === 'push'){ c.drawImage(A, -W * q, 0); c.drawImage(B, W * (1 - q), 0); }
    else if(cut.trans === 'slide'){ c.drawImage(A, 0, 0); c.drawImage(B, 0, H * (1 - q)); }
    else { c.drawImage(A, 0, 0); c.save(); c.globalAlpha = q; c.drawImage(B, 0, 0); c.restore(); }
    if(cut.trans === 'burn' || cut.trans === 'leak'){ const k = Math.sin(Math.PI * Math.min(1, since / d)); c.save(); c.globalCompositeOperation = cut.trans === 'burn' ? 'lighter' : 'screen';
      const cx = W * (cut.trans === 'burn' ? .8 : .2), cy = H * .3, g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * (.4 + .8 * k));
      g.addColorStop(0, cut.trans === 'burn' ? 'rgba(255,255,230,' + (.95 * k) + ')' : 'rgba(255,200,80,' + (.8 * k) + ')'); g.addColorStop(.35, cut.trans === 'burn' ? 'rgba(255,120,20,' + (.8 * k) + ')' : 'rgba(255,60,120,' + (.5 * k) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }
  } else shot(c, W, H, i, t);
  gradeOverlay(c, W, H);
  const next = F.cuts[i + 1]; if(next && next.trans === 'dip' && next.a - t < .25){ c.fillStyle = 'rgba(0,0,0,' + (1 - (next.a - t) / .25).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  if(cut.trans === 'dip' && since < .35){ c.fillStyle = 'rgba(0,0,0,' + (1 - since / .35).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  if(cut.trans === 'flash' && since < .16){ c.fillStyle = 'rgba(255,255,255,' + (.85 * (1 - since / .16)).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(0, 0, W, H);
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
function autoSfx(cut, prev){ if(['whip','zoom','spin','push','slide','zoomout'].includes(cut.trans)) return 'whoosh'; if(cut.move === 'crash') return 'impact'; if(cut.trans === 'burn') return 'riser'; if(cut.trans === 'flash') return 'impact'; if(cut.trans === 'glitch') return 'glitch';
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
/* Audio tracks (voice-over, extra sounds): gain at time t of the song, with fades. */
function trackGain(tr, t){ const u = t - tr.start, d = tr.dur || 0; if(u < 0 || u > d) return 0; let g = tr.vol != null ? tr.vol : 1;
  if(tr.fadeIn && u < tr.fadeIn) g *= u / tr.fadeIn; if(tr.fadeOut && d - u < tr.fadeOut) g *= (d - u) / tr.fadeOut; return g; }
function duckAt(t){ return (F.tracks || []).some(tr => tr.duck && trackGain(tr, t) > 0) ? .45 : 1; }
async function decodeTracks(sr){ for(const tr of (F.tracks || [])){ tr._b = tr._b || {}; if(!tr._b[sr]) tr._b[sr] = await new OfflineAudioContext(2, sr, sr).decodeAudioData(await tr.blob.arrayBuffer()); tr.dur = tr._b[sr].duration; } }
function mixInto(buf, an){
  const ev = sfxEvents(an), tracks = (F.tracks || []).filter(tr => tr._b && tr._b[buf.sampleRate]), songVol = F.songVol != null ? F.songVol : 1;
  if(!ev.length && !tracks.length && songVol === 1) return buf;
  const sr = buf.sampleRate, out = new AudioBuffer({ length: buf.length, numberOfChannels: buf.numberOfChannels, sampleRate: sr }), g = F.sfxVol * .5;
  const duck = tracks.some(tr => tr.duck) ? new Float32Array(Math.ceil(buf.length / 480) + 1).map((_, k) => duckAt(k * 480 / sr)) : null;
  for(let ch = 0; ch < buf.numberOfChannels; ch++){ const d = buf.getChannelData(ch).slice();
    if(songVol !== 1 || duck) for(let i = 0; i < d.length; i++) d[i] *= songVol * (duck ? duck[Math.floor(i / 480)] : 1);
    for(const tr of tracks){ const b = tr._b[sr], src = b.getChannelData(Math.min(ch, b.numberOfChannels - 1)), o0 = Math.floor(tr.start * sr);
      for(let i = 0; i < src.length; i++){ const j = o0 + i; if(j < 0) continue; if(j >= d.length) break; d[j] += src[i] * trackGain(tr, tr.start + i / sr); } }
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
window.FILM = { cloneStill, LOOKS, BGFX, MOVES, kfAt, stabilise, follow, segmenter, segment, decodeTracks, trackGain, duckAt, TRANS, CURVES, FX, SFX, STYLES, TIPS, analyze, findOffset, build, shotList, F, cutAt, sync, pauseAll, prepare, draw, mixInto, sfxBetween, sfxBuffer, sfxData, resetSfx };
})();
