/* ============================================================
   PANEL SUPER ADMIN
   Prinsip instant UX:
   - 1 panggilan "bootstrap" memuat semua data awal (batch)
   - data admin di-cache di sessionStorage → buka ulang 0 ms
   - toggle status, urutan, hapus, simpan = optimistic UI:
     tampilan berubah seketika, sinkron server di latar belakang,
     dibatalkan otomatis bila server menolak
   ============================================================ */

const PAGES = {
  dashboard:  ['Dashboard ringkasan', 'Pantauan pemakaian portal dan distribusi klik'],
  aplikasi:   ['Kelola aplikasi', 'Tambah, ubah, sembunyikan, dan urutkan kartu di halaman publik'],
  flyer:      ['Flyer & pengumuman', 'Kelola slider informasi di bagian atas halaman publik'],
  pengaturan: ['Pengaturan umum', 'Identitas hub yang tampil di halaman publik'],
  log:        ['Log aktivitas', 'Riwayat tindakan admin di panel ini']
};

const LOG_LABEL = {
  LOGIN: ['Masuk', ''], LOGOUT: ['Keluar', ''], LOGIN_GAGAL: ['Login gagal', 'fail'],
  TAMBAH_APP: ['Tambah aplikasi', 'add'], UBAH_APP: ['Ubah aplikasi', 'edit'], HAPUS_APP: ['Hapus aplikasi', 'del'],
  TAMBAH_FLYER: ['Tambah flyer', 'add'], UBAH_FLYER: ['Ubah flyer', 'edit'], HAPUS_FLYER: ['Hapus flyer', 'del'],
  UBAH_PENGATURAN: ['Ubah pengaturan', 'edit'], GANTI_PASSWORD: ['Ganti password', 'edit']
};

const BAR_COLORS = ['#0EA5E9', '#38BDF8', '#7DD3FC', '#64748B', '#94A3B8', '#CBD5E1'];

const Admin = {
  bound: false,
  session: null,        // { token, username, mustChange }
  data: null,           // { apps, flyers, settings, report, kategori }
  reports: {},          // cache laporan per "bulan-tahun"
  page: 'dashboard',
  sel: { month: 0, year: 0, trendYear: 0 },
  logPage: 1,
  logData: null,
  appQuery: '',
  editing: null,        // { kind, id, image }
  settingsDraft: { logo: null, hapusLogo: false },
  reorderTimers: {},

  /* ================= ROUTING ================= */
  open(sub) {
    this.bindOnce();
    this.session = this.session || SS.get(APP_CONFIG.ADMIN_SESSION_KEY);
    if (!this.session) { this.showLogin(); return; }

    showView('admin');
    if (!this.data) {
      const cached = SS.get(APP_CONFIG.ADMIN_DATA_KEY);
      if (cached) { this.data = cached; this.renderAll(); }
      this.bootstrap();
    }
    this.showPage(PAGES[sub] ? sub : 'dashboard');
    if (this.session.mustChange) this.openPassword(true);
  },

  showLogin() {
    showView('login');
    const s = (LS.get(APP_CONFIG.PUBLIC_CACHE_KEY) || {}).settings || {};
    $('#login-hubname').textContent = s.namaHub || 'HubPPU Cakung';
    Tpl.logo($('#login-logo'), s);
    if (APP_CONFIG.IS_DEMO) {
      const err = $('#login-error');
      err.hidden = false;
      err.style.background = 'var(--primary-soft)';
      err.style.color = 'var(--primary-ink)';
      err.textContent = 'Mode demo: masuk dengan superadmin / demo12345';
    }
    setTimeout(() => $('#login-form').elements.username.focus(), 50);
  },

  showPage(page) {
    this.page = page;
    $$('.page').forEach(p => { p.hidden = p.dataset.page !== page; });
    $$('.side-nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === page));
    $('#page-title').textContent = PAGES[page][0];
    $('#page-sub').textContent = PAGES[page][1];
    $('#view-admin').classList.remove('nav-open');
    if (page === 'log') this.loadLogs(this.logPage);
    if (page === 'pengaturan' && this.data) this.fillSettings();
    window.scrollTo(0, 0);
  },

  /* ================= DATA ================= */
  async bootstrap() {
    try {
      const d = await Api.post('bootstrap', {}, this.session.token);
      this.data = { apps: d.apps, flyers: d.flyers, settings: d.settings, report: d.report, kategori: d.kategori };
      this.reports = {};
      this.reports[d.report.bulan + '-' + d.report.tahun] = d.report;
      this.session.username = d.admin.username;
      this.session.mustChange = d.admin.wajibGantiPassword;
      SS.set(APP_CONFIG.ADMIN_SESSION_KEY, this.session);
      this.persist();
      this.setServer(true);
      this.renderAll();
      if (this.page === 'pengaturan') this.fillSettings();
      if (this.session.mustChange) this.openPassword(true);
    } catch (e) {
      this.handleError(e, 'Gagal memuat data');
    }
  },

  persist() {
    if (!this.data) return;
    // Jangan simpan gambar base64 sementara ke sessionStorage (bisa besar)
    const slim = JSON.parse(JSON.stringify(this.data));
    ['apps', 'flyers'].forEach(k => slim[k] = slim[k].filter(x => !x._pending));
    SS.set(APP_CONFIG.ADMIN_DATA_KEY, slim);
  },

  handleError(e, prefix) {
    if (e && e.isAuth) {
      toast(e.message, 'error');
      this.clearSession();
      this.showLogin();
      return;
    }
    toast((prefix ? prefix + ': ' : '') + (e && e.message ? e.message : e), 'error', 5000);
  },

  clearSession() {
    this.session = null;
    this.data = null;
    this.reports = {};
    SS.remove(APP_CONFIG.ADMIN_SESSION_KEY);
    SS.remove(APP_CONFIG.ADMIN_DATA_KEY);
  },

  setServer(ok) {
    const chip = $('#server-chip');
    chip.classList.toggle('ok', ok);
    chip.classList.toggle('err', !ok);
    $('span', chip).textContent = APP_CONFIG.IS_DEMO ? 'Mode demo' : ok ? 'Server terhubung' : 'Server tidak terhubung';
  },

  /* ================= RENDER ================= */
  renderAll() {
    if (!this.data) return;
    const s = this.data.settings || {};
    const name = (this.session && this.session.username) || 'admin';
    $('#admin-name').textContent = name;
    $('#admin-avatar').textContent = initials(name.replace(/[^a-z0-9]/gi, ' ') || 'SA');
    $('#side-name').textContent = s.namaHub || 'HubPPU Cakung';
    $('#foot-name').textContent = s.namaHub || 'HubPPU Cakung';
    Tpl.logo($('#side-logo'), s);
    const now = new Date();
    $('#chip-month span').textContent = BULAN[now.getMonth()] + ' ' + now.getFullYear();
    this.renderBadges();
    this.renderStats();
    this.initSelectors();
    this.renderBars();
    this.renderColumns();
    this.renderAppTable();
    this.renderFlyerTable();
  },

  renderBadges() {
    $('#badge-apps').textContent = this.data.apps.length;
    $('#badge-flyers').textContent = this.data.flyers.length;
  },

  renderStats() {
    const r = this.data.report;
    const apps = this.data.apps.filter(a => !a._pending || a.id.indexOf('tmp-') !== 0);
    $('#st-total').textContent = fmtNum(r.totalBulan);
    let delta = '<span class="delta flat">Bulan pertama</span>';
    if (r.perubahanPersen !== null && r.perubahanPersen !== undefined) {
      const up = r.perubahanPersen >= 0;
      delta = '<span class="delta ' + (r.perubahanPersen === 0 ? 'flat' : up ? 'up' : 'down') + '">' + (up ? '↑ ' : '↓ ') + Math.abs(r.perubahanPersen).toLocaleString('id-ID') + '%</span> dari bulan lalu';
    }
    $('#st-total-foot').innerHTML = delta;

    $('#st-top').textContent = r.topApp ? r.topApp.nama : 'Belum ada klik';
    $('#st-top').title = r.topApp ? r.topApp.nama : '';
    $('#st-top-foot').innerHTML = r.topApp ? '<span class="tag-soft">' + fmtNum(r.topApp.klik) + ' klik</span> Peringkat #1 bulan ini' : 'Menunggu kunjungan pertama';

    const aktif = apps.filter(a => a.status === 'Tampil').length;
    $('#st-status').textContent = aktif + ' / ' + apps.length;
    $('#st-status-foot').textContent = apps.length
      ? (aktif === apps.length ? 'Semua layanan tampil di portal' : (apps.length - aktif) + ' layanan disembunyikan')
      : 'Belum ada aplikasi';

    $('#st-today').textContent = fmtNum(r.klikHariIni);
    const p = r.perangkatHariIni || {};
    $('#st-today-foot').textContent = 'Ponsel ' + fmtNum(p.Mobile) + ' · Komputer ' + fmtNum(p.Desktop);
  },

  initSelectors() {
    const r = this.data.report;
    if (!this.sel.month) { this.sel.month = r.bulan; this.sel.year = r.tahun; this.sel.trendYear = r.tahun; }
    const years = (r.tahunTersedia || [r.tahun]).slice().sort((a, b) => b - a);
    $('#sel-month').innerHTML = BULAN.map((b, i) => '<option value="' + (i + 1) + '"' + (i + 1 === this.sel.month ? ' selected' : '') + '>Bulan: ' + b + '</option>').join('');
    const yOpt = sel => years.map(y => '<option value="' + y + '"' + (y === sel ? ' selected' : '') + '>Tahun: ' + y + '</option>').join('');
    $('#sel-year').innerHTML = yOpt(this.sel.year);
    $('#sel-trend-year').innerHTML = yOpt(this.sel.trendYear);
  },

  async getReport(bulan, tahun) {
    const key = bulan + '-' + tahun;
    if (this.reports[key]) return this.reports[key];
    const r = await Api.post('getReport', { bulan, tahun }, this.session.token);
    this.reports[key] = r;
    return r;
  },

  async renderBars() {
    const box = $('#bar-list');
    let r;
    try {
      box.style.opacity = '.5';
      r = await this.getReport(this.sel.month, this.sel.year);
    } catch (e) { box.style.opacity = ''; this.handleError(e, 'Gagal memuat laporan'); return; }
    box.style.opacity = '';
    this.currentBars = r;
    const rows = r.perApp.filter(x => x.klik > 0 || !x.dihapus);
    const max = Math.max(1, ...rows.map(x => x.klik));
    box.innerHTML = rows.length && r.totalBulan
      ? rows.map((x, i) => {
        const color = BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)];
        return '<div class="bar-row"><div class="bar-label"><i style="background:' + color + '"></i><span title="' + esc(x.nama) + '">' + esc(x.nama) +
          (x.dihapus ? ' <small class="deleted">(dihapus)</small>' : '') + '</span><em><b>' + fmtNum(x.klik) + ' klik</b> (' + x.persen.toLocaleString('id-ID') + '%)</em></div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + (x.klik / max * 100).toFixed(1) + '%;background:' + color + ';animation-delay:' + (i * 40) + 'ms"></div></div></div>';
      }).join('')
      : '<div class="empty-state"><strong>Belum ada klik pada ' + BULAN[r.bulan - 1] + ' ' + r.tahun + '</strong>Data muncul setelah pengunjung mengetuk kartu aplikasi.</div>';
    $('#avg-daily').innerHTML = 'Rata-rata harian: <strong>' + r.rataHarian.toLocaleString('id-ID') + ' klik/hari</strong>';
  },

  async renderColumns() {
    const box = $('#column-chart');
    let r;
    try {
      box.style.opacity = '.5';
      r = this.sel.trendYear === this.data.report.tahun ? this.data.report : await this.getReport(12, this.sel.trendYear);
    } catch (e) { box.style.opacity = ''; this.handleError(e, 'Gagal memuat tren'); return; }
    box.style.opacity = '';
    const now = new Date();
    const isThisYear = r.tahun === now.getFullYear();
    const max = Math.max(1, ...r.perBulan);
    box.innerHTML = r.perBulan.map((n, i) => {
      const future = isThisYear && i > now.getMonth();
      const cur = isThisYear && i === now.getMonth();
      const h = future ? 0 : Math.max(1.5, n / max * 100);
      return '<div class="col' + (cur ? ' now' : '') + (future ? ' future' : '') + '" title="' + BULAN[i] + ': ' + fmtNum(n) + ' klik">' +
        '<div class="col-bar-wrap">' + (future ? '' : '<span class="col-val">' + fmtNum(n) + '</span>') +
        '<div class="col-bar" style="height:' + (future ? 'auto' : h + '%') + ';animation-delay:' + (i * 30) + 'ms"></div></div>' +
        '<span class="col-lbl">' + BULAN_PENDEK[i] + '</span></div>';
    }).join('');
    $('#total-ytd').textContent = 'Total ' + r.tahun + ': ' + fmtNum(r.totalTahun) + ' klik';
  },

  downloadCsv() {
    const r = this.currentBars;
    if (!r) return;
    const lines = [['Peringkat', 'ID Aplikasi', 'Nama Aplikasi', 'Jumlah Klik', 'Persentase', 'Status']];
    r.perApp.forEach((x, i) => lines.push([i + 1, x.appId, x.nama, x.klik, String(x.persen).replace('.', ',') + '%', x.dihapus ? 'Dihapus' : 'Aktif']));
    lines.push([]);
    lines.push(['', '', 'Total', r.totalBulan, '', '']);
    const csv = '\ufeff' + lines.map(l => l.map(v => '"' + String(v === undefined ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'rekap-klik-' + r.tahun + '-' + String(r.bulan).padStart(2, '0') + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },

  /* ---------- Tabel aplikasi ---------- */
  sorted(kind) {
    return this.data[kind === 'app' ? 'apps' : 'flyers'].slice().sort((a, b) => (a.urutan || 9999) - (b.urutan || 9999));
  },

  clicksOf(appId) {
    const r = this.data.report;
    const x = r && r.perApp.find(p => p.appId === appId);
    return x ? x.klik : 0;
  },

  statusCell(item) {
    const pending = item._pending;
    return '<div class="status-cell"><label class="switch" title="Tampil/Sembunyi"><input type="checkbox" data-toggle' + (item.status === 'Tampil' ? ' checked' : '') + (pending ? ' disabled' : '') +
      ' aria-label="Tampilkan di halaman publik"><i></i></label>' +
      (pending ? '<span class="status-badge pending">Menyimpan…</span>' : '<span class="status-badge ' + (item.status === 'Tampil' ? 'on' : 'off') + '">' + item.status + '</span>') + '</div>';
  },

  orderCell(i, total, canDrag) {
    return '<div class="order-cell">' + (canDrag ? '<span class="grip" title="Seret untuk mengubah urutan"><svg class="ic"><use href="#i-grip"/></svg></span>' : '') +
      '<div class="order-btns"><button type="button" data-move="-1" aria-label="Naikkan"' + (i === 0 ? ' disabled' : '') + '><svg class="ic"><use href="#i-up"/></svg></button>' +
      '<button type="button" data-move="1" aria-label="Turunkan"' + (i === total - 1 ? ' disabled' : '') + '><svg class="ic"><use href="#i-down"/></svg></button></div>' +
      '<span class="order-num">' + (i + 1) + '</span></div>';
  },

  actionCell() {
    return '<td class="col-act"><button type="button" class="icon-btn sm" data-edit aria-label="Ubah"><svg class="ic"><use href="#i-pencil"/></svg></button>' +
      '<button type="button" class="icon-btn sm danger" data-del aria-label="Hapus"><svg class="ic"><use href="#i-trash"/></svg></button></td>';
  },

  renderAppTable() {
    const all = this.sorted('app');
    const q = this.appQuery;
    const list = q ? all.filter(a => (a.nama + ' ' + a.kategori + ' ' + a.link + ' ' + a.deskripsi).toLowerCase().indexOf(q) >= 0) : all;
    const canDrag = !q;
    const tbody = $('#app-tbody');
    if (!all.length) {
      tbody.innerHTML = '<tr class="table-empty"><td colspan="8"><strong>Belum ada aplikasi</strong>Klik "Tambah Aplikasi" untuk membuat kartu pertama.</td></tr>';
    } else if (!list.length) {
      tbody.innerHTML = '<tr class="table-empty"><td colspan="8"><strong>Tidak ditemukan</strong>Tidak ada aplikasi yang cocok dengan "' + esc(q) + '".</td></tr>';
    } else {
      tbody.innerHTML = list.map((a, i) =>
        '<tr data-id="' + esc(a.id) + '"' + (canDrag && !a._pending ? ' draggable="true"' : '') + (a._pending ? ' class="is-pending"' : '') + '>' +
        '<td>' + (canDrag ? this.orderCell(i, list.length, true) : '<span class="order-num">' + (all.indexOf(a) + 1) + '</span>') + '</td>' +
        '<td>' + Tpl.thumb(a, 'thumb') + '</td>' +
        '<td class="name-cell"><strong>' + esc(a.nama) + '</strong>' + (a.deskripsi ? '<small title="' + esc(a.deskripsi) + '">' + esc(a.deskripsi) + '</small>' : '') + '</td>' +
        '<td>' + (a.kategori ? '<span class="cat-chip" data-cat="' + esc(a.kategori) + '">' + esc(a.kategori) + '</span>' : '<span class="hint">–</span>') + '</td>' +
        '<td><a class="url-link" href="' + esc(a.link) + '" target="_blank" rel="noopener"><span>' + esc(prettyUrl(a.link)) + '</span><svg class="ic"><use href="#i-external"/></svg></a></td>' +
        '<td>' + this.statusCell(a) + '</td>' +
        '<td class="num">' + fmtNum(this.clicksOf(a.id)) + '</td>' +
        this.actionCell() + '</tr>').join('');
    }
    $('#app-note').textContent = q
      ? 'Menampilkan ' + list.length + ' dari ' + all.length + ' aplikasi. Hapus pencarian untuk mengubah urutan.'
      : all.length + ' aplikasi terdaftar · ' + all.filter(a => a.status === 'Tampil').length + ' tampil di halaman publik';
  },

  renderFlyerTable() {
    const list = this.sorted('flyer');
    const today = todayLocal();
    const tbody = $('#flyer-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr class="table-empty"><td colspan="6"><strong>Belum ada flyer</strong>Tanpa flyer aktif, area slider di halaman publik disembunyikan otomatis.</td></tr>';
    } else {
      tbody.innerHTML = list.map((f, i) => {
        let period = '<strong>Selalu tampil</strong>';
        if (f.tanggalMulai || f.tanggalSelesai) {
          period = '<strong>' + (f.tanggalMulai ? fmtDate(f.tanggalMulai) : 'Sekarang') + ' – ' + (f.tanggalSelesai ? fmtDate(f.tanggalSelesai) : 'seterusnya') + '</strong>';
          if (f.tanggalMulai && today < f.tanggalMulai) period += '<span class="status-badge warn">Terjadwal</span>';
          else if (f.tanggalSelesai && today > f.tanggalSelesai) period += '<span class="status-badge off">Sudah berakhir</span>';
        }
        return '<tr data-id="' + esc(f.id) + '"' + (!f._pending ? ' draggable="true"' : ' class="is-pending"') + '>' +
          '<td>' + this.orderCell(i, list.length, true) + '</td>' +
          '<td>' + Tpl.thumb({ nama: f.judul, gambarUrl: f.gambarUrl }, 'thumb wide') + '</td>' +
          '<td class="name-cell"><strong>' + esc(f.judul) + '</strong>' + (f.link ? '<small>' + esc(prettyUrl(f.link)) + '</small>' : '<small>Tanpa link · diketuk untuk diperbesar</small>') + '</td>' +
          '<td class="period">' + period + '</td>' +
          '<td>' + this.statusCell(f) + '</td>' + this.actionCell() + '</tr>';
      }).join('');
    }
    const aktif = list.filter(f => f.status === 'Tampil' && (!f.tanggalMulai || today >= f.tanggalMulai) && (!f.tanggalSelesai || today <= f.tanggalSelesai)).length;
    $('#flyer-note').textContent = list.length + ' flyer · ' + aktif + ' sedang tampil di slider';
  },

  refreshLists() {
    this.renderBadges();
    this.renderStats();
    this.renderAppTable();
    this.renderFlyerTable();
    this.persist();
  },

  /* ================= OPTIMISTIC ACTIONS ================= */
  listKey(kind) { return kind === 'app' ? 'apps' : 'flyers'; },
  find(kind, id) { return this.data[this.listKey(kind)].find(x => x.id === id); },

  async toggleStatus(kind, id, checked) {
    const item = this.find(kind, id);
    if (!item) return;
    const prev = item.status;
    item.status = checked ? 'Tampil' : 'Sembunyi';
    this.refreshLists();                        // UI berubah seketika
    try {
      await Api.post(kind === 'app' ? 'setAppStatus' : 'setFlyerStatus', { id, status: item.status }, this.session.token);
      toast((kind === 'app' ? item.nama : item.judul) + (checked ? ' ditampilkan.' : ' disembunyikan.'));
    } catch (e) {
      item.status = prev;                       // batalkan bila gagal
      this.refreshLists();
      this.handleError(e, 'Status tidak tersimpan');
    }
  },

  moveItem(kind, id, toIndex) {
    const list = this.sorted(kind);
    const from = list.findIndex(x => x.id === id);
    if (from < 0 || toIndex < 0 || toIndex >= list.length || from === toIndex) return;
    const [it] = list.splice(from, 1);
    list.splice(toIndex, 0, it);
    list.forEach((x, i) => { x.urutan = i + 1; });
    this.refreshLists();
    this.scheduleReorder(kind);
  },

  scheduleReorder(kind) {
    clearTimeout(this.reorderTimers[kind]);
    this.reorderTimers[kind] = setTimeout(async () => {
      const ids = this.sorted(kind).filter(x => !x._pending).map(x => x.id);
      try {
        await Api.post(kind === 'app' ? 'reorderApps' : 'reorderFlyers', { ids }, this.session.token);
        toast('Urutan tersimpan dan berlaku di halaman publik.');
      } catch (e) {
        this.handleError(e, 'Urutan tidak tersimpan');
        this.bootstrap();
      }
    }, 700);
  },

  confirmDelete(kind, id) {
    const item = this.find(kind, id);
    if (!item) return;
    const name = kind === 'app' ? item.nama : item.judul;
    $('#confirm-title').textContent = kind === 'app' ? 'Hapus aplikasi?' : 'Hapus flyer?';
    $('#confirm-text').textContent = kind === 'app'
      ? '"' + name + '" akan dihapus dari halaman publik dan gambarnya dipindahkan ke Sampah Drive. Data klik lama tetap tersimpan di laporan.'
      : '"' + name + '" akan dihapus dari slider dan gambarnya dipindahkan ke Sampah Drive.';
    const dlg = $('#modal-confirm');
    const ok = $('#confirm-ok');
    ok.onclick = () => { dlg.close(); this.deleteItem(kind, id); };
    dlg.showModal();
  },

  async deleteItem(kind, id) {
    const key = this.listKey(kind);
    const backup = this.data[key].slice();
    const item = this.find(kind, id);
    this.data[key] = this.data[key].filter(x => x.id !== id);
    this.refreshLists();
    try {
      await Api.post(kind === 'app' ? 'deleteApp' : 'deleteFlyer', { id }, this.session.token);
      toast((kind === 'app' ? item.nama : item.judul) + ' dihapus.');
      this.reports = {}; this.reports[this.data.report.bulan + '-' + this.data.report.tahun] = this.data.report;
    } catch (e) {
      this.data[key] = backup;
      this.refreshLists();
      this.handleError(e, 'Gagal menghapus');
    }
  },

  /* ================= MODAL APLIKASI & FLYER ================= */
  openItemModal(kind, item, snapshot) {
    const isApp = kind === 'app';
    const dlg = $(isApp ? '#modal-app' : '#modal-flyer');
    const form = $(isApp ? '#app-form' : '#flyer-form');
    form.reset();
    $$('.invalid', form).forEach(el => el.classList.remove('invalid'));
    $(isApp ? '#app-form-error' : '#flyer-form-error').hidden = true;
    $(isApp ? '#app-drop' : '#flyer-drop').classList.remove('invalid');
    $(isApp ? '#app-file-info' : '#flyer-file-info').textContent = '';
    $(isApp ? '#app-file-info' : '#flyer-file-info').classList.remove('err');

    const src = snapshot || item || {};
    this.editing = { kind, id: item ? item.id : null, image: snapshot ? snapshot.image : null, existingUrl: item ? item.gambarUrl : '' };
    $(isApp ? '#modal-app-title' : '#modal-flyer-title').textContent = (item ? 'Ubah ' : 'Tambah ') + (isApp ? 'aplikasi' : 'flyer');

    const el = form.elements;
    if (isApp) {
      el.nama.value = src.nama || '';
      el.link.value = src.link || '';
      el.deskripsi.value = src.deskripsi || '';
      el.kategori.value = src.kategori || '';
    } else {
      el.judul.value = src.judul || '';
      el.link.value = src.link || '';
      el.tanggalMulai.value = src.tanggalMulai || '';
      el.tanggalSelesai.value = src.tanggalSelesai || '';
    }
    el.urutan.value = src.urutan || (item ? '' : this.data[this.listKey(kind)].length + 1);
    form.querySelector('input[name=status][value="' + (src.status || 'Tampil') + '"]').checked = true;
    if (this.editing.image) $(isApp ? '#app-file-info' : '#flyer-file-info').textContent = 'Gambar baru siap diunggah.';

    refreshCounters(form);
    this.updateItemPreview();
    dlg.showModal();
    setTimeout(() => (isApp ? el.nama : el.judul).focus(), 50);
  },

  updateItemPreview() {
    if (!this.editing) return;
    const isApp = this.editing.kind === 'app';
    const el = $(isApp ? '#app-form' : '#flyer-form').elements;
    const img = this.editing.image ? this.editing.image.dataUrl : this.editing.existingUrl;
    if (isApp) {
      $('#app-preview').innerHTML = Tpl.card({ nama: el.nama.value.trim() || 'Nama aplikasi', deskripsi: el.deskripsi.value.trim(), kategori: el.kategori.value, gambarUrl: img }, false);
    } else {
      $('#flyer-preview').innerHTML = img ? Tpl.slide({ judul: el.judul.value.trim() || 'Judul flyer', gambarUrl: img, link: el.link.value.trim() }, false) : 'Belum ada gambar';
    }
  },

  async pickImage(kind, file) {
    const info = $(kind === 'app' ? '#app-file-info' : '#flyer-file-info');
    info.classList.remove('err');
    info.textContent = 'Mengompres gambar…';
    try {
      const out = await compressImage(file, APP_CONFIG.IMAGE[kind]);
      this.editing.image = out;
      info.textContent = file.name + ' · ' + fmtBytes(out.originalBytes) + ' → ' + fmtBytes(out.bytes) + ' (' + out.width + '×' + out.height + ' px)';
      $(kind === 'app' ? '#app-drop' : '#flyer-drop').classList.remove('invalid');
      this.updateItemPreview();
    } catch (e) {
      info.textContent = e.message;
      info.classList.add('err');
    }
  },

  async submitItem(kind) {
    const isApp = kind === 'app';
    const form = $(isApp ? '#app-form' : '#flyer-form');
    const el = form.elements;
    const errBox = $(isApp ? '#app-form-error' : '#flyer-form-error');
    const errors = [];
    $$('.invalid', form).forEach(x => x.classList.remove('invalid'));

    const payload = {
      id: this.editing.id || '',
      link: el.link.value.trim(),
      status: form.querySelector('input[name=status]:checked').value,
      urutan: Number(el.urutan.value) || 0
    };
    if (isApp) {
      Object.assign(payload, { nama: el.nama.value.trim(), deskripsi: el.deskripsi.value.trim(), kategori: el.kategori.value });
      if (!payload.nama) { errors.push('Nama aplikasi wajib diisi.'); el.nama.classList.add('invalid'); }
      if (!/^https:\/\/\S+$/i.test(payload.link)) { errors.push('Link tujuan wajib diawali https://'); el.link.classList.add('invalid'); }
    } else {
      Object.assign(payload, { judul: el.judul.value.trim(), tanggalMulai: el.tanggalMulai.value, tanggalSelesai: el.tanggalSelesai.value });
      if (!payload.judul) { errors.push('Judul flyer wajib diisi.'); el.judul.classList.add('invalid'); }
      if (payload.link && !/^https:\/\/\S+$/i.test(payload.link)) { errors.push('Link flyer harus diawali https://'); el.link.classList.add('invalid'); }
      if (payload.tanggalMulai && payload.tanggalSelesai && payload.tanggalSelesai < payload.tanggalMulai) {
        errors.push('Tanggal selesai tidak boleh sebelum tanggal mulai.'); el.tanggalSelesai.classList.add('invalid');
      }
    }
    if (!payload.id && !this.editing.image) {
      errors.push('Gambar wajib diunggah.');
      $(isApp ? '#app-drop' : '#flyer-drop').classList.add('invalid');
    }
    if (errors.length) {
      errBox.innerHTML = errors.map(esc).join('<br>');
      errBox.hidden = false;
      return;
    }
    if (this.editing.image) payload.imageBase64 = this.editing.image.dataUrl;

    // ---- Optimistic: tutup modal & tampilkan baris seketika ----
    const key = this.listKey(kind);
    const snapshot = Object.assign({}, payload, { image: this.editing.image });
    const backupList = this.data[key].slice();
    const existing = payload.id ? this.find(kind, payload.id) : null;
    const tempId = payload.id || 'tmp-' + Date.now();
    const optimistic = Object.assign({}, existing || {}, payload, {
      id: tempId,
      gambarUrl: this.editing.image ? this.editing.image.dataUrl : (existing && existing.gambarUrl),
      urutan: payload.urutan || (existing ? existing.urutan : this.data[key].length + 1),
      _pending: true
    });
    delete optimistic.imageBase64;
    this.data[key] = existing ? this.data[key].map(x => x.id === tempId ? optimistic : x) : this.data[key].concat(optimistic);
    const editingItem = existing;
    this.editing = null;
    $(isApp ? '#modal-app' : '#modal-flyer').close();
    this.refreshLists();

    try {
      const saved = await Api.post(isApp ? 'saveApp' : 'saveFlyer', payload, this.session.token);
      this.data[key] = this.data[key].map(x => x.id === tempId ? saved : x);
      this.refreshLists();
      toast((isApp ? saved.nama : saved.judul) + (existing ? ' diperbarui.' : ' ditambahkan ke halaman publik.'));
    } catch (e) {
      this.data[key] = backupList;
      this.refreshLists();
      this.handleError(e, 'Belum tersimpan');
      if (!e.isAuth) this.openItemModal(kind, editingItem, snapshot);  // kembalikan isian agar tidak hilang
    }
  },

  /* ================= PENGATURAN ================= */
  fillSettings() {
    const s = this.data.settings || {};
    const el = $('#settings-form').elements;
    el.namaHub.value = s.namaHub || '';
    el.tagline.value = s.tagline || '';
    el.teksFooter.value = s.teksFooter || '';
    el.warnaUtama.value = s.warnaUtama || '#0EA5E9';
    el.warnaUtamaPicker.value = s.warnaUtama || '#0EA5E9';
    el.kontakWA.value = s.kontakWA ? '0' + String(s.kontakWA).replace(/^62/, '') : '';
    el.kontakTeks.value = s.kontakTeks || '';
    this.settingsDraft = { logo: null, hapusLogo: false };
    refreshCounters($('#settings-form'));
    this.renderSettingsPreview();
  },

  settingsFromForm() {
    const el = $('#settings-form').elements;
    const s = this.data.settings || {};
    let logoUrl = s.logoUrl;
    if (this.settingsDraft.logo) logoUrl = this.settingsDraft.logo.dataUrl;
    if (this.settingsDraft.hapusLogo) logoUrl = '';
    return {
      namaHub: el.namaHub.value.trim(), tagline: el.tagline.value.trim(), teksFooter: el.teksFooter.value.trim(),
      warnaUtama: /^#[0-9a-f]{6}$/i.test(el.warnaUtama.value) ? el.warnaUtama.value : '#0EA5E9',
      kontakWA: el.kontakWA.value.trim(), kontakTeks: el.kontakTeks.value.trim(), logoUrl
    };
  },

  renderSettingsPreview() {
    const s = this.settingsFromForm();
    const box = $('#settings-preview');
    const today = todayLocal();

    // Kartu: maks. 4 aplikasi tampil; bila kurang, dilengkapi contoh agar grid 2 kolom terlihat utuh
    const samples = [
      { nama: 'Contoh aplikasi', deskripsi: 'Deskripsi singkat kartu', kategori: 'Umum' },
      { nama: 'Aplikasi kedua', deskripsi: 'Deskripsi singkat kartu', kategori: 'Umum' }
    ];
    let apps = this.sorted('app').filter(a => a.status === 'Tampil').slice(0, 4);
    if (apps.length < 2) apps = apps.concat(samples.slice(0, 2 - apps.length));

    // Flyer: yang pertama sedang tayang (status Tampil & dalam periode)
    const flyer = this.sorted('flyer').find(f => f.status === 'Tampil' &&
      (!f.tanggalMulai || today >= f.tanggalMulai) && (!f.tanggalSelesai || today <= f.tanggalSelesai));

    box.innerHTML =
      '<header class="pub-header"><div class="pub-header-inner"><div class="brand"><div class="brand-logo" data-logo></div><div class="brand-text"><h1>' + esc(s.namaHub || 'Nama hub') + '</h1>' +
      (s.tagline ? '<p>' + esc(s.tagline) + '</p>' : '') + '</div></div></div></header>' +
      '<div class="mini-body">' +
        '<div class="search-bar"><svg class="ic"><use href="#i-search"/></svg><span>Cari layanan…</span></div>' +
        (flyer ? '<div class="hero">' + Tpl.slide(flyer, false) + '<div class="hero-foot"><div class="hero-dots"><button type="button" aria-selected="true" tabindex="-1"></button></div></div></div>' : '') +
        '<div class="apps"><div class="apps-head"><h2>Aplikasi Kami</h2></div><div class="app-grid">' + apps.map(a => Tpl.card(a, false)).join('') + '</div></div>' +
        (s.kontakWA ? '<div class="contact-banner"><div><strong>Butuh bantuan langsung?</strong><span>' + esc(s.kontakTeks) + '</span></div><span class="contact-btn"><svg class="ic"><use href="#i-phone"/></svg>Kontak</span></div>' : '') +
      '</div>' +
      '<footer class="pub-footer"><p class="pub-values">Cepat <i></i> Terintegrasi <i></i> Transparan</p>' +
      '<p style="font-size:11px;color:var(--muted)">' + esc(s.teksFooter) + '</p></footer>';
    Tpl.logo($('[data-logo]', box), s);
    Tpl.logo($('#set-logo-preview'), s);
    applyTheme(box, s.warnaUtama);
    $('#set-logo-remove').hidden = !s.logoUrl;
  },

  async saveSettings(e) {
    e.preventDefault();
    const form = $('#settings-form');
    const el = form.elements;
    if (!el.namaHub.value.trim()) { el.namaHub.classList.add('invalid'); toast('Nama hub wajib diisi.', 'error'); return; }
    el.namaHub.classList.remove('invalid');
    const s = this.settingsFromForm();
    const payload = { namaHub: s.namaHub, tagline: s.tagline, teksFooter: s.teksFooter, warnaUtama: s.warnaUtama, kontakWA: s.kontakWA, kontakTeks: s.kontakTeks };
    if (this.settingsDraft.logo) payload.logoBase64 = this.settingsDraft.logo.dataUrl;
    if (this.settingsDraft.hapusLogo) payload.hapusLogo = true;
    const btn = $('#settings-save');
    setLoading(btn, true);
    try {
      const saved = await Api.post('saveSettings', payload, this.session.token);
      this.data.settings = saved;
      this.persist();
      this.renderAll();
      this.fillSettings();
      LS.remove(APP_CONFIG.PUBLIC_CACHE_KEY);
      toast('Pengaturan tersimpan.');
    } catch (err) {
      this.handleError(err, 'Pengaturan tidak tersimpan');
    } finally {
      setLoading(btn, false);
    }
  },

  /* ================= LOG ================= */
  async loadLogs(page) {
    const tbody = $('#log-tbody');
    if (!this.logData) tbody.innerHTML = '<tr class="table-empty"><td colspan="4">Memuat log…</td></tr>';
    else tbody.style.opacity = '.5';
    try {
      const d = await Api.post('getLogs', { page }, this.session.token);
      this.logData = d;
      this.logPage = d.page;
      tbody.style.opacity = '';
      tbody.innerHTML = d.items.length ? d.items.map(l => {
        const lab = LOG_LABEL[l.aksi] || [l.aksi, ''];
        return '<tr><td class="log-time">' + esc(fmtDateTime(l.waktu)) + '</td><td><span class="log-action ' + lab[1] + '">' + esc(lab[0]) + '</span></td>' +
          '<td>' + esc(l.detail) + '<br><small class="hint">oleh ' + esc(l.username) + '</small></td><td class="hint">' + esc(l.target) + '</td></tr>';
      }).join('') : '<tr class="table-empty"><td colspan="4"><strong>Belum ada aktivitas</strong></td></tr>';
      const from = d.total ? (d.page - 1) * 50 + 1 : 0;
      $('#log-info').textContent = 'Menampilkan ' + from + '–' + Math.min(d.page * 50, d.total) + ' dari ' + fmtNum(d.total) + ' aktivitas';
      $('#log-page').textContent = d.page;
      $('#log-prev').disabled = d.page <= 1;
      $('#log-next').disabled = d.page >= d.pages;
    } catch (e) {
      tbody.style.opacity = '';
      this.handleError(e, 'Gagal memuat log');
    }
  },

  /* ================= PASSWORD ================= */
  openPassword(forced) {
    const dlg = $('#modal-password');
    if (dlg.open) return;
    const form = $('#password-form');
    form.reset();
    $('#pw-error').hidden = true;
    $('#pw-forced').hidden = !forced;
    $('#pw-close').hidden = !!forced;
    $('#pw-cancel').hidden = !!forced;
    dlg.dataset.forced = forced ? '1' : '';
    dlg.showModal();
  },

  async submitPassword(e) {
    e.preventDefault();
    const el = $('#password-form').elements;
    const err = $('#pw-error');
    const show = m => { err.textContent = m; err.hidden = false; };
    if (!el.oldPassword.value) return show('Isi password lama.');
    if (el.newPassword.value.length < 8) return show('Password baru minimal 8 karakter.');
    if (el.newPassword.value !== el.confirmPassword.value) return show('Konfirmasi password tidak sama.');
    if (el.newPassword.value === el.oldPassword.value) return show('Password baru harus berbeda dari password lama.');
    const btn = $('#pw-submit');
    setLoading(btn, true);
    try {
      await Api.post('changePassword', { oldPassword: el.oldPassword.value, newPassword: el.newPassword.value }, this.session.token);
      this.session.mustChange = false;
      SS.set(APP_CONFIG.ADMIN_SESSION_KEY, this.session);
      $('#modal-password').close();
      toast('Password berhasil diganti.');
    } catch (ex) {
      if (ex.isAuth) { $('#modal-password').close(); this.handleError(ex); }
      else show(ex.message);
    } finally {
      setLoading(btn, false);
    }
  },

  async logout() {
    const token = this.session && this.session.token;
    this.clearSession();
    if (token) Api.post('logout', {}, token).catch(() => {});  // fire & forget
    toast('Anda sudah keluar.', 'info');
    location.hash = '#/admin';
    this.showLogin();
  },

  /* ================= LOGIN ================= */
  async submitLogin(e) {
    e.preventDefault();
    const form = $('#login-form');
    const err = $('#login-error');
    err.removeAttribute('style');
    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    if (!username || !password) { err.textContent = 'Isi username dan password.'; err.hidden = false; return; }
    const btn = $('#login-submit');
    setLoading(btn, true);
    err.hidden = true;
    try {
      const d = await Api.post('login', { username, password });
      this.session = { token: d.token, username: d.username, mustChange: d.wajibGantiPassword };
      SS.set(APP_CONFIG.ADMIN_SESSION_KEY, this.session);
      form.reset();
      const target = location.hash.indexOf('#/admin/') === 0 ? location.hash.split('/')[2] : 'dashboard';
      this.open(target);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    } finally {
      setLoading(btn, false);
    }
  },

  /* ================= EVENT BINDING (sekali) ================= */
  bindOnce() {
    if (this.bound) return;
    this.bound = true;

    $('#login-form').addEventListener('submit', e => this.submitLogin(e));
    $$('[data-toggle-pw]').forEach(b => b.addEventListener('click', () => {
      const inp = b.parentElement.querySelector('input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    }));

    $('#btn-menu').addEventListener('click', () => $('#view-admin').classList.add('nav-open'));
    $('#sidebar-scrim').addEventListener('click', () => $('#view-admin').classList.remove('nav-open'));
    $('#btn-logout').addEventListener('click', () => this.logout());
    $('#btn-change-pw').addEventListener('click', () => this.openPassword(false));

    // Dashboard
    $('#sel-month').addEventListener('change', e => { this.sel.month = Number(e.target.value); this.renderBars(); });
    $('#sel-year').addEventListener('change', e => { this.sel.year = Number(e.target.value); this.renderBars(); });
    $('#sel-trend-year').addEventListener('change', e => { this.sel.trendYear = Number(e.target.value); this.renderColumns(); });
    $('#btn-csv').addEventListener('click', () => this.downloadCsv());

    // Tabel (delegasi event untuk aplikasi & flyer)
    this.bindTable('#app-tbody', 'app');
    this.bindTable('#flyer-tbody', 'flyer');
    $('#app-search').addEventListener('input', debounce(e => { this.appQuery = e.target.value.trim().toLowerCase(); this.renderAppTable(); }, 150));
    $('#btn-add-app').addEventListener('click', () => this.openItemModal('app', null));
    $('#btn-add-flyer').addEventListener('click', () => this.openItemModal('flyer', null));

    // Modal
    ['app', 'flyer'].forEach(kind => {
      const form = $(kind === 'app' ? '#app-form' : '#flyer-form');
      bindCounters(form);
      form.addEventListener('input', () => this.updateItemPreview());
      form.addEventListener('change', () => this.updateItemPreview());
      form.addEventListener('submit', e => { e.preventDefault(); this.submitItem(kind); });
      bindDropzone($(kind === 'app' ? '#app-drop' : '#flyer-drop'), $(kind === 'app' ? '#app-file' : '#flyer-file'), f => this.pickImage(kind, f));
    });
    $$('dialog.modal').forEach(dlg => {
      dlg.addEventListener('click', e => {
        if (e.target.closest('[data-close]') || (e.target === dlg && !dlg.dataset.forced)) dlg.close();
      });
      dlg.addEventListener('cancel', e => { if (dlg.dataset.forced) e.preventDefault(); });
    });

    // Password
    $('#password-form').addEventListener('submit', e => this.submitPassword(e));

    // Pengaturan
    const sf = $('#settings-form');
    bindCounters(sf);
    sf.addEventListener('input', e => {
      if (e.target.name === 'warnaUtamaPicker') sf.elements.warnaUtama.value = e.target.value.toUpperCase();
      if (e.target.name === 'warnaUtama' && /^#[0-9a-f]{6}$/i.test(e.target.value)) sf.elements.warnaUtamaPicker.value = e.target.value;
      this.renderSettingsPreview();
    });
    sf.addEventListener('submit', e => this.saveSettings(e));
    $('#set-logo-file').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        this.settingsDraft.logo = await compressImage(f, APP_CONFIG.IMAGE.logo);
        this.settingsDraft.hapusLogo = false;
        this.renderSettingsPreview();
      } catch (ex) { toast(ex.message, 'error'); }
    });
    $('#set-logo-remove').addEventListener('click', () => {
      this.settingsDraft = { logo: null, hapusLogo: true };
      this.renderSettingsPreview();
    });

    // Log
    $('#log-prev').addEventListener('click', () => this.loadLogs(this.logPage - 1));
    $('#log-next').addEventListener('click', () => this.loadLogs(this.logPage + 1));
    $('#btn-log-refresh').addEventListener('click', () => this.loadLogs(1));
  },

  bindTable(sel, kind) {
    const tbody = $(sel);
    tbody.addEventListener('click', e => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const id = tr.dataset.id;
      if (e.target.closest('[data-edit]')) this.openItemModal(kind, this.find(kind, id));
      else if (e.target.closest('[data-del]')) this.confirmDelete(kind, id);
      else {
        const mv = e.target.closest('[data-move]');
        if (mv) {
          const list = this.sorted(kind);
          this.moveItem(kind, id, list.findIndex(x => x.id === id) + Number(mv.dataset.move));
        }
      }
    });
    tbody.addEventListener('change', e => {
      if (!e.target.matches('[data-toggle]')) return;
      const tr = e.target.closest('tr[data-id]');
      this.toggleStatus(kind, tr.dataset.id, e.target.checked);
    });

    // Drag & drop baris (desktop). Di layar sentuh gunakan tombol panah.
    let dragId = null;
    const clearMarks = () => $$('tr.drop-before, tr.drop-after', tbody).forEach(r => r.classList.remove('drop-before', 'drop-after'));
    tbody.addEventListener('dragstart', e => {
      const tr = e.target.closest('tr[draggable]');
      if (!tr) return;
      dragId = tr.dataset.id;
      tr.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
    });
    tbody.addEventListener('dragover', e => {
      const tr = e.target.closest('tr[data-id]');
      if (!dragId || !tr) return;
      e.preventDefault();
      clearMarks();
      if (tr.dataset.id === dragId) return;
      const rect = tr.getBoundingClientRect();
      tr.classList.add(e.clientY < rect.top + rect.height / 2 ? 'drop-before' : 'drop-after');
    });
    tbody.addEventListener('drop', e => {
      const tr = e.target.closest('tr[data-id]');
      if (!dragId || !tr) return;
      e.preventDefault();
      const after = tr.classList.contains('drop-after');
      const list = this.sorted(kind).filter(x => x.id !== dragId);
      let idx = list.findIndex(x => x.id === tr.dataset.id);
      if (idx < 0) return;
      if (after) idx++;
      clearMarks();
      const id = dragId;
      dragId = null;
      this.moveItem(kind, id, idx);
    });
    tbody.addEventListener('dragend', () => {
      dragId = null;
      clearMarks();
      $$('tr.dragging', tbody).forEach(r => r.classList.remove('dragging'));
    });
  }
};
