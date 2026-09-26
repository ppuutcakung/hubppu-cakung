/* ============================================================
   API — komunikasi ke Google Apps Script via fetch()
   - GET  : data publik
   - POST : WAJIB Content-Type text/plain agar tidak memicu
            CORS preflight (GAS tidak melayani OPTIONS)
   ============================================================ */

class ApiError extends Error {
  constructor(message, isAuth, retryable) {
    super(message);
    this.isAuth = !!isAuth;
    this.retryable = !!retryable;
  }
}

const Api = {
  /* Coba ulang otomatis: total 3 percobaan (jeda ±0,8 dtk lalu ±2 dtk).
     Server Google Apps Script sesekali membalas halaman error HTML
     (gangguan sementara) — biasanya percobaan berikutnya berhasil. */
  RETRY_DELAYS: [800, 2000],
  everOk: false,          // pernah berhasil tersambung di sesi ini?
  onStatus: null,         // callback(ok) untuk indikator "Server terhubung"

  async get(action, params = {}) {
    if (APP_CONFIG.IS_DEMO) return Demo.handle(action, params);
    const url = new URL(GAS_URL);
    url.searchParams.set('action', action);
    Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
    return Api._withRetry(() => fetch(url.toString(), { method: 'GET', redirect: 'follow', cache: 'no-store' }));
  },

  async post(action, data = {}, token) {
    if (APP_CONFIG.IS_DEMO) return Demo.handle(action, data, token);
    // ID permintaan SAMA untuk setiap percobaan ulang → server tidak menyimpan dobel
    const body = JSON.stringify({ action, token, data, rid: Api._rid() });
    return Api._withRetry(() => fetch(GAS_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    }));
  },

  async _withRetry(doFetch) {
    let lastErr;
    for (let attempt = 0; attempt <= Api.RETRY_DELAYS.length; attempt++) {
      if (attempt > 0) {
        const base = Api.RETRY_DELAYS[attempt - 1];
        await new Promise(r => setTimeout(r, base + Math.random() * 400));
      }
      try {
        const data = await Api._once(doFetch);
        Api.everOk = true;
        if (Api.onStatus) Api.onStatus(true);
        return data;
      } catch (e) {
        lastErr = e;
        if (!e.retryable || attempt === Api.RETRY_DELAYS.length) break;  // salah input / sesi habis / percobaan habis
        console.warn('[HubPPU] Percobaan ' + (attempt + 1) + ' gagal, mencoba ulang…', e.message);
      }
    }
    if (lastErr && lastErr.retryable && Api.onStatus) Api.onStatus(false);
    throw lastErr;
  },

  async _once(doFetch) {
    let res;
    try {
      res = await doFetch();
    } catch (e) {
      throw new ApiError(navigator.onLine === false
        ? 'Perangkat sedang offline. Periksa koneksi internet Anda.'
        : 'Koneksi ke server terputus. Silakan coba lagi.', false, true);
    }
    const text = await res.text().catch(() => '');
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.warn('[HubPPU] Respons bukan JSON (HTTP ' + res.status + '):', text.slice(0, 300));
      throw new ApiError(Api.everOk
        ? 'Server Google sedang tidak stabil dan belum merespons. Silakan coba lagi sebentar lagi.'
        : 'Server tidak mengirim data JSON. Bila terus terjadi, pastikan Web App di-deploy dengan akses "Anyone" dan URL /exec benar.',
        false, true);
    }
    if (!json.success) throw new ApiError(json.message || 'Terjadi kesalahan di server.', json.authError, !!json.retry);
    return json.data;
  },

  _rid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  },

  /**
   * Catat klik di latar belakang (fire & forget).
   * sendBeacon tetap terkirim walau tab berpindah ke aplikasi tujuan.
   */
  logClick(appId) {
    const payload = { action: 'logClick', data: { appId, device: isMobileDevice() ? 'Mobile' : 'Desktop' } };
    if (APP_CONFIG.IS_DEMO) { Demo.handle('logClick', payload.data); return; }
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(GAS_URL, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return;
    } catch (e) { /* lanjut ke fallback */ }
    fetch(GAS_URL, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body }).catch(() => {});
  }
};
