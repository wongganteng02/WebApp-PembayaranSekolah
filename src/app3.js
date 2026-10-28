// Bagian 3: akhir tahun ajaran (naik kelas otomatis + kelulusan) dan menu Alumni
let AT=null;
const FINAL=6;   // kelas tertinggi di SD; siswa kelas ini menjadi Alumni
function akhir(){
 const a=AT,b=a.bawa;
 page('Akhir tahun ajaran','Naik kelas dan kelulusan · TA '+a.ta,'',`
 ${a.siap?`<div class="msum ok" style="font-size:.9rem;padding:12px 14px;margin:0 0 16px"><b>Siap dijalankan.</b> Tidak ada syarat pelunasan: tunggakan dibawa ke tahun ajaran berikutnya.</div>`
 :`<div class="msum wn" style="font-size:.9rem;padding:12px 14px;margin:0 0 16px"><b>Belum bisa dijalankan.</b><ul style="margin:6px 0 0;padding-left:18px">${a.masalah.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>`}
 <div class="card"><h2>Rencana kenaikan</h2>
  <div class="tw"><table><thead><tr><th>Kelas sekarang</th><th>Menjadi</th><th class="r">Jumlah siswa</th></tr></thead><tbody>${a.rencana.map(r=>`<tr><td>${esc(r.dari)}</td><td><b>${esc(r.ke)}${r.ke==='Alumni'?' '+esc(a.tahunLulus):''}</b></td><td class="r">${r.jumlah}</td></tr>`).join('')||'<tr><td class="mu" colspan="3">Tidak ada siswa aktif.</td></tr>'}</tbody></table></div>
  <ul class="sm mu" style="padding-left:18px;margin:12px 0 0;line-height:1.6"><li>Tahun ajaran berubah dari <b>${esc(a.ta)}</b> menjadi <b>${esc(a.taBaru||'-')}</b>.</li><li><b>${a.tagihanAktif} tagihan</b> tahun ini diarsipkan. Tagihan tahun baru dibuat di menu Tagihan (bisa dengan tombol Salin tagihan tahun lalu).</li><li>${b.naik?`<b>${b.naik} siswa</b> kelas 1–${FINAL-1} masih punya sisa tagihan (<b>${rp(b.naikRp)}</b>). Sisa itu dibawa ke tahun ajaran baru sebagai <b>Tunggakan TA lalu</b> di Rekap pembayaran.`:`Tidak ada sisa tagihan siswa kelas 1–${FINAL-1} yang perlu dibawa.`}</li><li>${a.lulus?`<b>${a.lulus} siswa kelas ${FINAL}</b> (lunas maupun belum) pindah ke menu <b>Alumni</b> dengan status Alumni angkatan <b>${esc(a.tahunLulus)}</b>.${b.lulus?` ${b.lulus} di antaranya masih punya tunggakan (<b>${rp(b.lulusRp)}</b>) yang dilunasi dari menu Alumni.`:''}`:`Tidak ada siswa kelas ${FINAL} saat ini.`}</li><li>Riwayat pembayaran dan tabungan semua siswa tetap tersimpan. Tidak ada data yang dihapus.</li></ul></div>
 <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div class="sm mu" style="flex:1;min-width:200px">Menaikkan kelas seluruh siswa dan memindahkan siswa kelas ${FINAL} ke Alumni. Tidak bisa dibatalkan dari aplikasi.</div><button class="btn dg" ${a.siap?'':'disabled'} onclick="naikKelasUI()">${ico('rst')}Naikkan semua kelas</button></div>`);
}
function naikKelasUI(){
 const a=AT;
 Swal.fire({title:'Naikkan semua kelas?',width:500,html:`<div class="fm"><div class="msum wn" style="margin:0 0 12px">Semua siswa naik ke kelas berikutnya.${a.lulus?`<br><b>${a.lulus} siswa kelas ${FINAL} menjadi Alumni angkatan ${esc(a.tahunLulus)}</b> dan dipindahkan ke menu Alumni.`:''}<br>Tahun ajaran <b>${esc(a.ta)}</b> → <b>${esc(a.taBaru)}</b>. ${a.tagihanAktif} tagihan diarsipkan, sisa tagihan yang belum lunas dibawa ke tahun ajaran baru.</div>
  <div class="fg"><label for="nkf">Ketik <b>KELULUSAN</b> untuk melanjutkan</label><input id="nkf" class="in" autocomplete="off" autocapitalize="characters" placeholder="KELULUSAN"></div><div class="fnote">Tindakan ini tidak bisa dibatalkan dari aplikasi.</div></div>`,
  showCancelButton:true,confirmButtonText:'Naikkan kelas',cancelButtonText:'Batal',buttonsStyling:false,customClass:{popup:'fpop',confirmButton:'btn dg',cancelButton:'btn',actions:'fact'},
  preConfirm:()=>{if($('nkf').value.trim().toUpperCase().replace(/\s+/g,' ')!=='KELULUSAN')return Swal.showValidationMessage('Ketik KELULUSAN persis untuk melanjutkan.');return{ta:a.ta,konfirmasi:$('nkf').value}}
 }).then(async r=>{
  if(!r.isConfirmed)return;
  const x=await go(async()=>{const x=await srv('naikKelas',tk(),r.value);cfg.tahunAjaran=x.taBaru;kls='';ALF={th:'',k:''};await loadData();AT=await srv('getAkhirTahun',tk());drawSide();akhir();return x});
  if(x)Swal.fire({icon:'success',title:'Kenaikan kelas selesai',html:`${x.naik} siswa naik kelas, ${x.lulus} siswa menjadi Alumni angkatan ${esc(x.tahunLulus)}.<br>${x.arsip} tagihan diarsipkan.<br>Tahun ajaran sekarang <b>${esc(x.taBaru)}</b>.<br><br>Langkah berikutnya: buka menu Tagihan, lalu salin tagihan tahun lalu atau buat tagihan baru.`,confirmButtonColor:'#3f5d7d'});
 });
}
/* ===== menu Alumni: siswa kelas 6 yang sudah lulus ===== */
let ALF={th:'',k:''};   // filter angkatan dan kelas asal
const alumniAll=()=>D.siswa.filter(s=>s.kelas==='Alumni'),salA=s=>(TB.saldo[s.nisn]||{}).saldo||0,nk=(a,b)=>String(a).localeCompare(String(b),'id',{numeric:true});
function alumniView(){
 const all=alumniAll(),ths=[...new Set(all.map(s=>s.lulus))].sort().reverse();
 if(ALF.th!=='Semua'&&!ths.includes(ALF.th))ALF.th=ths[0]||'Semua';
 const byTh=all.filter(s=>ALF.th==='Semua'||s.lulus===ALF.th),ks=[...new Set(byTh.map(s=>s.asal))].sort(nk);
 if(ALF.k&&!ks.includes(ALF.k))ALF.k='';
 const ss=byTh.filter(s=>!ALF.k||s.asal===ALF.k).sort((a,b)=>nk(b.lulus,a.lulus)||nk(a.asal,b.asal)||a.nama.localeCompare(b.nama,'id'));
 return{all,ths,ks,ss};
}
const ketAlumni=()=>(ALF.th==='Semua'?'semua angkatan':'angkatan '+ALF.th)+(ALF.k?' · kelas '+ALF.k:'');
function alumni(){
 const{all,ths,ks,ss}=alumniView(),tgT=ss.reduce((x,s)=>x+lamaS(s),0),blm=ss.filter(s=>lamaS(s)>0).length,sal=ss.reduce((x,s)=>x+salA(s),0);
 page('Alumni','Siswa kelas '+FINAL+' yang sudah lulus · pelunasan, cetak, dan hapus data',
 all.length?`<select class="in" style="width:auto" aria-label="Angkatan" onchange="ALF.th=this.value;ALF.k='';alumni()"><option value="Semua" ${ALF.th==='Semua'?'selected':''}>Semua angkatan</option>${ths.map(t=>`<option ${t===ALF.th?'selected':''}>${esc(t)}</option>`).join('')}</select><select class="in" style="width:auto" aria-label="Kelas asal" onchange="ALF.k=this.value;alumni()"><option value="">Semua kelas</option>${ks.map(k=>`<option ${k===ALF.k?'selected':''}>${esc(k)}</option>`).join('')}</select><button class="btn" onclick="cetakAlumni('daftar')">${ico('print')}Cetak daftar</button><button class="btn" onclick="cetakAlumni('detail')">${ico('print')}Cetak data lengkap</button><button class="btn dg" onclick="hapusAlumniUI()">${ico('del')}Hapus yang tampil</button>`:'',
 !all.length?empty('Belum ada alumni','Siswa kelas '+FINAL+' otomatis pindah ke sini saat kenaikan kelas dijalankan di menu Akhir tahun.')
 :`<div class="grid4">${[['Jumlah alumni',ss.length,'users'],['Belum lunas',blm+' siswa','receipt'],['Total tunggakan',rp(tgT),'table'],['Saldo tabungan',rp(sal),'coin']].map(x=>`<div class="card"><div class="sl"><span>${ico(x[2])}</span>${x[0]}</div><div class="stat">${x[1]}</div></div>`).join('')}</div>
 <div class="card"><div class="sm mu" style="margin-bottom:10px">Menampilkan ${esc(ketAlumni())}. Tunggakan adalah sisa tagihan saat masih siswa; catat pelunasannya dengan tombol Bayar.</div>
 <div class="tw"><table><thead><tr><th>Nama</th><th>Kelas asal</th><th>Angkatan</th><th class="r">Tunggakan</th><th class="r">Saldo tabungan</th><th>Ket.</th><th></th></tr></thead><tbody>${ss.map(s=>{const t=lamaS(s),b=salA(s);return `<tr><td style="white-space:normal;min-width:120px"><b>${esc(s.nama)}</b><div class="mu sm">${esc(s.nisn)}</div></td><td>${esc(s.asal)}</td><td>${esc(s.lulus)}</td><td class="r">${rp(t)}</td><td class="r">${rp(b)}</td><td>${pill(t>0)}</td>
 <td class="r nw">${t>0?`<button class="btn" onclick="bayarLamaUI('${esc(s.nisn)}')">Bayar</button> `:''}${b>0?`<button class="btn bc" onclick="cairkanUI('${esc(s.nisn)}')">Cairkan</button> `:''}<button class="btn ib" title="Cetak" aria-label="Cetak" onclick="cetakAlumni('detail','${esc(s.nisn)}')">${ico('print')}</button><button class="btn ib d" title="Hapus" aria-label="Hapus" onclick="hapusAlumniUI('${esc(s.nisn)}')">${ico('del')}</button></td></tr>`}).join('')}</tbody></table></div></div>`);
}
function hapusAlumniUI(nisn){
 const list=nisn?alumniAll().filter(s=>s.nisn===nisn):alumniView().ss;if(!list.length)return;
 const one=list.length===1,tg=list.reduce((x,s)=>x+lamaS(s),0),sal=list.reduce((x,s)=>x+salA(s),0);
 Swal.fire({title:one?'Hapus alumni?':'Hapus '+list.length+' alumni?',width:500,html:`<div class="fm"><div class="msum wn" style="margin:0 0 12px">${one?`<b>${esc(list[0].nama)}</b> (NISN ${esc(list[0].nisn)})`:`<b>${list.length} alumni</b> (${esc(ketAlumni())})`} akan dihapus <b>permanen</b> beserta seluruh datanya sejak masih siswa: akun, pembayaran, dan tabungan.${tg?`<br>Tunggakan <b>${rp(tg)}</b> ikut hilang.`:''}${sal?`<br>Saldo tabungan <b>${rp(sal)}</b> yang belum dicairkan ikut hilang.`:''}</div>
  <div class="fg"><label for="haf">Ketik <b>HAPUS ALUMNI</b> untuk melanjutkan</label><input id="haf" class="in" autocomplete="off" autocapitalize="characters" placeholder="HAPUS ALUMNI"></div><div class="fnote">Tidak bisa dibatalkan. Cetak datanya dulu bila masih diperlukan.</div></div>`,
  showCancelButton:true,confirmButtonText:'Hapus',cancelButtonText:'Batal',buttonsStyling:false,customClass:{popup:'fpop',confirmButton:'btn dg',cancelButton:'btn',actions:'fact'},
  preConfirm:()=>{if($('haf').value.trim().toUpperCase().replace(/\s+/g,' ')!=='HAPUS ALUMNI')return Swal.showValidationMessage('Ketik HAPUS ALUMNI persis untuk melanjutkan.');return $('haf').value}
 }).then(r=>{
  if(!r.isConfirmed)return;
  go(async()=>{const x=await srv('hapusAlumni',tk(),{nisns:list.map(s=>s.nisn),konfirmasi:r.value});await loadData();TB=await srv('getTabunganData',tk());alumni();return x}).then(x=>{if(x)Swal.fire({icon:'success',title:'Alumni dihapus',text:x.alumni+' alumni dan '+x.baris+' baris datanya dihapus.',confirmButtonColor:'#3f5d7d'})});
 });
}
async function cetakAlumni(mode,nisn){
 const list=nisn?alumniAll().filter(s=>s.nisn===nisn):alumniView().ss;if(!list.length)return;
 if(mode==='daftar'){
  const tgl=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),tT=list.reduce((x,s)=>x+lamaS(s),0),tS=list.reduce((x,s)=>x+salA(s),0);
  cetakDok(`${kopHtml()}<div style="text-align:center;margin:14px 0"><b>Daftar Alumni · ${esc(ketAlumni())}</b><br><small>dicetak ${esc(tgl)}</small></div>
  <table style="border-collapse:collapse;width:100%"><thead><tr><th>No</th><th>Nama</th><th>NISN</th><th>Kelas asal</th><th>Angkatan</th><th>Tunggakan</th><th>Saldo tabungan</th><th>Ket.</th></tr></thead><tbody>${list.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.nama)}</td><td>${esc(s.nisn)}</td><td>${esc(s.asal)}</td><td>${esc(s.lulus)}</td><td>${rp(lamaS(s))}</td><td>${rp(salA(s))}</td><td>${lamaS(s)>0?'Belum lunas':'Lunas'}</td></tr>`).join('')}<tr><td></td><td colspan="4"><b>Total</b></td><td><b>${rp(tT)}</b></td><td><b>${rp(tS)}</b></td><td></td></tr></tbody></table>
  <div style="display:flex;justify-content:space-between;margin-top:30px"><div style="text-align:center">Mengetahui,<br>Kepala Sekolah<br><br><br><br><u>${esc(cfg.namaKepala)}</u></div><div style="text-align:center">${esc(tgl)}<br>Guru TU<br><br><br><br><u>${esc(cfg.namaTU)}</u></div></div>`);
  return;
 }
 const x=await go(async()=>alumniPetugas(await srv('getDataAlumni',tk(),list.map(s=>s.nisn))));
 if(x)cetakDetail(x);
}
function alumniPetugas(x){   // nama petugas di riwayat tabungan memakai nama Guru TU dari Pengaturan, bukan username akun
 const n=String(cfg.namaTU||'').trim();if(!n)return x;
 x.sheets.forEach(s=>{if(s[0]==='Tabungan'){const r=s[1],c=r[0].indexOf('Petugas');if(c>=0)for(let i=1;i<r.length;i++)r[i][c]=n}});
 return x;
}
const MONEY=/^(Nominal_Satuan|Total|Terbayar|Sisa|Jumlah|Setor|Tarik|Koreksi)$/;
function cetakDetail(x){   // satu halaman per alumni: identitas, tagihan, setiap pembayaran, riwayat tabungan
 const S={};x.sheets.forEach(s=>S[s[0]]=s[1]);
 const fmt=(h,v)=>MONEY.test(h)&&typeof v==='number'?rp(v):esc(v);
 const tbl=(judul,rows,nisn)=>{const hd=rows[0].slice(2),isi=rows.slice(1).filter(r=>r[0]===nisn);
  return `<div style="margin:12px 0 4px"><b>${judul}</b></div>`+(isi.length?`<table style="border-collapse:collapse;width:100%"><thead><tr>${hd.map(h=>`<th>${esc(h.replace(/_/g,' '))}</th>`).join('')}</tr></thead><tbody>${isi.map(r=>`<tr>${r.slice(2).map((v,i)=>`<td>${fmt(hd[i],v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="sm">Tidak ada data.</div>')};
 const tgl=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
 cetakDok(S.Siswa.slice(1).map((s,i)=>`<div${i?' style="page-break-before:always"':''}>${kopHtml()}<div style="text-align:center;margin:14px 0"><b>Data Alumni · Angkatan ${esc(s[3])}</b><br><small>dicetak ${esc(tgl)}</small></div>
  <table style="border-collapse:collapse;width:100%"><thead><tr><th style="width:26%">NISN</th><th>Nama</th><th style="width:16%">Kelas asal</th><th style="width:14%">Angkatan</th></tr></thead><tbody><tr><td>${esc(s[0])}</td><td><b>${esc(s[1])}</b></td><td>${esc(s[2])}</td><td>${esc(s[3])}</td></tr></tbody></table>
  ${tbl('Tagihan',S.Tagihan,s[0])}${tbl('Riwayat pembayaran',S.Pembayaran,s[0])}${tbl('Riwayat tabungan',S.Tabungan,s[0])}${tbl('Ringkasan tabungan per tahun ajaran',S.Rekap_Tabungan,s[0])}</div>`).join(''));
}
window.__app3=1;
