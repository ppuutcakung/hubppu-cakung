/* ============================================================
   HALAMAN PUBLIK
   Pola instant UX: render dari cache localStorage (0 ms),
   lalu segarkan dari server di latar belakang.
   ============================================================ */

/* ---------- Template bersama (dipakai juga oleh pratinjau admin) ---------- */
const Tpl = {
  thumb(item, cls = 'app-thumb') {
    const img = item.gambarUrl
      ? '<img src="' + esc(item.gambarUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback="' + esc(initials(item.nama)) + '">'
      : '<span class="app-initials">' + esc(initials(item.nama)) + '</span>';
    return '<div class="' + cls + '">' + img + '</div>';
  },

  card(app, asLink = true) {
    const tag = asLink ? 'a' : 'div';
    const attrs = asLink
      ? ' href="' + esc(app.link) + '" target="_blank" rel="noopener" data-id="' + esc(app.id) + '"'
      : '';
    return '<' + tag + ' class="app-card"' + attrs + '>' +
      Tpl.thumb(app) +
      '<div class="app-meta">' + (app.kategori ? '<span class="cat-chip" data-cat="' + esc(app.kategori) + '">' + esc(app.kategori) + '</span>' : '') + '<span class="live-dot" title="Layanan aktif"></span></div>' +
      '<h3 class="app-title">' + esc(app.nama || 'Nama aplikasi') + '</h3>' +
      (app.deskripsi ? '<p class="app-desc">' + esc(app.deskripsi) + '</p>' : '') +
      '<span class="app-cta">Buka layanan<svg class="ic"><use href="#i-arrow"/></svg></span>' +
      '</' + tag + '>';
  },

  slide(f, interactive = true) {
    const caption = '<div class="hero-caption"><span class="hero-badge">Informasi terkini</span><h3>' + esc(f.judul) + '</h3>' +
      (f.link ? '<span class="hero-go">Lihat selengkapnya<svg class="ic"><use href="#i-arrow"/></svg></span>' : '') + '</div>';
    const img = f.gambarUrl ? '<img src="' + esc(f.gambarUrl) + '" alt="' + esc(f.judul) + '" referrerpolicy="no-referrer">' : '';
    if (!interactive) return '<div class="hero-slide">' + img + caption + '</div>';
    if (f.link) return '<a class="hero-slide" href="' + esc(f.link) + '" target="_blank" rel="noopener">' + img + caption + '</a>';
    return '<button type="button" class="hero-slide" data-zoom="' + esc(f.gambarUrl) + '" data-alt="' + esc(f.judul) + '" aria-label="Perbesar flyer ' + esc(f.judul) + '">' + img + caption + '</button>';
  },

  logo(el, settings) {
    el.innerHTML = settings && settings.logoUrl
      ? '<img src="' + esc(settings.logoUrl) + '" alt="Logo" referrerpolicy="no-referrer">'
      : '<svg class="ic"><use href="#i-hub"/></svg>';
  },

  waLink(num) {
    return 'https://wa.me/' + String(num || '').replace(/\D/g, '');
  }
};

/* Fallback inisial saat gambar gagal dimuat (AC4) — 1 listener untuk semua */
document.addEventListener('error', e => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.dataset.fallback) return;
  const span = document.createElement('span');
  span.className = 'app-initials';
  span.textContent = img.dataset.fallback;
  img.replaceWith(span);
}, true);

/* ---------- Controller halaman publik ---------- */
const Pub = {
  started: false,
  data: null,
  category: 'Semua',
  query: '',
  slideIdx: 0,
  timer: null,
  paused: false,

  start() {
    if (this.started) { this.startAutoplay(); return; }
    this.started = true;
    this.bind();

    const cached = LS.get(APP_CONFIG.PUBLIC_CACHE_KEY);
    if (cached) this.render(cached); else this.renderSkeleton();
    this.refresh(!!cached);
  },

  async refresh(silent) {
    try {
      const data = await Api.get('public');
      const changed = JSON.stringify(data.apps) + JSON.stringify(data.flyers) + JSON.stringify(data.settings);
      const before = this.data ? JSON.stringify(this.data.apps) + JSON.stringify(this.data.flyers) + JSON.stringify(this.data.settings) : '';
      LS.set(APP_CONFIG.PUBLIC_CACHE_KEY, data);
      if (changed !== before) this.render(data);
    } catch (e) {
      if (!silent || !this.data) {
        $('#app-grid').innerHTML = '';
        const empty = $('#app-empty');
        empty.innerHTML = '<strong>Daftar layanan belum bisa dimuat</strong>' + esc(e.message) +
          '<br><button type="button" class="btn btn-soft" id="btn-retry">Coba lagi</button>';
        empty.hidden = false;
        $('#app-count').textContent = 'Offline';
        $('#btn-retry').addEventListener('click', () => { empty.hidden = true; this.renderSkeleton(); this.refresh(false); });
      }
    }
  },

  bind() {
    const search = $('#pub-search');
    const clearBtn = $('#pub-search-clear');
    const onSearch = debounce(() => { this.query = search.value.trim().toLowerCase(); this.renderGrid(); }, 150);
    search.addEventListener('input', () => { clearBtn.hidden = !search.value; onSearch(); });
    clearBtn.addEventListener('click', () => { search.value = ''; clearBtn.hidden = true; this.query = ''; this.renderGrid(); search.focus(); });

    $('#chips').addEventListener('click', e => {
      const b = e.target.closest('button[data-cat]');
      if (!b) return;
      this.category = b.dataset.cat;
      $$('#chips button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      this.renderGrid();
    });

    // Klik kartu: link terbuka normal (tanpa menunggu), log dikirim di latar belakang
    $('#app-grid').addEventListener('click', e => {
      const card = e.target.closest('.app-card[data-id]');
      if (card) Api.logClick(card.dataset.id);
    });

    // Slider
    const track = $('#hero-track');
    track.addEventListener('scroll', debounce(() => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      if (idx !== this.slideIdx) { this.slideIdx = idx; this.updateDots(); }
    }, 60), { passive: true });
    ['pointerdown', 'mouseenter', 'focusin'].forEach(ev => track.addEventListener(ev, () => { this.paused = true; }));
    ['mouseleave', 'focusout'].forEach(ev => track.addEventListener(ev, () => { this.paused = false; }));
    track.addEventListener('pointerup', () => setTimeout(() => { this.paused = false; }, 4000));
    track.addEventListener('click', e => {
      const z = e.target.closest('[data-zoom]');
      if (z) this.openLightbox(z.dataset.zoom, z.dataset.alt);
    });
    $('#hero-dots').addEventListener('click', e => {
      const b = e.target.closest('button[data-i]');
      if (b) this.goTo(Number(b.dataset.i));
    });
    document.addEventListener('visibilitychange', () => { this.paused = document.hidden; });

    $('#btn-share').addEventListener('click', () => this.share());

    const lb = $('#lightbox');
    lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('[data-close]')) lb.close(); });
  },

  renderSkeleton() {
    $('#app-grid').innerHTML = Array.from({ length: 6 }, () =>
      '<div class="sk-card" aria-hidden="true"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>').join('');
    $('#app-count').textContent = 'Memuat…';
  },

  render(data) {
    this.data = data;
    const s = data.settings || {};
    applyTheme(null, s.warnaUtama);
    document.title = s.namaHub || 'HubPPU Cakung';
    $('#pub-name').textContent = s.namaHub || 'HubPPU Cakung';
    $('#pub-tagline').textContent = s.tagline || '';
    $('#pub-tagline').hidden = !s.tagline;
    $('#pub-footer-text').textContent = s.teksFooter || '';
    Tpl.logo($('#pub-logo'), s);

    const banner = $('#contact-banner');
    if (s.kontakWA) {
      banner.href = Tpl.waLink(s.kontakWA);
      $('#contact-text').textContent = s.kontakTeks || 'Tim kami siap membantu.';
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }

    this.renderHero(data.flyers || []);
    this.renderChips(data.apps || []);
    this.renderGrid();
  },

  renderHero(flyers) {
    const hero = $('#hero');
    this.stopAutoplay();
    if (!flyers.length) { hero.hidden = true; return; }  // AC4: area slider disembunyikan
    hero.hidden = false;
    $('#hero-track').innerHTML = flyers.map(f => Tpl.slide(f)).join('');
    $('#hero-dots').innerHTML = flyers.length > 1
      ? flyers.map((f, i) => '<button type="button" role="tab" data-i="' + i + '" aria-label="Flyer ' + (i + 1) + '"></button>').join('')
      : '';
    this.slideIdx = 0;
    this.updateDots();
    this.startAutoplay();
  },

  updateDots() {
    $$('#hero-dots button').forEach((b, i) => b.setAttribute('aria-selected', String(i === this.slideIdx)));
  },

  goTo(i) {
    const track = $('#hero-track');
    const n = track.children.length;
    if (!n) return;
    this.slideIdx = (i + n) % n;
    track.scrollTo({ left: this.slideIdx * track.clientWidth, behavior: 'smooth' });
    this.updateDots();
  },

  startAutoplay() {
    this.stopAutoplay();
    if (!this.data || (this.data.flyers || []).length < 2) return;
    this.timer = setInterval(() => {
      if (!this.paused && !$('#view-public').hidden) this.goTo(this.slideIdx + 1);
    }, APP_CONFIG.SLIDE_INTERVAL_MS);
  },

  stopAutoplay() { clearInterval(this.timer); this.timer = null; },

  renderChips(apps) {
    const cats = ['Semua'].concat(['Tim Internal', 'UMKM', 'Stakeholder', 'Umum'].filter(c => apps.some(a => a.kategori === c)));
    if (cats.indexOf(this.category) < 0) this.category = 'Semua';
    const chips = $('#chips');
    chips.hidden = cats.length < 3;  // tidak perlu filter jika hanya 1 kategori
    chips.innerHTML = cats.map(c => '<button type="button" data-cat="' + esc(c) + '" aria-pressed="' + (c === this.category) + '">' + esc(c) + '</button>').join('');
  },

  renderGrid() {
    if (!this.data) return;
    const all = this.data.apps || [];
    const q = this.query;
    const list = all.filter(a =>
      (this.category === 'Semua' || a.kategori === this.category) &&
      (!q || (a.nama + ' ' + (a.deskripsi || '') + ' ' + (a.kategori || '')).toLowerCase().indexOf(q) >= 0));

    $('#app-count').textContent = all.length + ' layanan tersedia';
    $('#app-grid').innerHTML = list.map(a => Tpl.card(a)).join('');

    const empty = $('#app-empty');
    if (!all.length) {
      empty.innerHTML = '<strong>Belum ada layanan</strong>Daftar aplikasi sedang disiapkan oleh pengelola.';
      empty.hidden = false;
    } else if (!list.length) {
      empty.innerHTML = '<strong>Tidak ada layanan yang cocok</strong>Coba kata kunci lain atau pilih kategori "Semua".';
      empty.hidden = false;
    } else {
      empty.hidden = true;
    }
  },

  openLightbox(src, alt) {
    const lb = $('#lightbox');
    const img = $('#lightbox-img');
    img.src = String(src).replace(/sz=w\d+/, 'sz=w2000');
    img.alt = alt || '';
    lb.showModal();
  },

  async share() {
    const url = location.origin + location.pathname;
    const title = (this.data && this.data.settings && this.data.settings.namaHub) || document.title;
    if (navigator.share) {
      try { await navigator.share({ title, text: 'Semua layanan dalam satu link', url }); } catch (e) { /* dibatalkan */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Link hub disalin ke clipboard.');
    } catch (e) {
      toast('Salin link ini: ' + url, 'info', 6000);
    }
  }
};
