/* Lyric Studio: your photo -> animated character -> moving test clip.
   Character images: Gemini "Nano Banana" image model. Moving clips: Gemini Omni Flash (Interactions API).
   Only the cartoon character is sent for video, never the real photo. */
(function(){
const API = 'https://generativelanguage.googleapis.com/v1beta/';
const STYLES = {
  anime:  { name:'Anime', p:'a Japanese anime character, cel-shaded, clean line art, expressive eyes, vibrant colors, like a still from a modern anime music video' },
  toon3d: { name:'3D cartoon', p:'a 3D animated-film cartoon character, soft rounded shapes, big expressive eyes, cinematic lighting, high-quality render' },
  comic:  { name:'Comic', p:'a bold comic-book character with thick ink outlines, halftone shading and punchy poster colors' },
  paint:  { name:'Watercolor', p:'a hand-painted watercolor illustration character with soft washes and visible paper texture' },
  pixel:  { name:'Pixel art', p:'a detailed 16-bit pixel-art game character with a limited vibrant palette' },
  clay:   { name:'Clay', p:'a stop-motion claymation character made of plasticine, with fingerprints and soft studio light' }
};

async function call(path, key, body, method){
  const r = await fetch(API + path, { method: method || (body ? 'POST' : 'GET'),
    headers: Object.assign({ 'x-goog-api-key': key }, body ? { 'Content-Type':'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined });
  let j = null; try{ j = await r.json(); }catch(e){}
  if(!r.ok){ const e = new Error((j && j.error && j.error.message) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
  return j;
}
let modelCache = null;
async function models(key){
  if(modelCache && modelCache.key === key) return modelCache.list;
  const j = await call('models?pageSize=300', key);
  modelCache = { key, list: (j.models || []).map(m => ({ id: m.name.replace(/^models\//, ''), methods: m.supportedGenerationMethods || [] })) };
  return modelCache.list;
}
const ver = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
async function imageModels(key){
  let list = [];
  try{ list = (await models(key)).map(m => m.id).filter(n => /flash-image/.test(n) && !/lite/.test(n)).sort((a, b) => ver(b) - ver(a) || (/preview/.test(a) - /preview/.test(b))); }catch(e){}
  ['gemini-3.1-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image'].forEach(x => { if(!list.includes(x)) list.push(x); });
  return list;
}
async function videoModel(key){
  try{ const l = (await models(key)).map(m => m.id).filter(n => /omni/.test(n) && /flash/.test(n)).sort((a, b) => { const v = s => parseFloat((s.match(/omni-(\d+(?:\.\d+)?)/) || [0, 0])[1]); return v(b) - v(a); }); if(l.length) return l[0]; }catch(e){}
  return 'gemini-omni-1.1-flash';
}

const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
async function shrink(blob, max){
  const img = await createImageBitmap(blob); const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/jpeg', .9));
}
function b64ToBlob(data, type){ const bin = atob(data), a = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type }); }

/* One character image from the photo. */
async function character(key, photoBlob, style, extra, ratio){
  const photo = await b64(await shrink(photoBlob, 1024));
  const st = STYLES[style] || STYLES.anime;
  const prompt = `Redraw the person in this photo as ${st.p}. Keep their face shape, skin tone, hairstyle, facial hair and overall likeness so they are clearly recognisable as the same person. ` +
    `Full upper body, confident music-video pose, plain simple background, no text, no logos, no watermark.` + (extra ? ` Extra direction: ${extra}.` : '');
  const body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type:'image/jpeg', data: photo } }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ratio === '16:9' ? '16:9' : '9:16' } } };
  let last = null;
  for(const m of await imageModels(key)){
    for(const bd of [body, { contents: body.contents, generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }]){
      try{
        const j = await call('models/' + m + ':generateContent', key, bd);
        const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
        const img = parts.find(p => (p.inline_data || p.inlineData));
        if(img){ const d = img.inline_data || img.inlineData; return b64ToBlob(d.data, d.mime_type || d.mimeType || 'image/png'); }
        const why = (((j.candidates || [])[0] || {}).finishReason) || (j.promptFeedback && j.promptFeedback.blockReason) || 'no image returned';
        last = new Error('Google returned no picture (' + why + ').'); last.status = 200;
        break;
      }catch(e){ last = e; if(e.status === 401 || e.status === 403 || e.status === 429) throw e; if(e.status !== 400 && e.status !== 404) break; }
    }
  }
  throw last || new Error('No image model answered.');
}

function findVideo(j){
  let found = null;
  const walk = o => { if(!o || typeof o !== 'object' || found) return;
    if((o.type === 'video' || /^video\//.test(o.mime_type || o.mimeType || '')) && (o.data || o.uri)) { found = o; return; }
    Object.values(o).forEach(walk); };
  walk(j); return found;
}
/* One moving clip from the character image. onStatus(text) for progress. */
async function clip(key, charBlob, prompt, ratio, onStatus){
  const model = await videoModel(key);
  const data = await b64(await shrink(charBlob, 1280));
  onStatus('Sending your character to Google…');
  const body = { model, input: [ { type:'image', data, mime_type:'image/jpeg' }, { type:'text', text: prompt } ],
    generation_config: { video_config: { task: 'image_to_video' } },
    response_format: { type:'video', aspect_ratio: ratio === '16:9' ? '16:9' : '9:16', resolution:'720p' } };
  let j = await call('interactions', key, body);
  const t0 = Date.now();
  while(!findVideo(j) && j && j.id && !/completed|failed|cancel/i.test(j.status || '')){
    await new Promise(r => setTimeout(r, 5000));
    onStatus('Google is animating your character… ' + Math.round((Date.now() - t0) / 1000) + ' s');
    j = await call('interactions/' + encodeURIComponent(j.id), key);
    if(Date.now() - t0 > 6 * 60 * 1000) throw new Error('Google took too long. Try again in a few minutes.');
  }
  if(/failed/i.test(j.status || '')) throw new Error((j.error && j.error.message) || 'Google could not make this clip.');
  const v = findVideo(j); if(!v) throw new Error('Google finished but sent no video. Try a different scene description.');
  if(v.data) return b64ToBlob(v.data, v.mime_type || v.mimeType || 'video/mp4');
  const r = await fetch(v.uri, { headers: { 'x-goog-api-key': key } });
  if(!r.ok) throw new Error('Could not download the clip (HTTP ' + r.status + ').');
  return await r.blob();
}

function friendly(e, paid){
  const m = String(e && e.message || e);
  if(e && e.status === 429) return paid ? 'Google is busy right now. Wait a minute and try again.' : 'Your free key can\'t make pictures or video. Turn on Private mode in step 1 and add your paid key.';
  if(/billing|prepay|credit|paid|quota|free tier/i.test(m)) return 'This needs your paid key (from a Google project with billing on). Add it under Private mode in step 1.';
  if(/recogni|person|people|celebrit/i.test(m)) return 'Google refused this image because of its rules on real people. Use the cartoon character, not a real photo.';
  if(/safety|blocked|SAFETY|PROHIBITED/i.test(m)) return 'Google\'s safety filter blocked this. Try a different photo or scene description.';
  if(/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Couldn\'t reach Google. Check your connection and try again.';
  if(e && (e.status === 400 || e.status === 403) && /key/i.test(m)) return 'Google didn\'t accept the key. Check it in step 1.';
  return 'Google said: ' + m;
}

window.ANIM = { STYLES, character, clip, friendly };
})();
