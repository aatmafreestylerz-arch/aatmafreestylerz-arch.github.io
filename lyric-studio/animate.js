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
async function decodeAny(blob){
  try{ return await createImageBitmap(blob, { imageOrientation:'from-image' }); }catch(e){}
  try{ return await createImageBitmap(blob); }catch(e){}
  const u = URL.createObjectURL(blob); const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('This photo could not be opened on this phone. Try a JPG or PNG, or take a screenshot of it and use that.')); img.src = u; });
  return img;
}
/* Re-encode to a small, plain image. Returns { blob, mime, w, h }. */
async function shrink(blob, max, type){
  const img = await decodeAny(blob); const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight;
  const s = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * s)); c.height = Math.max(1, Math.round(h0 * s));
  const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  const mime = type || 'image/jpeg';
  let out = await new Promise(res => c.toBlob(res, mime, .9));
  if(!out || !out.size){ const d = c.toDataURL(mime, .9); out = b64ToBlob(d.split(',')[1], mime); }
  return { blob: out, mime: out.type || mime, w: c.width, h: c.height };
}
/* Several ways to package the same photo, tried in order if Google can't read one. */
async function photoVariants(blob){
  const out = [];
  try{ out.push(await shrink(blob, 1024, 'image/jpeg')); }catch(e){ if(/could not be opened/.test(e.message)) throw e; }
  try{ out.push(await shrink(blob, 768, 'image/png')); }catch(e){}
  if(/^image\/(jpeg|png|webp)$/.test(blob.type || '') && blob.size < 7e6) out.push({ blob, mime: blob.type, w: 0, h: 0, original: true });
  if(!out.length) throw new Error('This photo could not be opened on this phone. Try a JPG or PNG.');
  return out;
}
async function realBase64(blob){
  const d = await b64(blob);
  if(!d || d.length < 200) throw new Error('The photo came out empty when preparing it. Try choosing it again.');
  return d.replace(/\s+/g, '');
}
function b64ToBlob(data, type){ const bin = atob(data), a = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type }); }

/* One character image from the photo. */
async function genImage(key, parts, ratio){
  const ar = ['9:16','16:9','1:1','4:5','3:4','4:3','2:3','3:2','21:9'].includes(ratio) ? ratio : '9:16';
  const bodies = [
    { contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ar } } },
    { contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }
  ];
  let last = null;
  for(const m of await imageModels(key)){
    for(const bd of bodies){
      try{
        const j = await call('models/' + m + ':generateContent', key, bd);
        const ps = (((j.candidates || [])[0] || {}).content || {}).parts || [];
        const img = ps.find(p => (p.inline_data || p.inlineData));
        if(img){ const d = img.inline_data || img.inlineData; return b64ToBlob(d.data, d.mime_type || d.mimeType || 'image/png'); }
        const why = (((j.candidates || [])[0] || {}).finishReason) || (j.promptFeedback && j.promptFeedback.blockReason) || 'no image returned';
        last = new Error('Google returned no picture (' + why + ').'); last.status = 200;
        break;
      }catch(e){ last = e; if(e.status === 401 || e.status === 403 || e.status === 429) throw e; if(/decod/i.test(e.message)){ if(bd === bodies[0]) continue; throw e; } if(e.status !== 400 && e.status !== 404) break; }
    }
  }
  throw last || new Error('No image model answered.');
}
/* One character image from the photo. Tries other packagings of the photo if Google can't read one. */
async function character(key, photoBlob, style, extra, ratio){
  const st = STYLES[style] || STYLES.anime;
  const prompt = `Redraw the person in this photo as ${st.p}. Keep their face shape, skin tone, hairstyle, facial hair and overall likeness so they are clearly recognisable as the same person. ` +
    `Full upper body, confident music-video pose, plain simple background, no text, no logos, no watermark.` + (extra ? ` Extra direction: ${extra}.` : '');
  let last = null, tried = [];
  for(const v of await photoVariants(photoBlob)){
    try{
      const data = await realBase64(v.blob);
      tried.push((v.original ? 'original ' : '') + v.mime.replace('image/', '').toUpperCase() + ' ' + Math.round(v.blob.size / 1024) + ' KB' + (v.w ? ' ' + v.w + '×' + v.h : ''));
      return await genImage(key, [{ text: prompt }, { inline_data: { mime_type: v.mime, data } }], ratio);
    }catch(e){ last = e; if(!/decod|empty/i.test(e.message)) throw e; }
  }
  const e = new Error((last && last.message || 'Google could not read the photo') + ' (tried: ' + tried.join('; ') + ')'); e.status = last && last.status; e.decode = true; throw e;
}
/* A background picture from a description (no photo needed). */
async function background(key, desc, ratio){
  const prompt = 'A music-video background image: ' + desc + '. Rich atmosphere and depth, cinematic lighting, leave calm space in the middle for lyrics. No people, no text, no letters, no logos, no watermark.';
  return genImage(key, [{ text: prompt }], ratio);
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
  const data = await realBase64((await shrink(charBlob, 1280, 'image/jpeg')).blob);
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
  if(e && e.decode) return 'Google couldn\'t read this photo even after trying 3 formats. Please choose a different photo, or take a screenshot of this one and use the screenshot. Details: ' + m;
  if(/could not be opened|came out empty/i.test(m)) return m;
  if(/recogni|person|people|celebrit/i.test(m)) return 'Google refused this image because of its rules on real people. Use the cartoon character, not a real photo.';
  if(/safety|blocked|SAFETY|PROHIBITED/i.test(m)) return 'Google\'s safety filter blocked this. Try a different photo or scene description.';
  if(/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Couldn\'t reach Google. Check your connection and try again.';
  if(e && (e.status === 400 || e.status === 403) && /key/i.test(m)) return 'Google didn\'t accept the key. Check it in step 1.';
  return 'Google said: ' + m;
}

window.ANIM = { STYLES, character, background, clip, friendly };
})();
