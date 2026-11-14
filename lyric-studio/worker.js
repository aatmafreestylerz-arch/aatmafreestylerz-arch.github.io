// Runs speech-to-text on the phone itself. The song never leaves the device.
// The song is cut into 30-second pieces so the page can show real progress
// and keep what was found if you stop early.
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';

const loaded = {};
const sizes = {};
let stopFlag = false;

self.onmessage = async (e) => {
  if (e.data && e.data.type === 'stop') { stopFlag = true; return; }
  const { audio, language, model } = e.data;
  stopFlag = false;
  try {
    const threads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)) : 1;
    try { env.backends.onnx.wasm.numThreads = threads; } catch (_) {}
    const id = model === 'small' ? 'Xenova/whisper-small' : 'Xenova/whisper-base';
    if (!loaded[id]) {
      loaded[id] = await pipeline('automatic-speech-recognition', id, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: (p) => {
          if (!p || !p.file || typeof p.loaded !== 'number' || !p.total) return;
          sizes[p.file] = [p.loaded, p.total];
          let a = 0, b = 0;
          for (const k in sizes) { a += sizes[k][0]; b += sizes[k][1]; }
          self.postMessage({ type: 'download', pct: b ? Math.round((a / b) * 100) : 0 });
        },
      });
    }
    const pipe = loaded[id];
    const SR = 16000, SEG = 30 * SR;
    const n = Math.max(1, Math.ceil(audio.length / SEG));
    self.postMessage({ type: 'start', n, threads });
    const all = [];
    for (let i = 0; i < n; i++) {
      if (stopFlag) break;
      const t0 = Date.now();
      const seg = audio.subarray(i * SEG, Math.min(audio.length, (i + 1) * SEG));
      const off = i * 30, segLen = seg.length / SR;
      const opts = { return_timestamps: true, task: 'transcribe' };
      if (language && language !== 'auto') opts.language = language;
      const out = await pipe(seg, opts);
      const chunks = ((out && out.chunks) || []).map((c) => {
        const a = c.timestamp && typeof c.timestamp[0] === 'number' ? c.timestamp[0] : 0;
        const b = c.timestamp && typeof c.timestamp[1] === 'number' ? c.timestamp[1] : segLen;
        return { text: c.text, timestamp: [off + Math.min(a, segLen), off + Math.min(Math.max(b, a), segLen)] };
      });
      if (!chunks.length && out && out.text && out.text.trim()) chunks.push({ text: out.text, timestamp: [off, off + segLen] });
      all.push(...chunks);
      self.postMessage({ type: 'piece', i: i + 1, n, chunks, ms: Date.now() - t0 });
    }
    self.postMessage({ type: 'done', chunks: all, stopped: stopFlag });
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
};
