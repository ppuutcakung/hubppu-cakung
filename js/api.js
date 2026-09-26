/* ============================================================
   API — komunikasi ke Google Apps Script via fetch()
   - GET  : data publik
   - POST : WAJIB Content-Type text/plain agar tidak memicu
            CORS preflight (GAS tidak melayani OPTIONS)
   ============================================================ */

class ApiError extends Error {
  constructor(message, isAuth) {
    super(message);
    this.isAuth = !!isAuth;
  }
}

const Api = {
  async get(action, params = {}) {
    if (APP_CONFIG.IS_DEMO) return Demo.handle(action, params);
    const url = new URL(GAS_URL);
    url.searchParams.set('action', action);
    Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
    let res;
    try {
      res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    } catch (e) {
      throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }
    return Api._parse(res);
  },

  async post(action, data = {}, token) {
    if (APP_CONFIG.IS_DEMO) return Demo.handle(action, data, token);
    let res;
    try {
      res = await fetch(GAS_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token, data })
      });
    } catch (e) {
      throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }
    return Api._parse(res);
  },

  async _parse(res) {
    let json;
    try {
      json = await res.json();
    } catch (e) {
      throw new ApiError('Server tidak mengirim data JSON. Pastikan Web App di-deploy dengan akses "Anyone" dan URL /exec benar.');
    }
    if (!json.success) throw new ApiError(json.message || 'Terjadi kesalahan di server.', json.authError);
    return json.data;
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
