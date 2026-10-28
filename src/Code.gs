// APLIKASI TAGIHAN SISWA SD – database: Google Spreadsheet (konsep sama dengan AKPD)
// Sheet: Config | Users | Tagihan | Pembayaran | Tabungan | Rekap_Tabungan | Petunjuk
const SHEETS = {
  Config: ['Kunci', 'Nilai'],
  Users: ['Username', 'Password', 'Role', 'Nama', 'Kelas', 'Tahun_Lulus', 'Kelas_Asal'],   // alumni: Kelas = 'Alumni', Tahun_Lulus = mis. 2026, Kelas_Asal = mis. 6A
  Tagihan: ['ID_Tagihan', 'Kelas', 'Nama_Tagihan', 'Periode', 'Nominal', 'Jenis', 'Jumlah_Bulan', 'Bulan_Mulai', 'Arsip'],  // Nominal = per bulan (Bulanan) atau per tahun (Tahunan)
  Pembayaran: ['Timestamp', 'NISN', 'ID_Tagihan', 'Jumlah', 'Catatan'],
  Tabungan: ['Dicatat', 'Tanggal', 'NISN', 'Jenis', 'Jumlah', 'Catatan', 'Petugas'],   // buku besar: hanya ditambah, tidak pernah dihapus
  Rekap_Tabungan: ['NISN', 'TA', 'Setor', 'Tarik', 'Koreksi'],                         // ringkasan per siswa per tahun ajaran
  Log_Akhir_Tahun: ['Waktu', 'Petugas', 'TA_Ditutup', 'Status', 'Naik', 'Lulus', 'Tagihan_Diarsip', 'Baris_Dihapus']  // jejak kenaikan kelas dan kelulusan
};
const NUMCOL = { Tagihan: [4, 6, 7], Pembayaran: [3], Tabungan: [4], Rekap_Tabungan: [2, 3, 4], Log_Akhir_Tahun: [4, 5, 6, 7] };
const TEXTCOL = { Users: [1, 5, 6, 7], Tagihan: [2], Pembayaran: [1, 2], Tabungan: [1, 2, 3], Rekap_Tabungan: [1, 2], Log_Akhir_Tahun: [1, 3] };  // kolom yang harus tetap teks (NISN, kelas) agar angka 0 di depan dan "6-1" tidak berubah
const DEFAULT_PW = '123456';
const CFG0 = { namaYayasan: 'Nama Yayasan', namaSekolah: 'Nama Sekolah', alamatSekolah: 'Alamat Sekolah', namaKepala: 'Nama Kepala Sekolah', namaTU: 'Nama Guru TU', tahunAjaran: '2026/2027', logoUrl: '' };

// Jalankan SEKALI dari editor Apps Script.
function setup() {
  Object.keys(SHEETS).forEach(n => { const s = sh_(n); s.getRange(1, 1, 1, SHEETS[n].length).setValues([SHEETS[n]]); });
  sh_('Users').getRange('A:A').setNumberFormat('@'); sh_('Pembayaran').getRange('A:B').setNumberFormat('@');
  const cfg = rows_('Config'), ada = cfg.map(r => r[0]);
  Object.keys(CFG0).forEach(k => { if (ada.indexOf(k) < 0) cfg.push([k, CFG0[k]]); });
  write_('Config', cfg);
  if (!rows_('Users').length) write_('Users', [['admin', 'admin123', 'guru', 'Guru TU', '-']]);
  const p = sh_('Petunjuk'); p.clear();
  p.getRange(1, 1, 4, 1).setValues([['Petunjuk'], ['Sheet Users: kelola lewat menu Pengguna di aplikasi. Password siswa baru otomatis 123456.'], ['Sheet Tagihan dan Pembayaran terisi otomatis dari aplikasi, jangan diedit manual.'], ['Akun admin/admin123 hanya contoh: login lalu ganti password-nya.']]);
}
// Jalankan SEKALI dari editor bila ada sheet yang baris pertamanya ternyata data (judul kolom hilang): judul disisipkan, data tidak dihapus.
function perbaikiJudulSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), hasil = [];
  Object.keys(SHEETS).forEach(n => {
    const s = ss.getSheetByName(n); if (!s) return;
    const h = SHEETS[n], v = String(s.getRange(1, 1).getValue()).trim();
    if (v === h[0]) return;
    if (s.getLastRow() >= 1 && v !== '') { s.insertRowBefore(1); hasil.push(n); }
    s.getRange(1, 1, 1, h.length).setValues([h]);
  });
  return hasil.length ? 'Judul disisipkan di: ' + hasil.join(', ') : 'Semua judul sudah benar.';
}
// Aplikasi ini hanya menjadi API (backend). Tampilannya ada di index.html yang dipasang di hosting.
const API = {
  getConfig, authenticateUser, masukOtomatis, keluarIngat, changePassword, updateConfig, getData, getMine,
  saveTagihan, saveTagihanBanyak, salinTagihan, deleteTagihan, catatBayar,
  listUsers, saveUser, resetPassword, deleteUser, importUsers, importRekap,
  getTabunganData, simpanTabungan, koreksiTabungan, getRiwayatTabungan, getTabunganSaya, cairkanTabungan,
  getAkhirTahun, naikKelas, getDataAlumni, hapusAlumni
};
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return json_({ ok: true, data: 'API Tagihan Siswa aktif' }); }  // untuk cek cepat di browser
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (!Object.prototype.hasOwnProperty.call(API, req.fn)) throw new Error('Fungsi tidak dikenal.');
    return json_({ ok: true, data: API[req.fn].apply(null, req.args || []) });
  } catch (err) {
    return json_({ ok: false, error: err.message || String(err) });
  }
}

// ---------- helper sheet ----------
const sh_ = n => { const ss = SpreadsheetApp.getActiveSpreadsheet(); return ss.getSheetByName(n) || ss.insertSheet(n); };
function rows_(n) {
  const v = sh_(n).getDataRange().getValues(); v.shift();
  const nc = NUMCOL[n] || [], w = SHEETS[n].length;
  return v.filter(r => r[0] !== '').map(r => { r = r.slice(0, w); while (r.length < w) r.push(''); return r.map((c, i) => nc.indexOf(i) >= 0 ? Number(c) || 0 : c instanceof Date ? Utilities.formatDate(c, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm') : String(c)); });
}
function write_(n, data) {
  const s = sh_(n), w = SHEETS[n].length, last = s.getLastRow();
  s.getRange(1, 1, 1, w).setValues([SHEETS[n]]);  // pastikan judul kolom selalu lengkap (juga untuk sheet lama)
  if (last > 1) s.getRange(2, 1, last - 1, w).clearContent();
  txt_(s, n, 2, Math.max(data.length, 1));
  if (data.length) s.getRange(2, 1, data.length, w).setValues(data.map(r => { r = r.slice(0, w); while (r.length < w) r.push(''); return r; }));
}
function txt_(s, n, row, cnt) { (TEXTCOL[n] || []).forEach(col => s.getRange(row, col, cnt, 1).setNumberFormat('@')); }
function append_(n, data) { if (data.length) { const s = sh_(n); if (s.getLastRow() < 1) s.getRange(1, 1, 1, SHEETS[n].length).setValues([SHEETS[n]]); const r = s.getLastRow() + 1; txt_(s, n, r, data.length); s.getRange(r, 1, data.length, SHEETS[n].length).setValues(data); } }
const hash_ = (u, p) => 'h:' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, u + ':' + p));
const okPw_ = (r, p) => r[1].indexOf('h:') === 0 ? r[1] === hash_(r[0], p) : r[1] === String(p);
const isTU_ = role => role === 'guru' || role === 'admin';
const now_ = () => Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm');
const num_ = x => typeof x === 'number' ? x : (parseInt(String(x).replace(/\D/g, ''), 10) || 0);
const arsipTerbaru_ = ts => ts.reduce((m, r) => r[8] && String(r[8]) > m ? String(r[8]) : m, '');   // TA arsip paling baru ('' bila belum ada)
const aktifT_ = r => !r[8];   // tagihan yang belum diarsipkan (kolom Arsip kosong)
const bulanan_ = r => r[5] === 'Bulanan';
const mulai_ = r => Math.min(12, Math.max(1, r[7] || 1));  // 1 = Juli ... 12 = Juni (tahun ajaran)
const bln_ = r => bulanan_(r) ? Math.max(1, r[6] || 1) : 1;
const total_ = r => r[4] * bln_(r);   // total yang harus dibayar siswa untuk tagihan ini
const norm_ = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const tok_ = s => norm_(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 2);
const mirip_ = (a, b) => { const x = tok_(a), y = tok_(b); return x.some(w => y.indexOf(w) >= 0); };
const newId_ = () => 'T' + Utilities.getUuid().slice(0, 7);
function sess_(tk, tu) {
  const c = CacheService.getScriptCache().get('t_' + tk);
  if (!c) throw new Error('Sesi habis. Silakan masuk lagi.');
  const s = JSON.parse(c); if (tu && !isTU_(s.role)) throw new Error('Anda tidak punya akses.'); return s;
}
function lock_(fn) { const l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }

// ---------- konfigurasi & login ----------
function getConfig() {
  const c = Object.assign({}, CFG0); rows_('Config').forEach(r => c[r[0]] = r[1]); return c;
}
function updateConfig(tk, cfg) {
  sess_(tk, true);
  return lock_(() => { write_('Config', Object.keys(CFG0).map(k => [k, String(cfg[k] || '')])); return true; });
}
// ---------- sesi: token pendek (6 jam, di cache) + token "ingat saya" (tanpa batas waktu, di Script Properties) ----------
// Token "ingat saya" berlaku selamanya di perangkat itu, sampai pengguna keluar, password diganti/direset, atau akun dihapus.
const hashRt_ = rt => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rt).map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
function buatSesi_(r) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('t_' + token, JSON.stringify({ u: r[0], role: r[2] }), 21600);
  return { status: 'success', token: token, username: r[0], role: r[2], nama: r[3], kelas: r[4], passAwal: r[1] === hash_(r[0], DEFAULT_PW) };
}
function buatIngat_(u) {   // yang disimpan di server hanya hash token, bukan token aslinya
  const rt = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('r_' + hashRt_(rt), JSON.stringify({ u: u }));
  return rt;
}
function cabutIngat_(u) {   // cabut semua login tersimpan milik satu akun (dipakai saat password diganti/direset atau akun dihapus)
  const P = PropertiesService.getScriptProperties(), all = P.getProperties();
  Object.keys(all).forEach(k => { if (k.indexOf('r_') !== 0) return; try { if (JSON.parse(all[k]).u === u) P.deleteProperty(k); } catch (e) { P.deleteProperty(k); } });
}
function masukOtomatis(rt) {
  const gagal = { status: 'error', message: 'Login tersimpan sudah tidak berlaku. Silakan masuk lagi.' };
  rt = String(rt || ''); if (rt.length < 40) return gagal;
  const P = PropertiesService.getScriptProperties(), key = 'r_' + hashRt_(rt), raw = P.getProperty(key); if (!raw) return gagal;
  let d; try { d = JSON.parse(raw); } catch (e) { P.deleteProperty(key); return gagal; }
  const r = rows_('Users').find(x => x[0] === d.u);
  if (!r) { P.deleteProperty(key); return gagal; }
  return buatSesi_(r);
}
function keluarIngat(rt) { rt = String(rt || ''); if (rt.length >= 40) PropertiesService.getScriptProperties().deleteProperty('r_' + hashRt_(rt)); return true; }
function authenticateUser(username, password, ingat) {
  const u = String(username).trim(), ch = CacheService.getScriptCache(), k = 'f_' + u;
  if (Number(ch.get(k) || 0) >= 5) return { status: 'error', message: 'Terlalu banyak percobaan. Coba lagi 10 menit lagi.' };
  const us = rows_('Users'), r = us.find(x => x[0] === u);
  if (!r || !okPw_(r, password)) { ch.put(k, String(Number(ch.get(k) || 0) + 1), 600); return { status: 'error', message: 'Username atau password salah.' }; }
  ch.remove(k);
  if (r[1].indexOf('h:') !== 0) lock_(() => { r[1] = hash_(r[0], password); write_('Users', us); });  // password teks biasa langsung dienkripsi
  const out = buatSesi_(r);
  if (ingat === true) out.ingat = buatIngat_(r[0]);
  return out;
}
function changePassword(tk, lama, baru) {
  const s = sess_(tk);
  return lock_(() => {
    const us = rows_('Users'), r = us.find(x => x[0] === s.u);
    if (!r) throw new Error('Akun tidak ditemukan.');
    if (!okPw_(r, lama)) throw new Error('Password saat ini salah.');
    if (String(baru).length < 6) throw new Error('Password baru minimal 6 karakter.');
    r[1] = hash_(r[0], baru); write_('Users', us); cabutIngat_(r[0]); return true;
  });
}

// ---------- data ----------
// Tunggakan tahun ajaran lalu: tagihan yang sudah diarsipkan tetapi siswanya masih punya sisa. Pasangan (NISN, tagihan) dikenali dari baris Pembayaran
// (naikKelas menambah baris bernilai 0 untuk siswa yang belum membayar sama sekali), jadi tidak perlu sheet baru.
function lama_(T, P) {
  const tg = {}; T.forEach(t => { if (!aktifT_(t)) tg[t[0]] = t; });
  const dibayar = {}; P.forEach(p => { if (tg[p[2]]) { const k = p[1] + '|' + p[2]; dibayar[k] = (dibayar[k] || 0) + p[3]; } });
  return Object.keys(dibayar).map(k => { const i = k.indexOf('|'), t = tg[k.slice(i + 1)];
    return { nisn: k.slice(0, i), tid: t[0], nama: t[2], periode: t[3], ta: t[8], nominal: total_(t), dibayar: dibayar[k] }; }).filter(x => x.nominal > x.dibayar);
}
function getData(tk) {  // untuk TU
  sess_(tk, true);
  const TG = rows_('Tagihan'), PB = rows_('Pembayaran');
  return {
    arsipTA: arsipTerbaru_(TG),
    lama: lama_(TG, PB),
    siswa: rows_('Users').filter(r => !isTU_(r[2])).map(r => ({ nisn: r[0], nama: r[3], kelas: r[4], lulus: r[5], asal: r[6] })),
    tagihan: TG.filter(aktifT_).map(r => ({ id: r[0], kelas: r[1], nama: r[2], periode: r[3], nominal: total_(r), satuan: r[4], jenis: bulanan_(r) ? 'Bulanan' : 'Tahunan', bulan: Math.min(bln_(r), 13 - mulai_(r)), mulai: mulai_(r) })),
    bayar: PB.map(r => ({ tgl: r[0], nisn: r[1], tid: r[2], jumlah: r[3], catatan: r[4] }))
  };
}
function getMine(tk) {  // untuk siswa / wali murid
  const s = sess_(tk), me = rows_('Users').find(x => x[0] === s.u); if (!me) throw new Error('Akun tidak ditemukan. Silakan masuk lagi.'); const pay = rows_('Pembayaran').filter(r => r[1] === s.u);
  return {
    nama: me[3], kelas: me[4], nisn: me[0], lulus: me[5],
    lama: lama_(rows_('Tagihan'), pay),
    bills: rows_('Tagihan').filter(t => aktifT_(t) && (t[1] === me[4] || (t[1] === 'Semua' && me[4] !== 'Alumni'))).map(t => {
      const rw = pay.filter(p => p[2] === t[0]);
      return { id: t[0], nama: t[2], periode: t[3], nominal: total_(t), satuan: t[4], jenis: bulanan_(t) ? 'Bulanan' : 'Tahunan', bulan: Math.min(bln_(t), 13 - mulai_(t)), mulai: mulai_(t), dibayar: rw.reduce((a, p) => a + p[3], 0), riwayat: rw.map(p => ({ tgl: p[0], jumlah: p[3], catatan: p[4] })) };
    })
  };
}
function saveTagihan(tk, t) {
  sess_(tk, true);
  return lock_(() => {
    const ts = rows_('Tagihan'), n = Number(t.nominal);
    if (!t.nama || !(n > 0)) throw new Error('Nama tagihan dan nominal wajib diisi.');
    const jb = t.jenis === 'Bulanan', ml = jb ? Math.min(12, Math.max(1, Number(t.mulai) || 1)) : 1, bl = jb ? Math.min(13 - ml, Math.max(1, Number(t.bulan) || 1)) : 1;
    const row = [t.id || newId_(), String(t.kelas), String(t.nama).trim(), String(t.periode || '').trim(), n, jb ? 'Bulanan' : 'Tahunan', bl, ml, ''];
    const i = ts.findIndex(r => r[0] === row[0]); if (i < 0) ts.push(row); else ts[i] = row;
    write_('Tagihan', ts); return true;
  });
}
// Satu tagihan, nominal berbeda per kelas: p = {nama, periode, jenis:'Bulanan'|'Tahunan', mulai (1=Juli), bulan, items:[{kelas, nominal}]}
function saveTagihanBanyak(tk, p) {
  sess_(tk, true);
  return lock_(() => {
    const ts = rows_('Tagihan'), nama = String(p.nama || '').trim(), periode = String(p.periode || '').trim();
    if (!nama) throw new Error('Nama tagihan wajib diisi.');
    const jb = p.jenis === 'Bulanan', ml = jb ? Math.min(12, Math.max(1, Number(p.mulai) || 1)) : 1, bl = jb ? Math.min(13 - ml, Math.max(1, Number(p.bulan) || 1)) : 1;
    const items = (p.items || []).filter(x => Number(x.nominal) > 0);
    if (!items.length) throw new Error('Isi nominal untuk minimal satu kelas.');
    items.forEach(x => {
      const i = ts.findIndex(r => aktifT_(r) && r[1] === String(x.kelas) && norm_(r[2]) === norm_(nama) && r[3] === periode);
      const row = [i < 0 ? newId_() : ts[i][0], String(x.kelas), nama, periode, Number(x.nominal), jb ? 'Bulanan' : 'Tahunan', bl, ml, ''];
      if (i < 0) ts.push(row); else ts[i] = row;
    });
    write_('Tagihan', ts); return items.length;
  });
}
// Salin tagihan dari tahun ajaran arsip paling baru ke tahun ajaran berjalan (nominal sama, bisa diubah sesudahnya). Yang sudah ada tidak digandakan.
function salinTagihan(tk) {
  sess_(tk, true);
  return lock_(() => {
    const ts = rows_('Tagihan'), ta = String(getConfig().tahunAjaran || '').trim(), sumber = arsipTerbaru_(ts);
    if (!sumber) throw new Error('Belum ada tagihan arsip yang bisa disalin.');
    if (sumber === ta) throw new Error('Tagihan arsip terbaru masih bertahun ajaran ' + ta + ', sama dengan tahun ajaran sekarang. Periksa pengaturan tahun ajaran.');
    let salin = 0, lewat = 0;
    ts.filter(r => r[8] === sumber).forEach(r => {
      const periode = String(r[3]).split(sumber).join(ta);
      if (ts.some(x => aktifT_(x) && x[1] === r[1] && norm_(x[2]) === norm_(r[2]) && x[3] === periode)) { lewat++; return; }
      ts.push([newId_(), r[1], r[2], periode, r[4], r[5], r[6], r[7], '']); salin++;
    });
    if (salin) write_('Tagihan', ts);
    return { salin: salin, lewat: lewat, sumber: sumber, ta: ta };
  });
}
function deleteTagihan(tk, id) {
  sess_(tk, true);
  return lock_(() => { write_('Tagihan', rows_('Tagihan').filter(r => r[0] !== id)); write_('Pembayaran', rows_('Pembayaran').filter(r => r[2] !== id)); return true; });
}
function catatBayar(tk, nisn, tid, jumlah, catatan) {  // jumlah negatif = koreksi
  sess_(tk, true);
  const j = Number(jumlah); if (!j) throw new Error('Jumlah tidak boleh kosong atau 0.');
  return lock_(() => { append_('Pembayaran', [[now_(), String(nisn), tid, j, String(catatan || '')]]); return true; });
}

// ---------- pengguna ----------
function listUsers(tk) { sess_(tk, true); return rows_('Users').map(r => ({ username: r[0], nama: r[3], kelas: r[4], role: r[2] })); }
function saveUser(tk, u) {
  sess_(tk, true);
  return lock_(() => {
    const us = rows_('Users'), i = us.findIndex(r => r[0] === u.username);
    if (!u.username || !u.nama) throw new Error('NISN dan nama wajib diisi.');
    if (i < 0) us.push([u.username, hash_(u.username, DEFAULT_PW), u.role || 'siswa', u.nama, u.kelas]);
    else { us[i][3] = u.nama; us[i][4] = u.kelas; }
    write_('Users', us); return true;
  });
}
function resetPassword(tk, username) {
  sess_(tk, true);
  return lock_(() => { const us = rows_('Users'), r = us.find(x => x[0] === username); if (!r) throw new Error('Akun tidak ditemukan.'); if (isTU_(r[2])) throw new Error('Password admin tidak bisa direset lewat aplikasi. Ganti lewat tombol Ganti password setelah masuk, atau lewat sheet Users.'); r[1] = hash_(r[0], DEFAULT_PW); write_('Users', us); cabutIngat_(r[0]); return { password: DEFAULT_PW }; });
}
function deleteUser(tk, username) {
  const s = sess_(tk, true); if (s.u === username) throw new Error('Akun yang sedang dipakai tidak bisa dihapus.');
  return lock_(() => {
    const nisn = String(username), us = rows_('Users'), r = us.find(x => x[0] === nisn);
    if (!r) throw new Error('Akun tidak ditemukan.');
    const saldo = saldoMap_(rows_('Rekap_Tabungan'))[nisn] || 0;
    if (saldo > 0) throw new Error('Saldo tabungan ' + r[3] + ' masih ' + rpTxt_(saldo) + '. Cairkan dulu di menu Tabungan sebelum menghapus siswa.');
    write_('Users', us.filter(x => x[0] !== nisn));
    const set = {}; set[nisn] = true;   // hapus semua data milik siswa ini
    hapusBarisNisn_('Pembayaran', 1, set); hapusBarisNisn_('Tabungan', 2, set); hapusBarisNisn_('Rekap_Tabungan', 0, set);
    cabutIngat_(nisn);
    return true;
  });
}
// list = [{username(NISN), nama, kelas}] — password siswa baru otomatis 123456
function importUsers(tk, list) {
  sess_(tk, true);
  return lock_(() => {
    const us = rows_('Users'), map = {}; us.forEach(r => map[r[0]] = r);
    let baru = 0, ubah = 0, lewat = 0;
    list.forEach(x => {
      const n = String(x.username).trim(); if (!n || !x.nama) { lewat++; return; }
      const r = map[n];
      if (r) { if (isTU_(r[2]) || r[4] === 'Alumni') { lewat++; return; } r[3] = x.nama; r[4] = x.kelas; ubah++; }
      else { const nr = [n, hash_(n, DEFAULT_PW), 'siswa', x.nama, x.kelas]; us.push(nr); map[n] = nr; baru++; }
    });
    write_('Users', us); return { baru: baru, ubah: ubah, lewat: lewat };
  });
}

// ---------- impor rekap tagihan (hasil tempel dari Google Sheets / Excel) ----------
// p = {kelas, periode, data: [[sel, ...], ...]}
function importRekap(tk, p) {
  sess_(tk, true);
  return lock_(() => {
    const v = p.data, kelas = String(p.kelas).trim(), periode = String(p.periode || '').trim();
    const hi = v.findIndex(r => r.some(c => /^nama$/i.test(String(c).trim())));
    if (hi < 0) throw new Error('Baris judul "NAMA" tidak ditemukan. Tempel seluruh tabel rekap, termasuk judul kolom.');
    const nc = v[hi].findIndex(c => /^nama$/i.test(String(c).trim())), tc = v[hi].findIndex(c => /^total/i.test(String(c).trim()));
    if (tc < 0) throw new Error('Kolom TOTAL tidak ditemukan.');
    const jenis = [];
    for (let c = nc + 1; c < tc; c++) { const t = String((v[hi + 1] || [])[c] || '').trim(); if (t) jenis.push({ c: c, t: t }); }
    const isAngka = s => /^(rp)?\s*[\d.,]+$/i.test(String(s).trim()) && /\d/.test(s);
    const nom = [];  // daftar nominal di bawah tabel: tepat 2 sel terisi [label, angka]
    v.slice(hi + 2).forEach(r => { const x = r.map(z => String(z).trim()).filter(Boolean); if (x.length === 2 && !isAngka(x[0]) && isAngka(x[1])) nom.push([norm_(x[0]), num_(x[1])]); });
    jenis.forEach(j => { const m = nom.find(n => mirip_(n[0], j.t)); j.nominal = m ? m[1] : 0; });
    const pakai = jenis.filter(j => j.nominal > 0);
    if (!pakai.length) throw new Error('Daftar nominal per jenis (misal "SPP 200.000") tidak ditemukan di bawah tabel.');
    const ts = rows_('Tagihan'), pay = rows_('Pembayaran'), us = rows_('Users').filter(r => !isTU_(r[2]) && r[4] === kelas);
    pakai.forEach(j => {
      const i = ts.findIndex(r => aktifT_(r) && r[1] === kelas && norm_(r[2]) === norm_(j.t) && r[3] === periode);
      if (i < 0) { j.id = newId_(); ts.push([j.id, kelas, j.t, periode, j.nominal, 'Tahunan', 1, 1, '']); } else { j.id = ts[i][0]; ts[i][4] = bulanan_(ts[i]) ? Math.round(j.nominal / bln_(ts[i])) : j.nominal; }
    });
    const baris = [], tidak = []; let cocok = 0;
    v.slice(hi + 2).forEach(r => {
      const nama = String(r[nc] || '').trim(); if (!nama || !(num_(r[0]) > 0)) return;
      const s = us.find(x => norm_(x[3]) === norm_(nama)); if (!s) { tidak.push(nama); return; }
      cocok++;
      pakai.forEach(j => {  // selisih terhadap saldo tercatat, jadi aman diimpor ulang
        const ada = pay.filter(b => b[1] === s[0] && b[2] === j.id).reduce((a, b) => a + b[3], 0), d = num_(r[j.c]) - ada;
        if (d) baris.push([now_(), s[0], j.id, d, 'Impor rekap']);
      });
    });
    write_('Tagihan', ts); append_('Pembayaran', baris);
    return { tagihan: pakai.map(j => j.t), cocok: cocok, tidakCocok: tidak };
  });
}

// ---------- tabungan siswa (dicatat guru TU; saldo milik siswa, terpisah dari tagihan) ----------
const today_ = () => Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
const taKey_ = t => { const y = +t.slice(0, 4), m = +t.slice(5, 7); return m >= 7 ? y + '/' + (y + 1) : (y - 1) + '/' + y; };  // tahun ajaran Juli-Juni
function validTgl_(t) {
  t = String(t || '');
  const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(t + 'T00:00:00Z') : null;
  if (!d || isNaN(d) || d.toISOString().slice(0, 10) !== t) throw new Error('Tanggal tidak valid.');
  if (t > today_()) throw new Error('Tanggal tidak boleh di masa depan.');
  return t;
}
function saldoMap_(R) { const m = {}; R.forEach(r => { m[r[0]] = (m[r[0]] || 0) + r[2] - r[3] + r[4]; }); return m; }
function upsertRekap_(R, nisn, ta, s, t, k) {
  let r = R.find(x => x[0] === nisn && x[1] === ta);
  if (!r) { r = [nisn, ta, 0, 0, 0]; R.push(r); }
  r[2] += s; r[3] += t; r[4] += k;
}
const rpTxt_ = n => 'Rp' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// setoran yang tanggal transaksinya HARI INI, per NISN (hanya membaca ekor buku besar agar tetap cepat)
function setorHariIni_() {
  const s = sh_('Tabungan'), last = s.getLastRow(), hari = today_(), m = {};
  if (last > 1) {
    const start = Math.max(2, last - 4000 + 1);
    s.getRange(start, 1, last - start + 1, 7).getValues().forEach(r => {
      const t = r[1] instanceof Date ? Utilities.formatDate(r[1], 'Asia/Jakarta', 'yyyy-MM-dd') : String(r[1]);
      if (t === hari && String(r[3]) === 'Setor') m[String(r[2])] = (m[String(r[2])] || 0) + (Number(r[4]) || 0);
    });
  }
  return m;
}

// saldo, setoran tahun ajaran berjalan, dan setoran hari ini untuk semua siswa
function getTabunganData(tk) {
  sess_(tk, true);
  const ta = taKey_(today_()), s = {};
  rows_('Rekap_Tabungan').forEach(r => {
    const o = s[r[0]] || (s[r[0]] = { saldo: 0, setorTA: 0, tarikTA: 0, setorAll: 0, hariIni: 0 });
    o.saldo += r[2] - r[3] + r[4]; o.setorAll += r[2];   // setorAll = akumulasi setoran seluruh tahun ajaran
    if (r[1] === ta) { o.setorTA += r[2]; o.tarikTA += r[3]; }
  });
  const h = setorHariIni_();
  Object.keys(h).forEach(n => { (s[n] = s[n] || { saldo: 0, setorTA: 0, tarikTA: 0, setorAll: 0, hariIni: 0 }).hariIni = h[n]; });
  return { ta: ta, tanggal: today_(), saldo: s };
}

// p = {tanggal:'yyyy-MM-dd', items:[{nisn, setor, tarik}]} - semua dicek dulu, baru ditulis (semua atau tidak sama sekali)
function simpanTabungan(tk, p) {
  const me = sess_(tk, true);
  return lock_(() => {
    const tgl = validTgl_(p.tanggal);
    const items = (p.items || []).map(x => ({ nisn: String(x.nisn), setor: Math.round(Number(x.setor) || 0), tarik: Math.round(Number(x.tarik) || 0) }))
      .filter(x => x.setor !== 0 || x.tarik !== 0);
    if (!items.length) throw new Error('Belum ada jumlah yang diisi.');
    if (items.some(x => x.setor < 0 || x.tarik < 0)) throw new Error('Jumlah tidak boleh minus. Untuk perbaikan, pakai menu Koreksi.');
    const nama = {}; rows_('Users').forEach(u => nama[u[0]] = u[3]);
    const R = rows_('Rekap_Tabungan'), sal = saldoMap_(R), ta = taKey_(tgl), buruk = [];
    items.forEach(x => {
      if (!(x.nisn in nama)) throw new Error('Siswa tidak ditemukan: ' + x.nisn);
      const s0 = (sal[x.nisn] || 0) + x.setor;   // setoran hari itu dihitung dulu, baru penarikan
      if (x.tarik > s0) buruk.push(nama[x.nisn] + ' (saldo ' + rpTxt_(s0) + ')');
    });
    if (buruk.length) throw new Error('Penarikan melebihi saldo: ' + buruk.join(', ') + '.');
    const led = [], waktu = now_();
    items.forEach(x => {
      if (x.setor > 0) { led.push([waktu, tgl, x.nisn, 'Setor', x.setor, '', me.u]); upsertRekap_(R, x.nisn, ta, x.setor, 0, 0); }
      if (x.tarik > 0) { led.push([waktu, tgl, x.nisn, 'Tarik', x.tarik, '', me.u]); upsertRekap_(R, x.nisn, ta, 0, x.tarik, 0); }
    });
    append_('Tabungan', led);          // buku besar dulu (jejak audit), lalu ringkasan
    write_('Rekap_Tabungan', R);
    return { baris: led.length, setor: items.reduce((a, x) => a + x.setor, 0), tarik: items.reduce((a, x) => a + x.tarik, 0) };
  });
}

// Pencairan seluruh saldo SATU siswa (dipakai sekali di akhir tahun ajaran).
// p = {nisn, tanggal, saldoDiharapkan, konfirmasi:'CAIRKAN TABUNGAN'}. Jumlah yang dicairkan dihitung server, bukan dikirim dari layar.
const norm2_ = s => String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
function cairkanTabungan(tk, p) {
  const me = sess_(tk, true);
  return lock_(() => {
    if (norm2_(p.konfirmasi) !== 'CAIRKAN TABUNGAN') throw new Error('Konfirmasi CAIRKAN TABUNGAN tidak sesuai.');
    const tgl = validTgl_(p.tanggal), nisn = String(p.nisn), siswa = rows_('Users').find(u => u[0] === nisn);
    if (!siswa) throw new Error('Siswa tidak ditemukan.');
    const R = rows_('Rekap_Tabungan'), saldo = saldoMap_(R)[nisn] || 0;
    if (saldo <= 0) throw new Error('Saldo ' + siswa[3] + ' sudah Rp0, tidak ada yang bisa dicairkan.');
    if (Math.round(Number(p.saldoDiharapkan)) !== saldo) throw new Error('Saldo berubah menjadi ' + rpTxt_(saldo) + ' sejak layar dibuka. Muat ulang halaman lalu ulangi pencairan.');
    append_('Tabungan', [[now_(), tgl, nisn, 'Tarik', saldo, 'Pencairan seluruh saldo', me.u]]);
    upsertRekap_(R, nisn, taKey_(tgl), 0, saldo, 0); write_('Rekap_Tabungan', R);
    return saldo;
  });
}

// koreksi tidak menghapus apa pun: dicatat sebagai baris baru (boleh minus) beserta alasan wajib
function koreksiTabungan(tk, p) {
  const me = sess_(tk, true);
  return lock_(() => {
    const tgl = validTgl_(p.tanggal || today_()), jml = Math.round(Number(p.jumlah) || 0), alasan = String(p.catatan || '').trim();
    if (!jml) throw new Error('Jumlah koreksi tidak boleh 0.');
    if (alasan.length < 3) throw new Error('Alasan koreksi wajib diisi.');
    const nisn = String(p.nisn);
    if (!rows_('Users').some(u => u[0] === nisn)) throw new Error('Siswa tidak ditemukan.');
    const R = rows_('Rekap_Tabungan'), sal = (saldoMap_(R)[nisn] || 0);
    if (sal + jml < 0) throw new Error('Saldo tidak boleh minus. Saldo saat ini ' + rpTxt_(sal) + '.');
    append_('Tabungan', [[now_(), tgl, nisn, 'Koreksi', jml, alasan, me.u]]);
    upsertRekap_(R, nisn, taKey_(tgl), 0, 0, jml); write_('Rekap_Tabungan', R);
    return sal + jml;
  });
}

// ringkasan per tahun ajaran dan 100 transaksi terakhir satu siswa (hanya membaca ekor buku besar agar tetap cepat)
function riwayat_(nisn) {
  const R = rows_('Rekap_Tabungan').filter(r => r[0] === nisn), s = sh_('Tabungan'), last = s.getLastRow();
  let led = [];
  if (last > 1) {
    const start = Math.max(2, last - 4000 + 1);
    led = s.getRange(start, 1, last - start + 1, 7).getValues().filter(r => String(r[2]) === nisn)
      .map(r => ({ tgl: String(r[1]), jenis: String(r[3]), jumlah: Number(r[4]) || 0, catatan: String(r[5]), petugas: String(r[6]) })).reverse().slice(0, 100);
  }
  return { saldo: R.reduce((a, r) => a + r[2] - r[3] + r[4], 0), taSekarang: taKey_(today_()),
    perTA: R.map(r => ({ ta: r[1], setor: r[2], tarik: r[3], koreksi: r[4] })).sort((a, b) => b.ta.localeCompare(a.ta)), riwayat: led };
}
function getRiwayatTabungan(tk, nisn) { sess_(tk, true); return riwayat_(String(nisn)); }
function getTabunganSaya(tk) { return riwayat_(sess_(tk).u); }   // wali murid hanya bisa melihat miliknya sendiri

// ---------- akhir tahun ajaran: naik kelas otomatis + kelulusan ----------
// Tanpa syarat pelunasan. Kelas 1-5 naik dan tunggakannya dibawa ke tahun ajaran baru; kelas FINAL_KELAS menjadi Alumni (data tetap tersimpan).
const FINAL_KELAS = 6;   // kelas tertinggi di SD; siswa kelas ini menjadi Alumni
const parseKelas_ = k => { const m = /^(\d+)(.*)$/.exec(String(k).trim()); return m ? { n: +m[1], s: m[2].trim() } : null; };
function kekuranganMap_(U, T, P) {   // sisa seluruh tagihan aktif per NISN
  const paid = {}; P.forEach(p => { const k = p[1] + '|' + p[2]; paid[k] = (paid[k] || 0) + p[3]; });
  const out = {};
  U.forEach(u => {
    if (isTU_(u[2]) || u[4] === 'Alumni') return;
    out[u[0]] = T.filter(t => aktifT_(t) && (t[1] === u[4] || t[1] === 'Semua')).reduce((a, t) => a + Math.max(0, total_(t) - (paid[u[0] + '|' + t[0]] || 0)), 0);
  });
  return out;
}
function akhirTahun_() {
  const U = rows_('Users').filter(u => !isTU_(u[2])), T = rows_('Tagihan'), P = rows_('Pembayaran'), L = rows_('Log_Akhir_Tahun');
  const kur = kekuranganMap_(U, T, P), ta = String(getConfig().tahunAjaran || '').trim(), mTa = /^(\d{4})\/(\d{4})$/.exec(ta);
  const tidak = [], rencana = {}, masalah = [], bawa = { naik: 0, naikRp: 0, lulus: 0, lulusRp: 0 }; let jumlah = 0, lulus = 0;
  U.forEach(u => {
    if (u[4] === 'Alumni') return;
    const pk = parseKelas_(u[4]);
    if (!pk) { tidak.push(u[3] + ' (kelas "' + u[4] + '")'); return; }
    jumlah++;
    const lls = pk.n >= FINAL_KELAS, ke = lls ? 'Alumni' : (pk.n + 1) + pk.s, key = u[4] + '>' + ke, k = kur[u[0]] || 0;
    (rencana[key] = rencana[key] || { dari: u[4], ke: ke, jumlah: 0 }).jumlah++;
    if (lls) lulus++;
    if (k > 0) { if (lls) { bawa.lulus++; bawa.lulusRp += k; } else { bawa.naik++; bawa.naikRp += k; } }
  });
  if (!mTa || +mTa[2] !== +mTa[1] + 1) masalah.push('Tahun ajaran di Pengaturan harus berformat 2026/2027 (dua tahun berurutan).');
  if (tidak.length) masalah.push('Kelas tidak dikenali, perbaiki dulu di Data siswa: ' + tidak.slice(0, 5).join(', ') + (tidak.length > 5 ? ' dan ' + (tidak.length - 5) + ' lainnya' : '') + '.');
  const last = L.filter(l => l[2] === ta).pop();
  if (last && last[3] === 'Mulai') masalah.push('Proses kenaikan kelas sebelumnya tidak selesai. Periksa sheet Log_Akhir_Tahun sebelum mencoba lagi.');
  if (!jumlah) masalah.push('Belum ada data siswa.');
  return {
    ta: ta, taBaru: mTa ? mTa[2] + '/' + (+mTa[2] + 1) : '', tahunLulus: mTa ? mTa[2] : '', jumlah: jumlah, lulus: lulus, bawa: bawa, tagihanAktif: T.filter(aktifT_).length,
    rencana: Object.keys(rencana).map(k => rencana[k]).sort((a, b) => (parseKelas_(a.dari) || { n: 99 }).n - (parseKelas_(b.dari) || { n: 99 }).n), masalah: masalah, siap: masalah.length === 0
  };
}
function getAkhirTahun(tk) { sess_(tk, true); return akhirTahun_(); }

// hapus baris milik sekumpulan NISN langsung dari sheet (nilai asli sel tidak diubah). kol = nomor kolom NISN (mulai 0). Mengembalikan jumlah baris yang dihapus.
function hapusBarisNisn_(n, kol, set) {
  const s = sh_(n), last = s.getLastRow(); if (last < 2) return 0;
  const w = SHEETS[n].length, v = s.getRange(2, 1, last - 1, w).getValues(), sisa = v.filter(r => !set[String(r[kol])]);
  if (sisa.length === v.length) return 0;
  s.getRange(2, 1, v.length, w).clearContent();
  if (sisa.length) s.getRange(2, 1, sisa.length, w).setValues(sisa);
  return v.length - sisa.length;
}

// ---------- pembersihan data yatim: baris tabungan/pembayaran yang NISN-nya sudah tidak ada di sheet Users ----------
// Jalankan SEKALI dari editor Apps Script: 1) periksaDataYatim (hanya melapor, tidak mengubah apa pun), 2) bersihkanDataYatim (menghapus).
const SHEET_NISN_ = [['Pembayaran', 1], ['Tabungan', 2], ['Rekap_Tabungan', 0]];   // [nama sheet, nomor kolom NISN mulai 0]
function cariYatim_() {
  const ada = {}; rows_('Users').forEach(u => ada[u[0]] = true);
  const lap = {};
  SHEET_NISN_.forEach(x => {
    const n = x[0], k = x[1], s = sh_(n), last = s.getLastRow(); if (last < 2) return;
    s.getRange(2, 1, last - 1, SHEETS[n].length).getValues().forEach(r => {
      const id = String(r[k]); if (!id || ada[id]) return;
      const o = lap[id] || (lap[id] = { Pembayaran: 0, Tabungan: 0, Rekap_Tabungan: 0, saldo: 0 });
      o[n]++;
      if (n === 'Rekap_Tabungan') o.saldo += (Number(r[2]) || 0) - (Number(r[3]) || 0) + (Number(r[4]) || 0);
    });
  });
  return lap;
}
function periksaDataYatim() {
  const lap = cariYatim_(), ids = Object.keys(lap);
  const teks = ids.length ? ids.map(id => 'NISN ' + id + ': ' + lap[id].Pembayaran + ' baris pembayaran, ' + lap[id].Tabungan + ' baris tabungan, ' + lap[id].Rekap_Tabungan + ' baris rekap, saldo tabungan ' + rpTxt_(lap[id].saldo)).join('\n') : 'Tidak ada data yatim.';
  Logger.log(teks); return teks;
}
function bersihkanDataYatim() {
  return lock_(() => {
    const lap = cariYatim_(), set = {}; Object.keys(lap).forEach(id => set[id] = true);
    if (!Object.keys(set).length) return 'Tidak ada data yatim.';
    const h = SHEET_NISN_.map(x => x[0] + ': ' + hapusBarisNisn_(x[0], x[1], set) + ' baris');
    const teks = Object.keys(set).length + ' NISN dibersihkan. ' + h.join(', ');
    Logger.log(teks); return teks;
  });
}

// ---------- alumni: data lengkap untuk cetak, pelunasan, dan penghapusan ----------
const wkt_ = v => v instanceof Date ? Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm') : String(v);
const tglS_ = v => v instanceof Date ? Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd') : String(v);
function dataAlumni_(nisns) {   // seluruh data alumni yang dipilih (identitas, tagihan, pembayaran, tabungan), tanpa batas jumlah baris
  const pilih = {}; nisns.forEach(n => pilih[String(n)] = true);
  const U = rows_('Users').filter(u => !isTU_(u[2]) && u[4] === 'Alumni' && pilih[u[0]])
    .sort((a, b) => String(b[5]).localeCompare(String(a[5])) || String(a[6]).localeCompare(String(b[6]), 'id', { numeric: true }) || a[3].localeCompare(b[3], 'id'));
  const set = {}, nama = {}; U.forEach(u => { set[u[0]] = true; nama[u[0]] = u[3]; });
  const T = rows_('Tagihan'), tg = {}; T.forEach(t => tg[t[0]] = t);
  const P = rows_('Pembayaran').filter(p => set[p[1]]), R = rows_('Rekap_Tabungan').filter(r => set[r[0]]);
  const s = sh_('Tabungan'), last = s.getLastRow();
  const B = last > 1 ? s.getRange(2, 1, last - 1, 7).getValues().filter(r => set[String(r[2])]) : [];
  const paid = {}; P.forEach(p => { const k = p[1] + '|' + p[2]; paid[k] = (paid[k] || 0) + p[3]; });
  const shT = [['NISN', 'Nama', 'Periode', 'Nama_Tagihan', 'Jenis', 'Nominal_Satuan', 'Jumlah_Bulan', 'Total', 'Terbayar', 'Sisa', 'Status']];
  U.forEach(u => T.forEach(t => {
    const by = paid[u[0] + '|' + t[0]], ada = by !== undefined;
    if (!ada) return;   // alumni tidak ditagih tagihan tahun berjalan; yang tampil hanya tagihan yang pernah dicatat
    const tot = total_(t);
    shT.push([u[0], u[3], t[3], t[2], t[5], t[4], bln_(t), tot, by || 0, Math.max(0, tot - (by || 0)), aktifT_(t) ? 'Aktif' : 'Arsip ' + t[8]]);
  }));
  const shP = [['NISN', 'Nama', 'Waktu_Catat', 'Nama_Tagihan', 'Periode', 'Jumlah', 'Catatan']];
  P.slice().sort((a, b) => nama[a[1]].localeCompare(nama[b[1]], 'id') || String(a[0]).localeCompare(String(b[0]))).forEach(p => {
    const t = tg[p[2]]; shP.push([p[1], nama[p[1]], p[0], t ? t[2] : '(tagihan sudah dihapus)', t ? t[3] : '', p[3], p[4]]);
  });
  const shB = [['NISN', 'Nama', 'Dicatat', 'Tanggal', 'Jenis', 'Jumlah', 'Catatan', 'Petugas']];
  B.slice().sort((a, b) => nama[String(a[2])].localeCompare(nama[String(b[2])], 'id') || tglS_(a[1]).localeCompare(tglS_(b[1])) || wkt_(a[0]).localeCompare(wkt_(b[0])))
    .forEach(r => shB.push([String(r[2]), nama[String(r[2])], wkt_(r[0]), tglS_(r[1]), String(r[3]), Number(r[4]) || 0, String(r[5]), String(r[6])]));
  const shR = [['NISN', 'Nama', 'TA', 'Setor', 'Tarik', 'Koreksi']];
  R.slice().sort((a, b) => nama[a[0]].localeCompare(nama[b[0]], 'id') || a[1].localeCompare(b[1])).forEach(r => shR.push([r[0], nama[r[0]], r[1], r[2], r[3], r[4]]));
  const shS = [['NISN', 'Nama', 'Kelas_Asal', 'Angkatan']].concat(U.map(u => [u[0], u[3], u[6], u[5]]));
  return { jumlah: U.length, sheets: [['Siswa', shS], ['Tagihan', shT], ['Pembayaran', shP], ['Tabungan', shB], ['Rekap_Tabungan', shR]] };
}
function getDataAlumni(tk, nisns) {
  sess_(tk, true);
  const a = dataAlumni_(Array.isArray(nisns) ? nisns : []);
  if (!a.jumlah) throw new Error('Data alumni tidak ditemukan.');
  return a;
}
// Hapus bersih seluruh data alumni (akun, pembayaran, buku besar dan ringkasan tabungan). Hanya akun berstatus Alumni yang bisa dihapus.
function hapusAlumni(tk, p) {
  sess_(tk, true);
  return lock_(() => {
    if (norm2_(p.konfirmasi) !== 'HAPUS ALUMNI') throw new Error('Konfirmasi HAPUS ALUMNI tidak sesuai.');
    const set = {}; (Array.isArray(p.nisns) ? p.nisns : []).forEach(n => set[String(n)] = true);
    const us = rows_('Users'), hapus = {}; us.forEach(u => { if (!isTU_(u[2]) && u[4] === 'Alumni' && set[u[0]]) hapus[u[0]] = true; });
    const n = Object.keys(hapus).length; if (!n) throw new Error('Tidak ada alumni yang cocok untuk dihapus.');
    write_('Users', us.filter(u => !hapus[u[0]]));
    let baris = 0; SHEET_NISN_.forEach(x => { baris += hapusBarisNisn_(x[0], x[1], hapus); });
    Object.keys(hapus).forEach(cabutIngat_);
    return { alumni: n, baris: baris };
  });
}

// Menjalankan akhir tahun ajaran. Syarat dicek ULANG di server saat tombol ditekan.
// Kelas 1-5 naik; kelas FINAL_KELAS menjadi Alumni (Kelas = 'Alumni', Tahun_Lulus, Kelas_Asal). Sisa tagihan yang belum lunas dibawa ke tahun ajaran baru.
function naikKelas(tk, p) {
  const me = sess_(tk, true);
  return lock_(() => {
    if (norm2_(p.konfirmasi) !== 'KELULUSAN') throw new Error('Konfirmasi KELULUSAN tidak sesuai.');
    const st = akhirTahun_();
    if (String(p.ta) !== st.ta) throw new Error('Tahun ajaran sudah berubah. Muat ulang halaman Akhir tahun.');
    if (!st.siap) throw new Error('Belum bisa dijalankan: ' + st.masalah.join(' '));
    append_('Log_Akhir_Tahun', [[now_(), me.u, st.ta, 'Mulai', 0, 0, 0, 0]]);   // penanda: bila proses terputus, tidak bisa diulang diam-diam
    const U = rows_('Users'), T = rows_('Tagihan'), P = rows_('Pembayaran'), ada = {}, tanda = []; let naik = 0, lulus = 0, arsip = 0;
    P.forEach(x => { ada[x[1] + '|' + x[2]] = true; });
    U.forEach(u => {
      if (isTU_(u[2]) || u[4] === 'Alumni') return;
      T.forEach(t => {   // siswa yang belum membayar sama sekali diberi baris penanda Rp0 agar tunggakannya tetap tercatat setelah tagihan diarsipkan
        if (!aktifT_(t) || !(t[1] === u[4] || t[1] === 'Semua')) return;
        if (!ada[u[0] + '|' + t[0]] && total_(t) > 0) tanda.push([now_(), u[0], t[0], 0, 'Tunggakan dibawa ke TA berikutnya']);
      });
      const pk = parseKelas_(u[4]);
      if (pk.n >= FINAL_KELAS) { u[5] = st.tahunLulus; u[6] = u[4]; u[4] = 'Alumni'; lulus++; } else { u[4] = (pk.n + 1) + pk.s; naik++; }
    });
    append_('Pembayaran', tanda);
    T.forEach(t => { if (!t[8]) { t[8] = st.ta; arsip++; } });   // 1) tagihan tahun ini diarsipkan; pembayaran tetap tersimpan
    write_('Tagihan', T);
    write_('Users', U);                                          // 2) kelas dinaikkan, kelas FINAL_KELAS menjadi Alumni
    const C = rows_('Config'), i = C.findIndex(r => r[0] === 'tahunAjaran');
    if (i >= 0) C[i][1] = st.taBaru; else C.push(['tahunAjaran', st.taBaru]);
    write_('Config', C);                                         // 3) tahun ajaran berganti
    const L = rows_('Log_Akhir_Tahun'), lg = L[L.length - 1];
    lg[3] = 'Selesai'; lg[4] = naik; lg[5] = lulus; lg[6] = arsip; lg[7] = 0; write_('Log_Akhir_Tahun', L);
    return { naik: naik, lulus: lulus, arsip: arsip, tahunLulus: st.tahunLulus, taBaru: st.taBaru };
  });
}
