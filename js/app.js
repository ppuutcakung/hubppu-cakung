/* ============================================================
   ROUTER SPA — navigasi instan tanpa memuat ulang halaman
   #/              → halaman publik
   #/admin         → login / dashboard admin
   #/admin/<menu>  → dashboard | aplikasi | flyer | pengaturan | log
   ?page=admin     → dialihkan ke #/admin (sesuai PRD US-04)
   ============================================================ */

function showView(name) {
  ['public', 'login', 'admin'].forEach(v => { $('#view-' + v).hidden = v !== name; });
  document.body.dataset.view = name;
  if (name !== 'public') Pub.stopAutoplay();
}

function route() {
  const params = new URLSearchParams(location.search);
  if (params.get('page') === 'admin' && location.hash.indexOf('#/admin') !== 0) {
    history.replaceState(null, '', location.pathname + '#/admin');
  }
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'admin') {
    Admin.open(parts[1] || 'dashboard');
  } else {
    showView('public');
    Pub.start();
  }
}

window.addEventListener('hashchange', route);

/* Indikator server di panel admin mengikuti hasil panggilan API terakhir */
Api.onStatus = ok => {
  if (document.body.dataset.view === 'admin' && Admin.session) Admin.setServer(ok);
};

/* Koneksi kembali setelah offline: muat ulang data admin otomatis */
window.addEventListener('online', () => {
  if (document.body.dataset.view === 'admin' && Admin.session) Admin.bootstrap();
});
document.addEventListener('DOMContentLoaded', () => {
  if (APP_CONFIG.IS_DEMO) {
    const w = $('#config-warning');
    w.innerHTML = '<strong>Mode demo.</strong> Data contoh, tidak tersimpan. Isi <code>GAS_URL</code> di <code>js/config.js</code> untuk menyambung ke Google Sheets.';
    w.hidden = false;
    setTimeout(() => { w.hidden = true; }, 9000);
  }
  route();
});
