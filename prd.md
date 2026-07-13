# PRD: AI Mailroom (v1 - Core MVP)

## 1. Ringkasan Produk

Aplikasi web untuk mendata paket masuk karyawan di perusahaan (target awal: pabrik). Petugas mailroom memfoto resi paket, sistem membaca isi resi pakai AI (OCR + LLM), mencocokkan nama penerima dengan database karyawan, dan menyimpan status paket (Belum Diambil / Sudah Diambil).

**Tujuan v1:** ganti pencatatan manual (buku/Excel) dengan alur foto → data tersimpan otomatis, dalam hitungan detik.

**Bukan tujuan v1:** notifikasi WhatsApp, multi-cabang, multi-admin, analytics, HRIS integration. Semua itu masuk v2+.

---

## 2. Tech Stack

- **Frontend/Backend:** Next.js (App Router)
- **Database & Auth:** Supabase (Postgres + Supabase Auth + Supabase Storage)
- **AI:** Gemini API (multimodal — terima gambar resi langsung, extract data + fuzzy match dalam satu prompt terstruktur, output JSON)
- **Hosting:** Vercel (asumsi, sesuaikan kalau beda)

---

## 3. User Roles (v1)

Hanya **1 role**: Admin/Petugas Mailroom. Tidak ada role hierarchy dulu (Role Management masuk v2).

---

## 4. Database Schema (Supabase/Postgres)

### Table: `employees`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | default gen_random_uuid() |
| full_name | text | nama lengkap karyawan |
| employee_id | text | NIK/ID karyawan (unique, opsional) |
| department | text | opsional |
| phone_number | text | opsional, buat v2 notifikasi |
| created_at | timestamptz | default now() |

### Table: `packages`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | default gen_random_uuid() |
| receipt_image_url | text | URL ke Supabase Storage |
| recipient_name_raw | text | nama hasil OCR mentah dari resi |
| employee_id | uuid (FK -> employees.id) | nullable, diisi setelah matching |
| match_confidence | numeric | skor confidence dari AI matching (0-1) |
| tracking_number | text | nomor resi hasil OCR |
| courier | text | nama ekspedisi hasil OCR |
| status | text | enum: 'belum_diambil' \| 'sudah_diambil' |
| received_at | timestamptz | waktu paket didata (default now()) |
| picked_up_at | timestamptz | nullable, diisi saat diambil |
| picked_up_verification | text | enum: 'qr' \| 'pin' \| 'signature', nullable |
| admin_id | uuid (FK -> auth.users.id) | siapa yang input |
| created_at | timestamptz | default now() |

### Table: `admins` (opsional, bisa pakai Supabase Auth langsung)
Gunakan Supabase Auth bawaan untuk login admin. Tidak perlu table custom di v1.

---

## 5. Core User Flow (v1)

### Flow A: Input Paket Baru
1. Admin login (Supabase Auth — email/password).
2. Admin buka halaman "Tambah Paket", ambil foto resi via kamera device (input type="file" accept="image/*" capture="environment").
3. Gambar diupload ke Supabase Storage, dapat URL.
4. Gambar dikirim ke Gemini API dengan prompt terstruktur (lihat section 6) untuk:
   - Extract: nama penerima, nomor resi, ekspedisi
   - Fuzzy match nama penerima ke list nama di table `employees`
5. Sistem tampilkan hasil ke admin dalam bentuk form pre-filled:
   - Jika confidence match tinggi (>0.8): tampilkan nama karyawan yang match, admin tinggal konfirmasi (1 klik).
   - Jika confidence rendah/tidak ada match: tampilkan dropdown search manual untuk admin pilih karyawan yang benar.
6. Admin konfirmasi → data tersimpan ke table `packages` dengan status `belum_diambil`.

### Flow B: Pengambilan Paket
1. Admin buka halaman "Daftar Paket", filter status `belum_diambil`.
2. Cari paket by nama karyawan (search bar).
3. Klik paket → tombol "Konfirmasi Diambil".
4. Pilih metode verifikasi: QR Code / PIN / Tanda tangan digital (v1: cukup checkbox/PIN sederhana dulu, QR & signature bisa nyusul kalau waktu cukup — lihat catatan scope di section 8).
5. Status berubah jadi `sudah_diambil`, `picked_up_at` terisi.

### Flow C: Riwayat & Pencarian
1. Halaman "Riwayat Paket" — list semua paket, bisa difilter by status, tanggal, nama karyawan.
2. Search bar untuk cari cepat by nama/nomor resi.

---

## 6. AI Integration Detail (Gemini API)

**Single call, multimodal:** kirim gambar resi + list nama karyawan (atau subset yang relevan) dalam satu prompt, minta Gemini return JSON terstruktur langsung. Ini menghindari kebutuhan OCR terpisah — Gemini bisa baca gambar langsung.

**Contoh struktur prompt (bukan kode, garis besar):**
- System instruction: "Kamu adalah asisten OCR untuk resi paket. Ekstrak data dari gambar resi, lalu cocokkan nama penerima dengan daftar karyawan yang diberikan. Balas HANYA dalam format JSON, tanpa teks tambahan."
- Input: gambar resi (base64) + array nama karyawan dari database
- Output JSON yang diharapkan:
```json
{
  "recipient_name_raw": "string",
  "tracking_number": "string",
  "courier": "string",
  "matched_employee_name": "string atau null",
  "match_confidence": 0.0
}
```

**Catatan penting:**
- Kalau jumlah karyawan banyak (>500), jangan kirim semua nama ke prompt sekaligus (boros token). Lakukan matching kasar dulu di sisi aplikasi (misal: string similarity pakai library JS seperti `fuzzysort` atau `string-similarity`) untuk narrow down ke top 5-10 kandidat, baru kirim kandidat itu ke Gemini untuk keputusan akhir. Ini juga bisa jadi fallback kalau Gemini API gagal/limit.
- Simpan `match_confidence` untuk keperluan audit dan threshold tuning nanti.

---

## 7. Halaman/Screen yang Dibutuhkan (v1)

1. **Login** — Supabase Auth
2. **Dashboard sederhana** — jumlah paket belum diambil, jumlah paket hari ini
3. **Tambah Paket** — kamera/upload resi + konfirmasi matching
4. **Daftar Paket / Riwayat** — table dengan filter status, search
5. **Detail Paket** — lihat gambar resi, data, tombol konfirmasi pengambilan
6. **Kelola Karyawan** — CRUD sederhana untuk table `employees` (tambah/edit/hapus karyawan, atau import dari CSV)

---

## 8. Scope Boundaries (Penting untuk AI Agent)

**HARUS ada di v1:**
- Login admin
- CRUD data karyawan
- Upload foto resi → AI extract + match
- Konfirmasi manual kalau AI gak yakin
- Status paket (belum/sudah diambil)
- Pencarian & riwayat

**JANGAN dibangun dulu di v1** (biar gak over-engineering):
- Notifikasi WhatsApp
- Multi-cabang / multi-admin dengan role berbeda
- Dashboard analitik kompleks
- Export Excel/PDF
- API integration ke sistem lain
- HRIS integration
- Audit log detail
- QR Code generation otomatis (kalau butuh verifikasi pengambilan, mulai dari PIN/checkbox sederhana dulu, QR bisa v1.1)

---

## 9. Metrik Sukses untuk Validasi Pilot

Karena tujuan v1 ini buat pilot ke 1 perusahaan (bukan jualan luas dulu), ukur:
- Waktu rata-rata input 1 paket (target: <15 detik dari foto sampai tersimpan)
- Akurasi AI matching (berapa % butuh koreksi manual)
- Jumlah paket yang berhasil didata per hari dibanding proses manual sebelumnya

---

## 10. Open Questions (perlu dijawab sebelum/selama development)

- Berapa jumlah karyawan di pabrik target pilot? (menentukan strategi matching — kirim semua nama vs narrow down dulu)
- Apakah ada data karyawan existing dalam format Excel yang bisa diimport, atau harus input manual dari nol?
- Volume paket per hari di lokasi pilot? (menentukan urgensi optimasi cost API)
