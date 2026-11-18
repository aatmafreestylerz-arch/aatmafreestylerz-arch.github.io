/* Lyric Studio film editor: turns your own camera footage into a music video.
   Finds the beat of the song, lines up clips where you sing along, cuts on the beat,
   and adds camera moves (push-in, pans, tilts, dutch roll, beat punch) and transitions.
   The edit is drawn as a background layer, so lyrics, colour grades and effects go on top. */
(function(){
const MOVES = { push:'Slow push-in', pull:'Pull back', panL:'Pan left', panR:'Pan right', tiltU:'Tilt up', tiltD:'Tilt down', dutch:'Dutch roll', punch:'Beat punch', drift:'Handheld', still:'Locked off' };
const TRANS = { cut:'Cut', flash:'Flash', whip:'Whip pan', dip:'Dip to black' };
const STYLES = {
  cinematic: { name:'Smooth cinematic', calm:[8, 4], busy:[4, 4, 2], moves:['push','pull','panL','panR','tiltU','dutch','drift','push'], trans:['cut','cut','dip','whip'] },
  mixed:     { name:'Calm verses, fast chorus', calm:[4, 8], busy:[2, 1, 2], moves:['push','pull','panL','panR','dutch','punch','drift','tiltD'], trans:['cut','cut','flash','whip'] },
  energetic: { name:'Fast and energetic', calm:[2, 4], busy:[1, 2, 1], moves:['punch','push','panL','panR','dutch','drift','punch'], trans:['cut','flash','whip','cut'] }
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
    const cl = o.clips[pick]; let src, speed = 1;
    if(cl.perf && cl.off != null && perf.includes(pick)) src = a - cl.off;
    else { speed = o.slow && !cl.perf ? .5 : 1; const need = len * speed;
      if(cursors[pick] + need > cl.dur) cursors[pick] = 0; src = cursors[pick]; cursors[pick] += need + .3; }
    let move = st.moves[Math.floor(rnd(o.seed + c * 2.9) * st.moves.length)]; if(move === prevMove) move = st.moves[(st.moves.indexOf(move) + 1) % st.moves.length];
    const trans = c === 0 ? 'dip' : st.trans[Math.floor(rnd(o.seed + c * 4.1) * st.trans.length)];
    cuts.push({ a: +a.toFixed(3), b: +b.toFixed(3), clip: pick, src: +src.toFixed(3), speed, move, trans });
    prevClip = pick; prevMove = move;
  }
  return cuts;
}

/* ---------- playing and drawing ---------- */
const F = { clips: [], cuts: [], beats: [], active: null, onFrame: null };
function cutAt(t){ const c = F.cuts; let lo = 0, hi = c.length - 1; if(!c.length) return -1; if(t < c[0].a) return 0;
  while(lo < hi){ const m = (lo + hi + 1) >> 1; if(c[m].a <= t) lo = m; else hi = m - 1; } return lo; }
function localAt(cut, t){ const el = F.clips[cut.clip] && F.clips[cut.clip].el, d = el && el.duration || 0; let x = cut.src + (t - cut.a) * cut.speed; if(d) x = ((x % d) + d) % d; return x; }
function sync(t, live){
  const i = cutAt(t); if(i < 0) return; const cut = F.cuts[i], cl = F.clips[cut.clip]; if(!cl) return; const el = cl.el, x = localAt(cut, t);
  if(F.active !== el){ try{ F.active && F.active.pause(); }catch(e){} F.active = el; try{ el.currentTime = x; }catch(e){} }
  el.playbackRate = cut.speed;
  if(live){ if(el.paused) el.play().catch(() => {}); if(Math.abs(el.currentTime - x) > .3) try{ el.currentTime = x; }catch(e){} }
  else { if(!el.paused) el.pause(); if(Math.abs(el.currentTime - x) > .03) try{ el.currentTime = x; }catch(e){} }
}
function pauseAll(){ F.clips.forEach(c => { try{ c.el.pause(); }catch(e){} }); F.active = null; }
function seek(v, t){ return new Promise(res => { if(!v || !v.duration){ res(); return; } if(Math.abs(v.currentTime - t) < 1e-3 && v.readyState >= 2){ res(); return; }
  const done = () => { clearTimeout(to); v.removeEventListener('seeked', done); res(); }; const to = setTimeout(done, 1500); v.addEventListener('seeked', done); v.currentTime = t; }); }
async function prepare(t){ const i = cutAt(t); if(i < 0) return; const cut = F.cuts[i], cl = F.clips[cut.clip]; if(!cl) return; F.active = cl.el; try{ cl.el.pause(); }catch(e){} await seek(cl.el, localAt(cut, t)); }
function beatKick(t){ let k = 0; for(const b of F.beats){ if(b > t) break; const d = t - b; if(d < .3) k = Math.max(k, Math.exp(-d * 12)); } return k; }

function draw(c, W, H, t, lv){
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const i = cutAt(t); if(i < 0) return; const cut = F.cuts[i], cl = F.clips[cut.clip]; if(!cl) return;
  const el = cl.el, iw = el.videoWidth, ih = el.videoHeight; if(!iw || !ih || el.readyState < 2) return;
  const len = Math.max(.01, cut.b - cut.a), p = Math.min(1, Math.max(0, (t - cut.a) / len)), e = ease(p), since = t - cut.a;
  let z = 1.12, x = 0, y = 0, rot = 0;
  switch(cut.move){
    case 'push': z = 1.06 + .22 * e; break;
    case 'pull': z = 1.3 - .22 * e; break;
    case 'panL': z = 1.3; x = .5 - e; break;
    case 'panR': z = 1.3; x = e - .5; break;
    case 'tiltU': z = 1.3; y = .5 - e; break;
    case 'tiltD': z = 1.3; y = e - .5; break;
    case 'dutch': z = 1.28 + .05 * e; rot = (-3 + 6 * e) * Math.PI / 180; break;
    case 'punch': z = 1.14 + .22 * Math.exp(-since * 7) + .05 * beatKick(t); break;
    case 'drift': z = 1.18; x = .25 * Math.sin(t * .9 + i) + .06 * Math.sin(t * 3.1); y = .2 * Math.cos(t * .7 + i) + .05 * Math.sin(t * 2.3); rot = .006 * Math.sin(t * 1.3); break;
    default: z = 1.06;
  }
  const s = Math.max(W / iw, H / ih) * z, dw = iw * s, dh = ih * s, sx = Math.max(0, (dw - W) / 2), sy = Math.max(0, (dh - H) / 2);
  let ox = x * sx * 1.6, oy = y * sy * 1.6, blur = 0;
  if(cut.trans === 'whip' && since < .24){ const q = since / .24; ox += W * .55 * Math.pow(1 - q, 3); blur = Math.round(26 * (1 - q)); }
  ox = Math.max(-sx, Math.min(sx, ox)); oy = Math.max(-sy, Math.min(sy, oy));
  c.save(); if(blur && 'filter' in c) c.filter = 'blur(' + blur + 'px)';
  c.translate(W / 2 + ox, H / 2 + oy); if(rot) c.rotate(rot); c.drawImage(el, -dw / 2, -dh / 2, dw, dh); c.restore();
  const next = F.cuts[i + 1]; if(next && next.trans === 'dip' && next.a - t < .25){ c.fillStyle = 'rgba(0,0,0,' + (1 - (next.a - t) / .25).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  if(cut.trans === 'dip' && since < .35){ c.fillStyle = 'rgba(0,0,0,' + (1 - since / .35).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  if(cut.trans === 'flash' && since < .16){ c.fillStyle = 'rgba(255,255,255,' + (.85 * (1 - since / .16)).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, 0, W, H);
}

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
  'Hold each B-roll shot still for a second at the start and end. Golden hour, night streets and neon look the most cinematic.'
];

window.FILM = { MOVES, TRANS, STYLES, TIPS, analyze, findOffset, build, shotList, F, cutAt, sync, pauseAll, prepare, draw };
})();
