/* ============================================================
   KONFIGURASI HubPPU Cakung
   ------------------------------------------------------------
   Ganti GAS_URL dengan URL Web App (/exec) dari Apps Script.
   Selama GAS_URL belum diisi, aplikasi berjalan dalam MODE DEMO
   (data contoh di browser, tidak tersimpan ke mana pun).
   ============================================================ */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbycDffLB4DdG6CVNUY26xobawadIMDr0GeZccsw2oq3kUrwt2bDXZSIrHFYwyrJg_JS/exec';

const APP_CONFIG = {
  // true  = selalu pakai data contoh
  // false = selalu pakai backend GAS
  // 'auto' = demo hanya jika GAS_URL belum diisi
  DEMO_MODE: 'auto',

  SLIDE_INTERVAL_MS: 5000,         // flyer bergeser otomatis tiap 5 detik
  PUBLIC_CACHE_KEY: 'hubppu_public_v1',
  ADMIN_SESSION_KEY: 'hubppu_admin_session',
  ADMIN_DATA_KEY: 'hubppu_admin_data',

  IMAGE: {
    app:   { maxWidth: 600,  maxBytes: 2 * 1024 * 1024 },
    flyer: { maxWidth: 1080, maxBytes: 3 * 1024 * 1024 },
    logo:  { maxWidth: 256,  maxBytes: 1 * 1024 * 1024, square: true }
  },
  MAX_INPUT_BYTES: 15 * 1024 * 1024  // file asli boleh sampai 15 MB, dikompres di browser
};

APP_CONFIG.IS_DEMO = APP_CONFIG.DEMO_MODE === true ||
  (APP_CONFIG.DEMO_MODE === 'auto' && (!GAS_URL || GAS_URL.indexOf('XXXX') !== -1));
