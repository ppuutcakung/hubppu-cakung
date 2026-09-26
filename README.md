# HubPPU Cakung

Satu pintu untuk semua layanan digital PPU Cakung — halaman tautan (mirip Linktree) dengan slider flyer, kartu aplikasi, dan panel Super Admin.

## Arsitektur
- **Frontend (folder ini):** HTML/CSS/JS murni, di-hosting di GitHub Pages.
- **Backend:** Google Apps Script (`Kode.gs`, dipasang terpisah) sebagai REST API JSON, data di Google Sheets, gambar di Google Drive.

## Struktur
```
index.html          SPA: halaman publik, login, panel admin
css/style.css       Token desain "Government Portal Modern Clean"
js/config.js        ← ISI GAS_URL DI SINI
js/utils.js         Helper, toast, kompres gambar
js/api.js           Komunikasi fetch ke GAS
js/demo.js          Backend tiruan untuk Mode Demo
js/public.js        Halaman publik
js/admin.js         Panel Super Admin
js/app.js           Router
```

## Alamat
- Publik: `https://USERNAME.github.io/hubppu-cakung/`
- Admin: tambahkan `#/admin` di akhir alamat, atau klik **Login Admin** di footer.

## Mode Demo
Selama `GAS_URL` di `js/config.js` belum diisi, aplikasi memakai data contoh di browser. Login demo: `superadmin` / `demo12345`.

Instalasi lengkap: lihat **PANDUAN-INSTALASI.md**.
