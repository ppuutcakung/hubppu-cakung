/* ============================================================
   MODE DEMO — aktif otomatis selama GAS_URL belum diisi.
   Meniru respons backend dengan data contoh di memori browser.
   Login demo: superadmin / demo12345
   ============================================================ */

const Demo = (() => {
  const svgTile = (emoji, c1, c2) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="330" cy="40" r="90" fill="#fff" opacity=".18"/><rect x="140" y="90" width="120" height="120" rx="32" fill="#fff" opacity=".9"/><text x="200" y="172" font-size="64" text-anchor="middle">${emoji}</text></svg>`);

  const svgFlyer = (c1, c2) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1350" cy="180" r="320" fill="#fff" opacity=".12"/><circle cx="1180" cy="720" r="200" fill="#fff" opacity=".1"/><rect x="120" y="140" width="420" height="36" rx="18" fill="#fff" opacity=".35"/><rect x="120" y="200" width="620" height="24" rx="12" fill="#fff" opacity=".25"/></svg>`);

  const now = new Date();
  const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

  let apps = [
    ['Katalog UMKM Binaan', 'Etalase digital produk unggulan UMKM binaan PPU Cakung.', 'https://example.com/katalog', 'UMKM', '🛍️', '#38BDF8', '#0284C7'],
    ['Absensi & Presensi', 'Pencatatan kehadiran digital tim lapangan berbasis lokasi.', 'https://example.com/absensi', 'Tim Internal', '📍', '#7DD3FC', '#0EA5E9'],
    ['E-Surat & Disposisi', 'Manajemen surat dinas masuk dan alur tanda tangan.', 'https://example.com/esurat', 'Tim Internal', '✉️', '#93C5FD', '#3B82F6'],
    ['Layanan Pengaduan', 'Kanal aspirasi cepat tanggap untuk warga dan mitra.', 'https://example.com/pengaduan', 'Umum', '🎧', '#A5F3FC', '#06B6D4'],
    ['Pelaporan Kinerja', 'Transparansi capaian target operasional dan program.', 'https://example.com/kinerja', 'Stakeholder', '📊', '#C4B5FD', '#8B5CF6'],
    ['Pendaftaran Pelatihan', 'Akses inkubasi wirausaha dan sertifikasi UMKM.', 'https://example.com/pelatihan', 'UMKM', '🎓', '#86EFAC', '#22C55E'],
    ['SIM Aset & Logistik', 'Pencatatan inventaris dan peminjaman sarana kantor.', 'https://example.com/aset', 'Tim Internal', '📦', '#FCD34D', '#F59E0B'],
    ['Portal Regulasi', 'Kumpulan aturan, SK operasional, dan panduan kerja.', 'https://example.com/regulasi', 'Umum', '📚', '#BAE6FD', '#0369A1']
  ].map((a, i) => ({
    id: 'APP-DEMO-' + (i + 1), nama: a[0], deskripsi: a[1], link: a[2], kategori: a[3],
    gambarFileId: '', gambarUrl: svgTile(a[4], a[5], a[6]), status: 'Tampil', urutan: i + 1,
    dibuatPada: now.toISOString(), diubahPada: now.toISOString()
  }));

  let flyers = [
    { id: 'FLY-DEMO-1', judul: 'Sosialisasi Pendampingan Usaha & Legalitas UMKM Cakung 2026', gambarFileId: '', gambarUrl: svgFlyer('#0EA5E9', '#0369A1'), link: '', status: 'Tampil', urutan: 1, tanggalMulai: '', tanggalSelesai: '', dibuatPada: now.toISOString() },
    { id: 'FLY-DEMO-2', judul: 'Kelas Kemandirian UMKM: Foto Produk dengan Ponsel', gambarFileId: '', gambarUrl: svgFlyer('#22C55E', '#0E7490'), link: 'https://example.com/kelas', status: 'Tampil', urutan: 2, tanggalMulai: '', tanggalSelesai: '', dibuatPada: now.toISOString() }
  ];

  let settings = {
    namaHub: 'HubPPU Cakung', tagline: 'Satu pintu untuk semua layanan PPU Cakung', logoUrl: '',
    teksFooter: '© 2026 PPU Cakung. Satu pintu untuk semua layanan PPU Cakung.', warnaUtama: '#0EA5E9',
    kontakWA: '6281200000000', kontakTeks: 'Tim piket PPU Cakung siap membantu.'
  };

  // Klik contoh: [bulan 1..12] untuk tahun berjalan
  const monthTotals = [620, 710, 780, 690, 880, 930, 960, 940, 1428, 0, 0, 0];
  const share = [0.288, 0.241, 0.196, 0.136, 0.084, 0.055, 0, 0];
  const clicks = {};  // clicks[ym][appId] = n
  const logs = [];
  let session = null;

  function addLog(aksi, target, detail) {
    logs.unshift({ waktu: new Date().toISOString(), username: 'superadmin', aksi, target, detail });
  }
  addLog('LOGIN', 'superadmin', 'Masuk ke panel admin (contoh)');

  function seedClicks() {
    const cur = now.getMonth();
    for (let m = 0; m <= cur; m++) {
      const key = now.getFullYear() + '-' + String(m + 1).padStart(2, '0');
      clicks[key] = {};
      const total = m === cur ? Math.round(monthTotals[8] * now.getDate() / 30) : monthTotals[m] || 700;
      apps.forEach((a, i) => { clicks[key][a.id] = Math.round(total * (share[i] || 0.02)); });
    }
  }
  seedClicks();
  let todayClicks = { Mobile: 38, Desktop: 13 };

  const clone = o => JSON.parse(JSON.stringify(o));
  const wait = (v, ms = 350) => new Promise(r => setTimeout(() => r(clone(v)), ms));
  const fail = (msg, auth) => new Promise((_, rej) => setTimeout(() => rej(new ApiError(msg, auth)), 300));
  const genId = p => p + '-DEMO-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  function report(bulan, tahun) {
    const key = tahun + '-' + String(bulan).padStart(2, '0');
    const prevKey = bulan === 1 ? (tahun - 1) + '-12' : tahun + '-' + String(bulan - 1).padStart(2, '0');
    const map = clicks[key] || {};
    const perApp = apps.map(a => ({ appId: a.id, nama: a.nama, klik: map[a.id] || 0, dihapus: false }));
    const total = perApp.reduce((s, x) => s + x.klik, 0);
    perApp.forEach(x => { x.persen = total ? Math.round(x.klik / total * 1000) / 10 : 0; });
    perApp.sort((a, b) => b.klik - a.klik);
    const sum = k => Object.values(clicks[k] || {}).reduce((s, n) => s + n, 0);
    const prev = sum(prevKey);
    const perBulan = BULAN.map((_, i) => sum(tahun + '-' + String(i + 1).padStart(2, '0')));
    const isCur = key === ym;
    const days = isCur ? now.getDate() : new Date(tahun, bulan, 0).getDate();
    return {
      bulan, tahun, perApp, totalBulan: total, totalBulanLalu: prev,
      perubahanPersen: prev ? Math.round((total - prev) / prev * 1000) / 10 : null,
      rataHarian: Math.round(total / days * 10) / 10, perBulan, totalTahun: perBulan.reduce((s, n) => s + n, 0),
      topApp: perApp[0] && perApp[0].klik ? { nama: perApp[0].nama, klik: perApp[0].klik } : null,
      appAktif: apps.filter(a => a.status === 'Tampil').length, appTotal: apps.length,
      klikHariIni: todayClicks.Mobile + todayClicks.Desktop, perangkatHariIni: todayClicks,
      tahunTersedia: [now.getFullYear() - 1, now.getFullYear()]
    };
  }

  function publicData() {
    const today = todayLocal();
    return {
      settings,
      apps: apps.filter(a => a.status === 'Tampil').sort((a, b) => a.urutan - b.urutan)
        .map(a => ({ id: a.id, nama: a.nama, deskripsi: a.deskripsi, link: a.link, kategori: a.kategori, gambarUrl: a.gambarUrl })),
      flyers: flyers.filter(f => f.status === 'Tampil' && (!f.tanggalMulai || today >= f.tanggalMulai) && (!f.tanggalSelesai || today <= f.tanggalSelesai))
        .sort((a, b) => a.urutan - b.urutan).map(f => ({ id: f.id, judul: f.judul, gambarUrl: f.gambarUrl, link: f.link })),
      generatedAt: new Date().toISOString()
    };
  }

  function saveGeneric(list, d, prefix, build) {
    if (d.id) {
      const i = list.findIndex(x => x.id === d.id);
      if (i < 0) return null;
      list[i] = Object.assign({}, list[i], build(d), d.imageBase64 ? { gambarUrl: d.imageBase64 } : {});
      if (d.urutan) list[i].urutan = Number(d.urutan);
      return list[i];
    }
    const item = Object.assign({ id: genId(prefix), gambarFileId: '', gambarUrl: d.imageBase64, dibuatPada: new Date().toISOString() }, build(d));
    item.urutan = Number(d.urutan) || (list.reduce((m, x) => Math.max(m, x.urutan), 0) + 1);
    list.push(item);
    return item;
  }

  function handle(action, d = {}, token) {
    if (action === 'public') return wait(publicData(), 500);
    if (action === 'ping') return wait({ time: new Date().toISOString() });
    if (action === 'logClick') { todayClicks[isMobileDevice() ? 'Mobile' : 'Desktop']++; return wait(null, 50); }
    if (action === 'login') {
      if (d.username === 'superadmin' && d.password === 'demo12345') {
        session = 'demo-token';
        return wait({ token: session, username: 'superadmin', wajibGantiPassword: false });
      }
      return fail('Username atau password salah. (Demo: superadmin / demo12345)');
    }
    if (!token || token !== session) return fail('Sesi berakhir. Silakan masuk kembali.', true);

    switch (action) {
      case 'bootstrap':
        return wait({ admin: { username: 'superadmin', wajibGantiPassword: false }, apps: apps.slice().sort((a, b) => a.urutan - b.urutan), flyers: flyers.slice().sort((a, b) => a.urutan - b.urutan), settings, report: report(now.getMonth() + 1, now.getFullYear()), kategori: ['Tim Internal', 'UMKM', 'Stakeholder', 'Umum'] }, 600);
      case 'logout': session = null; return wait(null);
      case 'changePassword': addLog('GANTI_PASSWORD', 'superadmin', 'Password admin diperbarui'); return wait(null);
      case 'getReport': return wait(report(Number(d.bulan), Number(d.tahun)));
      case 'getLogs': {
        const per = 50, pages = Math.max(1, Math.ceil(logs.length / per)), page = Math.min(Math.max(1, d.page || 1), pages);
        return wait({ items: logs.slice((page - 1) * per, page * per), total: logs.length, page, pages });
      }
      case 'saveApp': {
        if (!d.id && !d.imageBase64) return fail('Gambar wajib diunggah.');
        const item = saveGeneric(apps, d, 'APP', x => ({ nama: x.nama, deskripsi: x.deskripsi || '', link: x.link, kategori: x.kategori || '', status: x.status, diubahPada: new Date().toISOString() }));
        addLog(d.id ? 'UBAH_APP' : 'TAMBAH_APP', item.id, (d.id ? 'Mengubah' : 'Menambah') + ' aplikasi "' + item.nama + '"');
        return wait(item, 900);
      }
      case 'saveFlyer': {
        if (!d.id && !d.imageBase64) return fail('Gambar wajib diunggah.');
        const item = saveGeneric(flyers, d, 'FLY', x => ({ judul: x.judul, link: x.link || '', status: x.status, tanggalMulai: x.tanggalMulai || '', tanggalSelesai: x.tanggalSelesai || '' }));
        addLog(d.id ? 'UBAH_FLYER' : 'TAMBAH_FLYER', item.id, (d.id ? 'Mengubah' : 'Menambah') + ' flyer "' + item.judul + '"');
        return wait(item, 900);
      }
      case 'deleteApp': case 'deleteFlyer': {
        const isApp = action === 'deleteApp';
        const list = isApp ? apps : flyers;
        const it = list.find(x => x.id === d.id);
        if (isApp) apps = apps.filter(x => x.id !== d.id); else flyers = flyers.filter(x => x.id !== d.id);
        addLog(isApp ? 'HAPUS_APP' : 'HAPUS_FLYER', d.id, 'Menghapus ' + (isApp ? 'aplikasi "' + (it && it.nama) : 'flyer "' + (it && it.judul)) + '"');
        return wait({ id: d.id });
      }
      case 'setAppStatus': case 'setFlyerStatus': {
        const list = action === 'setAppStatus' ? apps : flyers;
        const it = list.find(x => x.id === d.id);
        if (it) it.status = d.status;
        addLog(action === 'setAppStatus' ? 'UBAH_APP' : 'UBAH_FLYER', d.id, (d.status === 'Tampil' ? 'Menampilkan ' : 'Menyembunyikan ') + '"' + (it && (it.nama || it.judul)) + '"');
        return wait(it);
      }
      case 'reorderApps': case 'reorderFlyers': {
        const list = action === 'reorderApps' ? apps : flyers;
        d.ids.forEach((id, i) => { const it = list.find(x => x.id === id); if (it) it.urutan = i + 1; });
        addLog(action === 'reorderApps' ? 'UBAH_APP' : 'UBAH_FLYER', 'Urutan', 'Mengatur ulang urutan (' + d.ids.length + ' item)');
        return wait(null);
      }
      case 'saveSettings': {
        settings = Object.assign({}, settings, {
          namaHub: d.namaHub, tagline: d.tagline, teksFooter: d.teksFooter, warnaUtama: d.warnaUtama,
          kontakWA: String(d.kontakWA || '').replace(/\D/g, '').replace(/^0/, '62'), kontakTeks: d.kontakTeks
        });
        if (d.logoBase64) settings.logoUrl = d.logoBase64;
        if (d.hapusLogo) settings.logoUrl = '';
        addLog('UBAH_PENGATURAN', 'Pengaturan', 'Memperbarui identitas hub');
        return wait(settings, 700);
      }
    }
    return fail('Action tidak dikenal: ' + action);
  }

  return { handle };
})();
