/* Lyric Studio export: renders the video frame by frame (not in real time), so any size and
   frame rate comes out smooth. Uses the browser's own video encoder (WebCodecs) and mp4-muxer. */
(function(){
const SHORT = { '720':720, '1080':1080, '1440':1440, '2160':2160 };
const RATE = { '720':[6, 9], '1080':[12, 18], '1440':[20, 30], '2160':[40, 60] };   // Mbps at 30 / 60 fps

function dims(w, h, q){ const s = SHORT[q] / Math.min(w, h); return [Math.round(w * s / 2) * 2, Math.round(h * s / 2) * 2]; }
function bitrate(q, fps){ return RATE[q][fps >= 50 ? 1 : 0] * 1e6; }
function supported(){ return typeof VideoEncoder === 'function' && typeof AudioEncoder === 'function' && typeof VideoFrame === 'function' && !!window.Mp4Muxer; }

function avcCodecs(W, H, fps){
  const L = [['1f', 3.1, 27648000, 921600], ['28', 4.0, 62914560, 2228224], ['2a', 4.2, 133693440, 2228224],
             ['32', 5.0, 150994944, 5652480], ['33', 5.1, 251658240, 9437184], ['34', 5.2, 530841600, 9437184]];
  const out = [];
  L.forEach(([hex, , rate, fs]) => { if(W * H <= fs && W * H * fps <= rate) out.push('avc1.6400' + hex, 'avc1.4d00' + hex, 'avc1.4200' + hex); });
  return out;
}
/* Every encoder setting this device accepts, best first. Hardware first, then software, then VP9. */
const withTimeout = (p, ms, v) => Promise.race([p, new Promise(r => setTimeout(() => r(v), ms))]);
async function videoOptions(W, H, fps, br, max){
  const out = [], seen = new Set();
  const tryCfg = async (cfg, mux) => {
    if(out.length >= (max || 4)) return;
    try{ const r = await withTimeout(VideoEncoder.isConfigSupported(cfg), 2500, { supported: false });
      if(r && r.supported){ const k = cfg.codec + cfg.hardwareAcceleration; if(!seen.has(k)){ seen.add(k); out.push({ cfg: Object.assign({}, cfg, r.config || {}), mux }); } } }catch(e){}
  };
  const avc = avcCodecs(W, H, fps).filter((c, i, a) => a.indexOf(c) === i);
  for(const hw of ['prefer-hardware', 'prefer-software']){
    for(const codec of avc){ const n = out.length; await tryCfg({ codec, width: W, height: H, bitrate: br, framerate: fps, hardwareAcceleration: hw, avc: { format: 'avc' } }, 'avc'); if(out.length > n) break; }
  }
  for(const codec of ['vp09.00.51.08', 'vp09.00.41.08', 'vp09.00.31.08']){ const n = out.length; await tryCfg({ codec, width: W, height: H, bitrate: br, framerate: fps, hardwareAcceleration: 'no-preference' }, 'vp9'); if(out.length > n) break; }
  return out;
}
async function pickVideo(W, H, fps, br){ const o = await videoOptions(W, H, fps, br, 1); return o[0] || null; }
async function pickAudio(sr, ch){
  for(const [codec, mux] of [['mp4a.40.2', 'aac'], ['opus', 'opus']]){
    const cfg = { codec, sampleRate: sr, numberOfChannels: ch, bitrate: 192000 };
    try{ const r = await AudioEncoder.isConfigSupported(cfg); if(r.supported) return { cfg: Object.assign({}, cfg, r.config || {}), mux }; }catch(e){}
  }
  return null;
}
/* What this device can do, for the quality menu. Remembered, so the menu opens instantly next time. */
async function capabilities(w, h, onPart){
  const out = {};
  if(!supported()) return out;
  const key = 'ls.caps.' + w + 'x' + h; try{ const c = JSON.parse(localStorage.getItem(key) || 'null'); if(c) return c; }catch(e){}
  for(const k of ['1080@30', '720@30', '1080@60', '720@60', '1440@30', '2160@30', '1440@60', '2160@60']){
    const [q, f] = k.split('@'), [W, H] = dims(w, h, q); out[k] = !!(await pickVideo(W, H, +f, bitrate(q, +f)));
    onPart && onPart(Object.assign({}, out));
  }
  try{ localStorage.setItem(key, JSON.stringify(out)); }catch(e){}
  return out;
}

/* Frequency levels at time t, close to what the live preview's analyser gives (128 bins, 0-255). */
const N = 256, WIN = new Float32Array(N); for(let i = 0; i < N; i++) WIN[i] = .42 - .5 * Math.cos(2 * Math.PI * i / N) + .08 * Math.cos(4 * Math.PI * i / N);
const re = new Float32Array(N), im = new Float32Array(N), SPEC = new Uint8Array(N / 2);
function fft(){ for(let i = 1, j = 0; i < N; i++){ let bit = N >> 1; for(; j & bit; bit >>= 1) j ^= bit; j ^= bit; if(i < j){ [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for(let len = 2; len <= N; len <<= 1){ const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for(let i = 0; i < N; i += len){ let cr = 1, ci = 0; for(let k = 0; k < len / 2; k++){ const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } }
function spectrumAt(mono, sr, t){
  const start = Math.floor(t * sr) - N;
  for(let i = 0; i < N; i++){ const k = start + i; re[i] = (k >= 0 && k < mono.length ? mono[k] : 0) * WIN[i]; im[i] = 0; }
  fft();
  for(let k = 0; k < N / 2; k++){ const mag = Math.hypot(re[k], im[k]) / N, db = 20 * Math.log10(mag + 1e-12); SPEC[k] = Math.max(0, Math.min(255, Math.round((db + 100) / 70 * 255))); }
  let s = 0; for(let i = 0; i < 12; i++) s += SPEC[i];
  return { spec: SPEC, level: s / (12 * 255) };
}

/* Render. o = { file, W, H, fps, q, draw(ctx, W, H, t, lv, spec), prepare(t) -> Promise, preview(canvas), onProgress(done, total, eta), signal } */
async function render(o){
  const { W, H, fps } = o, br = bitrate(o.q, fps);
  const opts = await videoOptions(W, H, fps, br, 4);
  if(!opts.length) throw new Error('This device can\'t make ' + o.q + 'p at ' + fps + ' fps. Pick a lower quality.');
  let last = null;
  for(let k = 0; k < opts.length; k++){
    try{ return await renderWith(o, opts[k]); }
    catch(e){ if(e && e.name === 'AbortError') throw e; last = e; o.onRetry && o.onRetry(k + 1, opts.length, e); }
  }
  throw last;
}
async function renderWith(o, vpick){
  const { W, H, fps } = o;
  const octx = new OfflineAudioContext(2, 48000, 48000);
  let audio = await octx.decodeAudioData(await o.file.arrayBuffer());
  if(o.mixAudio){ try{ audio = (await o.mixAudio(audio)) || audio; }catch(e){} }
  const sr = audio.sampleRate, ch = Math.min(2, audio.numberOfChannels), dur = audio.duration;
  const apick = await pickAudio(sr, ch);
  const mono = new Float32Array(audio.length); for(let c = 0; c < audio.numberOfChannels; c++){ const d = audio.getChannelData(c); for(let i = 0; i < d.length; i++) mono[i] += d[i] / audio.numberOfChannels; }

  const parts = []; let pos = 0, odd = [];
  const target = new Mp4Muxer.StreamTarget({ onData: (data, p) => { const b = new Blob([data.slice()]); if(p === pos){ parts.push(b); pos += data.byteLength; } else odd.push([p, data.slice()]); } });
  const muxer = new Mp4Muxer.Muxer({ target, fastStart: 'fragmented', firstTimestampBehavior: 'offset',
    video: { codec: vpick.mux, width: W, height: H, frameRate: fps },
    audio: apick ? { codec: apick.mux, numberOfChannels: ch, sampleRate: sr } : undefined });
  let encErr = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { encErr = e; } });
  venc.configure(vpick.cfg);
  if(venc.state !== 'configured') throw new Error('The video encoder would not start');
  let aenc = null;
  if(apick){ aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { encErr = e; } }); aenc.configure(apick.cfg); }

  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const total = Math.ceil(dur * fps), t0 = performance.now(); let aDone = 0;
  const AF = 2048;
  const pushAudioUntil = upto => {
    if(!aenc) return; const end = Math.min(audio.length, Math.floor(upto * sr));
    while(aDone < end){ const n = Math.min(AF, audio.length - aDone), buf = new Float32Array(n * ch);
      for(let c = 0; c < ch; c++) buf.set(audio.getChannelData(c).subarray(aDone, aDone + n), c * n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round(aDone / sr * 1e6), data: buf });
      aenc.encode(ad); ad.close(); aDone += n; }
  };
  try{
    for(let i = 0; i < total; i++){
      if(o.signal && o.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if(encErr) throw encErr;
      const t = i / fps;
      pushAudioUntil(t + 1);
      if(o.prepare) await o.prepare(t);
      const a = spectrumAt(mono, sr, t);
      o.draw(ctx, W, H, t, a.level, a.spec);
      const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      venc.encode(vf, { keyFrame: i % (fps * 2) === 0 }); vf.close();
      let waited = 0; while(venc.encodeQueueSize > 10){ if(encErr) throw encErr; if(waited++ > 5000) throw new Error('The video encoder stopped responding'); await new Promise(r => setTimeout(r, 2)); }
      if(i % 6 === 0){
        const el = (performance.now() - t0) / 1000, eta = i ? el / i * (total - i) : 0;
        o.onProgress && o.onProgress(i, total, eta);
        if(o.preview && i % 12 === 0) o.preview(cv);
        await new Promise(r => setTimeout(r, 0));
      }
    }
    pushAudioUntil(dur + 1);
    await venc.flush(); if(aenc) await aenc.flush();
    if(encErr) throw encErr;
    if(!parts.length && !odd.length) throw new Error('The encoder produced no video');
    muxer.finalize();
  }finally{
    try{ venc.close(); }catch(e){} try{ aenc && aenc.close(); }catch(e){}
  }
  if(odd.length){   // rare: muxer wrote out of order, rebuild in memory
    const whole = new Uint8Array(await new Blob(parts).arrayBuffer()); let size = whole.length; odd.forEach(([p, d]) => { size = Math.max(size, p + d.length); });
    const out = new Uint8Array(size); out.set(whole); odd.forEach(([p, d]) => out.set(d, p));
    return new Blob([out], { type: 'video/mp4' });
  }
  return new Blob(parts, { type: 'video/mp4' });
}

window.EXPORT = { SHORT, dims, bitrate, supported, capabilities, render };
})();
