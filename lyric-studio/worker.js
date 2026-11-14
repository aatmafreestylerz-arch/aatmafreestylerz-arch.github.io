// Runs speech-to-text on the phone itself. The song never leaves the device.
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';

const loaded = {};
const sizes = {};

self.onmessage = async (e) => {
  const { audio, language, model } = e.data;
  try {
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
    self.postMessage({ type: 'run' });
    const opts = { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true, task: 'transcribe' };
    if (language && language !== 'auto') opts.language = language;
    const out = await loaded[id](audio, opts);
    self.postMessage({ type: 'done', chunks: (out && out.chunks) || [], text: (out && out.text) || '' });
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
};
