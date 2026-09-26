# Panduan Instalasi HubPPU Cakung

Aplikasi ini terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs` (berkas terpisah, tidak ada di dalam ZIP) | Google Apps Script — menyimpan data di Google Sheets & gambar di Google Drive |
| **Frontend** | Isi ZIP `hubppu-cakung.zip` (`index.html`, `css/`, `js/`) | GitHub Pages — tampilan yang dibuka pengunjung & admin |

Urutannya: **pasang backend dulu** (untuk mendapatkan URL API), lalu isi URL itu ke frontend, baru unggah frontend ke GitHub.

> 💡 **Ingin melihat dulu sebelum instalasi?** Buka `index.html` di browser. Selama URL backend belum diisi, aplikasi berjalan dalam **Mode Demo** dengan data contoh. Login admin demo: `superadmin` / `demo12345`. Data demo tidak tersimpan ke mana pun.

---

## BAGIAN A — Backend (Google Apps Script)

Gunakan akun Google kantor yang akan menjadi "pemilik" data. Semua spreadsheet dan folder akan dibuat di Google Drive akun ini.

### A1. Buat proyek Apps Script
1. Buka **https://script.google.com** → klik **Proyek baru**.
2. Klik judul "Proyek tanpa judul" di kiri atas → ganti menjadi **HubPPU Cakung API**.

### A2. Tempel kode
1. Di editor, buka berkas `Kode.gs` yang sudah ada, **hapus semua isinya**.
2. Buka berkas `Kode.gs` dari paket ini, salin seluruh isinya (Ctrl+A → Ctrl+C), tempel ke editor (Ctrl+V).
3. Tekan **Ctrl+S** untuk menyimpan.

### A3. Atur zona waktu (penting untuk rekap harian)
1. Klik ikon **⚙️ Setelan proyek** di sidebar kiri.
2. Pada **Zona waktu**, pilih **(GMT+07:00) Jakarta**.

### A4. Jalankan `setupAwal` — SEKALI SAJA
1. Kembali ke **Editor** (ikon `< >`).
2. Di toolbar atas, pada menu pilihan fungsi, pilih **`setupAwal`** → klik **▶ Jalankan**.
3. Muncul jendela izin: **Tinjau izin** → pilih akun Anda → jika muncul "Google belum memverifikasi aplikasi ini", klik **Lanjutan** → **Buka HubPPU Cakung API (tidak aman)** → **Izinkan**. (Ini wajar karena skripnya milik Anda sendiri.)
4. Tunggu sampai **Log eksekusi** menampilkan `SETUP SELESAI`.
5. **Catat Username dan Password** yang tampil di log. Password dibuat acak dan **hanya tampil sekali di sini**. Anda wajib menggantinya saat login pertama.

Yang dibuat otomatis oleh `setupAwal`:
- Spreadsheet **DB_HubPPU_Cakung** dengan sheet: Aplikasi, Flyer, LogKlik, RekapBulanan, LogAktivitas, Admin, Pengaturan.
- Folder Drive **HubPPU_Cakung_Assets** berisi `Gambar_Aplikasi`, `Flyer`, `Logo`.
- Trigger **rekapHarian** setiap hari sekitar pukul 01.00.
- Akun admin `superadmin`.

> ⛔ Jangan menjalankan `setupAwal` dua kali. Skrip akan menolak agar data tidak terduplikasi.

### A5. Deploy sebagai Web App
1. Klik **Terapkan (Deploy)** → **Deployment baru**.
2. Klik ikon ⚙️ di samping "Pilih jenis" → pilih **Aplikasi web**.
3. Isi:
   - **Deskripsi:** `v1`
   - **Jalankan sebagai:** **Saya** (akun Anda)
   - **Yang memiliki akses:** **Siapa saja** (Anyone)
4. Klik **Terapkan** → salin **URL aplikasi web** yang berakhiran **`/exec`**.

> Kenapa "Siapa saja"? Halaman publik harus bisa mengambil daftar aplikasi tanpa login Google. Aksi admin tetap aman karena setiap permintaan admin wajib membawa token sesi dari login HubPPU.

### A6. Uji URL
Tempel URL `/exec` di browser dengan tambahan `?action=ping` di belakangnya, contoh:
`https://script.google.com/macros/s/AKfy.../exec?action=ping`
Jika muncul teks JSON berisi `"success":true`, backend siap.

---

## BAGIAN B — Isi URL backend ke frontend

1. Ekstrak `hubppu-cakung.zip`. Hasilnya satu folder bernama **`hubppu-cakung`** yang langsung berisi `index.html`, folder `css`, dan folder `js`.
2. Buka `hubppu-cakung/js/config.js` dengan Notepad (klik kanan → Buka dengan → Notepad).
3. Ganti baris:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/XXXX/exec';
   ```
   dengan URL `/exec` Anda dari langkah A5. Pastikan tetap diapit tanda kutip tunggal `'...'`.
4. Simpan (Ctrl+S).

Setelah URL diisi, Mode Demo otomatis nonaktif dan aplikasi memakai data asli.

---

## BAGIAN C — Unggah frontend ke GitHub Pages (lewat terminal)

> ⚠️ **Jangan memakai tombol "Upload files" di situs GitHub.** Cara itu membuat semua berkas rata tanpa folder `css/` dan `js/`, sehingga tampilan rusak. Selalu gunakan perintah git dari terminal.

### C1. Pasang Git
- **Windows:** unduh dari https://git-scm.com/download/win, pasang dengan pengaturan bawaan.
- **Mac:** buka Terminal, ketik `git --version`; jika belum ada, macOS menawarkan pemasangan otomatis.

Periksa:
```bash
git --version
```

### C2. Buat akun GitHub
Daftar di https://github.com. Username Anda akan menjadi bagian alamat situs (`username.github.io`), jadi pilih yang rapi.

### C3. Atur identitas Git (sekali saja per komputer)
```bash
git config --global user.name "Nama Lengkap Anda"
git config --global user.email "email-akun-github@contoh.com"
```
`user.name` hanya label riwayat, bebas diisi.

### C4. Buat repository baru
Di github.com: tombol **+** → **New repository**
- **Repository name:** misalnya `hubppu-cakung`
- Pilih **Public** (wajib untuk GitHub Pages gratis — aman, karena frontend tidak memuat password apa pun)
- **Jangan** centang Add README / .gitignore / license
- Klik **Create repository**, biarkan halamannya terbuka.

### C5. Masuk ke folder yang BENAR
Folder kerja Anda adalah **folder `hubppu-cakung` hasil ekstraksi ZIP** — folder yang di dalamnya langsung terlihat `index.html`. Jangan masuk lebih dalam (misalnya ke `js`) dan jangan naik ke folder induknya.

Cara cepat di Windows: buka folder `hubppu-cakung` di File Explorer → klik address bar → ketik `powershell` → Enter.

Periksa isinya:
```powershell
dir
```
Wajib terlihat: `css`, `js`, `index.html`, `PANDUAN-INSTALASI.md`, `README.md`. **Jika `index.html` tidak terlihat, berhenti dulu** — Anda berada di folder yang salah.

### C6. Kirim ke GitHub
Jalankan satu per satu:
```bash
git init
git add .
git commit -m "Upload pertama HubPPU Cakung"
```
```bash
git branch -M main
git remote add origin https://github.com/USERNAME/hubppu-cakung.git
git push -u origin main
```
Ganti `USERNAME` dengan username GitHub Anda.

Saat diminta:
- **Username:** username GitHub
- **Password:** tempel **Personal Access Token** (bukan password akun). Saat menempel, layar memang terlihat kosong — itu normal, tekan Enter.

**Membuat token (jika belum punya):** buka https://github.com/settings/tokens → **Generate new token (classic)** → Note: `git-push` → Expiration: 90 days → centang **repo** → **Generate token** → salin token `ghp_...` (hanya tampil sekali, simpan di Notepad).

Tanda berhasil: muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### C7. Aktifkan GitHub Pages
1. Buka repository di github.com → cek bahwa terlihat folder `css`, `js`, dan `index.html` di halaman utama repo.
2. **Settings** → **Pages** (sidebar kiri):
   - Source: **Deploy from a branch**
   - Branch: **main** · **/ (root)** → **Save**
   - Centang **Enforce HTTPS**
3. Tunggu 1–2 menit, muat ulang. Alamat situs muncul: `https://USERNAME.github.io/hubppu-cakung/`

---

## BAGIAN D — Uji dan penggunaan pertama

1. Buka alamat situs. Halaman publik tampil (masih kosong karena belum ada aplikasi).
2. Klik **Login Admin** di bagian bawah halaman (atau buka `.../#/admin`).
3. Login dengan akun dari langkah A4 → Anda langsung diminta **mengganti password** (minimal 8 karakter, berbeda dari password lama).
4. Isi **Pengaturan Umum** (nama hub, tagline, logo, warna, kontak WhatsApp), lalu tambah **Aplikasi** dan **Flyer**.
5. Buka halaman publik di HP untuk memastikan tampilan dan klik "Buka Layanan" berjalan.

---

## BAGIAN E — Cara memperbarui

**Jika mengubah `Kode.gs`:** Terapkan → **Kelola deployment** → ikon ✏️ → Versi: **Versi baru** → **Terapkan**. URL `/exec` tetap sama, jadi frontend tidak perlu diubah.
> ⚠️ Jangan membuat "Deployment baru" — itu menghasilkan URL berbeda.

**Jika mengubah berkas frontend:** dari folder `hubppu-cakung` jalankan:
```bash
git add .
git commit -m "Keterangan perubahan"
git push
```
Tunggu 1–2 menit. Jika tampilan masih versi lama, tekan **Ctrl+Shift+R**.

---

## BAGIAN F — Pemeliharaan & pemecahan masalah

| Masalah | Penyebab & solusi |
|---|---|
| Situs GitHub menampilkan **404** | `git init` dijalankan di folder yang salah (di repo terlihat folder pembungkus, bukan `index.html`). Masuk ke folder yang berisi `index.html`, lalu: `git init` → `git add .` → `git commit -m "fix"` → `git branch -M main` → `git remote add origin URL` → `git push -u origin main --force`. `--force` menimpa isi repo lama yang salah. |
| Tampilan polos tanpa warna | Folder `css`/`js` tidak ikut. Pastikan diunggah lewat terminal, bukan "Upload files". |
| Muncul pita **Mode demo** di situs asli | `GAS_URL` di `js/config.js` belum diganti, atau perubahan belum di-push. |
| "Gagal memuat data" | Cek URL `/exec?action=ping`. Pastikan akses deployment **Siapa saja** dan Anda sudah membuat **Versi baru** setelah mengubah kode. |
| Lupa password admin | Di editor Apps Script, jalankan fungsi **`resetPasswordAdmin`** → password baru tampil di Log eksekusi. |
| Akun terkunci | Otomatis terbuka 15 menit setelah 5 kali gagal login. |
| Gambar tidak tampil | Kebijakan Google Workspace kantor mungkin melarang berbagi "Siapa saja yang memiliki link". Minta admin Workspace mengizinkan, atau gunakan akun Google yang mengizinkan berbagi publik. |
| Angka grafik belum bertambah | Klik hari ini tetap dihitung langsung; rekap permanen dibuat trigger pukul 01.00. Jika perlu hitung ulang semua, jalankan **`rekapUlangSemua`**. |

**Jangan** menghapus baris di sheet **LogKlik** secara manual — rekap memakai penanda baris terakhir. Jika terlanjur, jalankan `rekapUlangSemua`.

Perubahan data di halaman publik bisa tertunda hingga ±10 menit bagi pengunjung lain karena data publik di-cache agar cepat; setiap perubahan dari panel admin langsung menghapus cache tersebut.
