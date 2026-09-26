/* ============================================================
   UTILITAS UMUM
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function esc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function initials(name) {
  const words = String(name || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

function fmtNum(n) { return Number(n || 0).toLocaleString('id-ID'); }

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d)) return iso;
  return d.getDate() + ' ' + BULAN_PENDEK[d.getMonth()] + ' ' + d.getFullYear();
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso || '';
  const p = n => String(n).padStart(2, '0');
  return d.getDate() + ' ' + BULAN_PENDEK[d.getMonth()] + ' ' + d.getFullYear() + ', ' + p(d.getHours()) + '.' + p(d.getMinutes());
}

function todayLocal() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === '/' ? '' : u.pathname);
  } catch (e) { return url; }
}

function debounce(fn, ms) {
  let t;
  return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
}

function storage(type) {
  // Pembungkus aman: browser mode privat bisa melempar error
  const s = type === 'session' ? window.sessionStorage : window.localStorage;
  return {
    get(key) { try { const v = s.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(key, val) { try { s.setItem(key, JSON.stringify(val)); } catch (e) { /* penuh / diblokir */ } },
    remove(key) { try { s.removeItem(key); } catch (e) { /* abaikan */ } }
  };
}
const LS = storage('local');
const SS = storage('session');

/* ---------- Toast ---------- */
function toast(message, type = 'success', ms = 3500) {
  const stack = $('#toast-stack');
  const icon = type === 'error' ? 'i-alert' : type === 'info' ? 'i-refresh' : 'i-check';
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = '<svg class="ic"><use href="#' + icon + '"/></svg><span>' + esc(message) + '</span>';
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, ms);
}

function setLoading(btn, on) {
  if (!btn) return;
  btn.disabled = !!on;
  btn.classList.toggle('is-loading', !!on);
}

/* ---------- Penghitung karakter ---------- */
function bindCounters(form) {
  $$('.counter', form).forEach(c => {
    const input = form.elements[c.dataset.for];
    if (!input) return;
    const max = Number(input.getAttribute('maxlength')) || 0;
    const update = () => {
      c.textContent = input.value.length + '/' + max;
      c.classList.toggle('over', input.value.length >= max);
    };
    input.addEventListener('input', update);
    c._update = update;
    update();
  });
}
function refreshCounters(form) { $$('.counter', form).forEach(c => c._update && c._update()); }

/* ---------- Kompresi gambar di browser ---------- */
let _webpOk = null;
function supportsWebp() {
  if (_webpOk === null) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    _webpOk = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return _webpOk;
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibaca. Coba file lain.')); };
    img.src = url;
  });
}

function dataUrlBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1] || '';
  return Math.floor(b64.length * 3 / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
}

function fmtBytes(n) {
  return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
}

/**
 * Kompres gambar: kecilkan ke lebar maksimum, ubah ke WebP (atau JPEG),
 * turunkan kualitas bertahap sampai di bawah batas ukuran.
 */
async function compressImage(file, opt) {
  if (!file) throw new Error('Tidak ada file.');
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Format harus JPG, PNG, atau WebP.');
  if (file.size > APP_CONFIG.MAX_INPUT_BYTES) throw new Error('File terlalu besar (maks. ' + fmtBytes(APP_CONFIG.MAX_INPUT_BYTES) + ').');

  const img = await loadImageFile(file);
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (opt.square) {
    const s = Math.min(sw, sh);
    sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s;
  }
  const scale = Math.min(1, opt.maxWidth / sw);
  const w = Math.round(sw * scale), h = Math.round(sh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const type = supportsWebp() ? 'image/webp' : 'image/jpeg';
  if (type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

  let q = 0.86;
  let dataUrl = canvas.toDataURL(type, q);
  while (dataUrlBytes(dataUrl) > opt.maxBytes && q > 0.45) {
    q -= 0.1;
    dataUrl = canvas.toDataURL(type, q);
  }
  const bytes = dataUrlBytes(dataUrl);
  if (bytes > opt.maxBytes) throw new Error('Gambar masih terlalu besar setelah dikompres. Coba gambar lain.');
  return { dataUrl, width: w, height: h, bytes, originalBytes: file.size };
}

/* ---------- Tema warna (untuk warna utama dari Pengaturan) ---------- */
function applyTheme(el, color) {
  const target = el || document.documentElement;
  const props = ['--primary', '--primary-strong', '--primary-ink', '--primary-soft', '--primary-mid'];
  if (!color || !/^#[0-9a-f]{6}$/i.test(color) || color.toUpperCase() === '#0EA5E9') {
    props.forEach(p => target.style.removeProperty(p));
    return;
  }
  target.style.setProperty('--primary', color);
  if (window.CSS && CSS.supports('color', 'color-mix(in srgb, red 50%, white)')) {
    target.style.setProperty('--primary-strong', 'color-mix(in srgb, ' + color + ' 82%, black)');
    target.style.setProperty('--primary-ink', 'color-mix(in srgb, ' + color + ' 62%, black)');
    target.style.setProperty('--primary-soft', 'color-mix(in srgb, ' + color + ' 13%, white)');
    target.style.setProperty('--primary-mid', 'color-mix(in srgb, ' + color + ' 32%, white)');
  }
}

/* ---------- Drag & drop file pada dropzone ---------- */
function bindDropzone(zone, input, onFile) {
  input.addEventListener('change', () => { if (input.files[0]) onFile(input.files[0]); input.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('over'); }));
  zone.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) onFile(f); });
}
