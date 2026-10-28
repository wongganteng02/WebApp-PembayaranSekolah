// Bagian 1: pengaturan, login, tampilan wali murid
const API_URL=((document.querySelector('meta[name="api-url"]')||{}).content||'').replace(/["'\u2018\u2019\u201C\u201D\s]/g,'');
const API_OK=/^https:\/\/script\.google\.com\/.+\/exec$/.test(API_URL);
const IC={user:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',lock:'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',arr:'M5 12h14M13 6l6 6-6 6',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',dash:'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',table:'M3 5h18v14H3zM3 10h18M9 5v14',receipt:'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',users:'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8',imp:'M12 3v12M7 10l5 5 5-5M4 19h16',set:'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M14 4v4M6 10v4M16 16v4',key:'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3',out:'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',print:'M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z',plus:'M12 5v14M5 12h14',menu:'M4 6h16M4 12h16M4 18h16',edit:'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',del:'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',rst:'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',coin:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4'};
const ico=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[n]}"/></svg>`;
let me=null,cfg={},D={siswa:[],tagihan:[],bayar:[]},PM={},users=[],kls='',chart=null,roleSel='siswa',cur='';
const tk=()=>me&&me.token,$=id=>document.getElementById(id);
const rp=n=>'Rp'+(Number(n)||0).toLocaleString('id-ID');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const srv=async(fn,...args)=>{
 if(!API_OK)throw new Error('Link /exec belum terpasang dengan benar di index.html. Isi tulisan GANTI_DENGAN_LINK_EXEC_ANDA di bagian atas file dengan link yang berakhiran /exec.');
 let res;const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),30000);
 try{res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn,args}),signal:ctl.signal})}catch(e){throw new Error(e.name==='AbortError'?'Server tidak menjawab dalam 30 detik. Coba lagi.':'Tidak bisa terhubung ke server. Periksa koneksi internet.')}finally{clearTimeout(tm)}
 let j;try{j=await res.json()}catch(e){throw new Error('Balasan server tidak terbaca. Pastikan deployment Apps Script diatur akses "Siapa saja" dan sudah memakai versi terbaru.')}
 if(!j.ok)throw new Error(j.error||'Terjadi kesalahan di server.');return j.data;
};
async function go(f,ok){$('loading').hidden=false;try{const r=await f();if(ok)Swal.fire({icon:'success',title:ok,timer:1300,showConfirmButton:false});return r}catch(e){Swal.fire({icon:'error',title:'Gagal',text:e.message,confirmButtonColor:'#3f5d7d'})}finally{$('loading').hidden=true}}
const ask=(title,html,pre,w,open)=>Swal.fire({title,html,width:w||460,showCancelButton:true,confirmButtonText:'Simpan',cancelButtonText:'Batal',buttonsStyling:false,customClass:{popup:'fpop',confirmButton:'btn p',cancelButton:'btn',actions:'fact'},focusConfirm:false,preConfirm:pre,didOpen:open});
const confirmX=(t,x)=>Swal.fire({title:t,text:x,icon:'warning',showCancelButton:true,confirmButtonText:'Ya, lanjutkan',cancelButtonText:'Batal',buttonsStyling:false,customClass:{confirmButton:'btn dg',cancelButton:'btn',actions:'fact'}}).then(r=>r.isConfirmed);
const initial=s=>(String(s||'?').trim()[0]||'?').toUpperCase();
const avatar=(c,s)=>c.logoUrl?`<img src="${esc(c.logoUrl)}" alt="">`:initial(s);
const pill=k=>`<span class="pill ${k?'wn':'ok'}">${k?'Belum lunas':'Lunas'}</span>`;
/* ===== tagihan bulanan: rincian per bulan (tahun ajaran Juli-Juni) ===== */
const BLN_L=['Juli','Agustus','September','Oktober','November','Desember','Januari','Februari','Maret','April','Mei','Juni'],BLN_S=['Jul','Agu','Sep','Okt','Nov','Des','Jan','Feb','Mar','Apr','Mei','Jun'];
const nowIdx=()=>((new Date().getMonth()+6)%12)+1;            // bulan sekarang dalam urutan tahun ajaran: 1=Juli ... 12=Juni
const rb=n=>n>=1000?Math.round(n/1000)+'rb':String(n);
const rentang=b=>BLN_L[b.mulai-1]+(b.bulan>1?'–'+BLN_L[Math.min(12,b.mulai+b.bulan-1)-1]:'');
function rinci(b){                                              // pembayaran dialokasikan ke bulan terlama yang belum lunas
 if(b.jenis!=='Bulanan')return null;
 let sisa=b.dibayar;const now=nowIdx(),out=[];
 for(let k=0;k<b.bulan;k++){const idx=b.mulai+k;if(idx>12)break;
  const p=Math.min(b.satuan,Math.max(0,sisa)),due=idx<=now;sisa-=b.satuan;
  out.push({idx,nama:BLN_L[idx-1],singkat:BLN_S[idx-1],bayar:p,kurang:b.satuan-p,due,st:p>=b.satuan?'lunas':p>0?'sebagian':due?'belum':'nanti'})}
 return out}
const tunggak=b=>b.jenis==='Bulanan'?rinci(b).filter(m=>m.due).reduce((x,m)=>x+m.kurang,0):Math.max(0,b.nominal-b.dibayar);
const pillS=(tg,k)=>pill(tg>0);   // Lunas = tidak ada tunggakan sampai bulan ini; Belum lunas = ada tunggakan
function chips(b){const r=rinci(b);if(!r)return '';const un=r.filter(m=>m.due&&m.kurang>0),tt=un.reduce((x,m)=>x+m.kurang,0);
 return `<div class="mgrid">${r.map(m=>`<div class="mc ${m.st}" title="${m.nama}"><b>${m.singkat}</b><span>${m.st==='lunas'?'Lunas':m.st==='sebagian'?'Kurang '+rb(m.kurang):m.st==='belum'?'Belum':'–'}</span></div>`).join('')}</div>
 <div class="msum ${un.length?'wn':'ok'}">${un.length?'Belum dibayar: '+un.map(m=>m.nama+(m.st==='sebagian'?' (kurang '+rp(m.kurang)+')':'')).join(', ')+' · tunggakan '+rp(tt):'Tidak ada tunggakan sampai bulan ini'}</div>`}


document.addEventListener('DOMContentLoaded',()=>{$('diag').hidden=true;$('cfgWarn').hidden=API_OK;$('burger').innerHTML=ico('menu');$('icU').innerHTML=ico('user');$('icP').innerHTML=ico('lock');$('icE').innerHTML=ico('eye');$('icA').innerHTML=ico('arr');try{localStorage.removeItem('tagihanUser')}catch(e){}go(async()=>{cfg=await srv('getConfig');applyCfg();await autoLogin()})});
function applyCfg(){
 $('lgYay').textContent=cfg.namaYayasan||'';$('lgSek').textContent=cfg.namaSekolah||'Tagihan Siswa';$('lgAlm').textContent=cfg.alamatSekolah||'';
 $('lgAv').innerHTML=avatar(cfg,cfg.namaSekolah);if(me)drawSide();
}
function setRole(r){if(r!==roleSel){$('username').value='';$('password').value=''}roleSel=r;$('rSiswa').className=r=='siswa'?'on':'';$('rTU').className=r=='guru'?'on':'';$('lbU').textContent=r=='siswa'?'NISN':'Username';$('username').placeholder=r=='siswa'?'Masukkan NISN':'Masukkan username'}
/* ===== "Ingat saya": token panjang disimpan di perangkat, server hanya menyimpan hash-nya (tanpa batas waktu) ===== */
function simpanRt(v){try{if(v)localStorage.setItem('tagihanRt',v);else localStorage.removeItem('tagihanRt')}catch(e){}}
function masuk(r){const tu=r.role==='guru'||r.role==='admin';me=r;me.tu=tu;$('login').hidden=true;$('app').hidden=false;$('app').className=tu?'shell':'solo';drawSide();return tu}
async function autoLogin(){
 let rt='';try{rt=localStorage.getItem('tagihanRt')||''}catch(e){}
 if(!rt)return;
 let r;try{r=await srv('masukOtomatis',rt)}catch(e){return}      // gangguan jaringan: tampilkan form login, token tetap disimpan
 if(r.status!=='success'){simpanRt('');return}                    // token kedaluwarsa/dicabut
 const tu=masuk(r);setRole(tu?'guru':'siswa');
 if(tu)menu('dashboard');else await loadSiswa();
}
function handleLogin(e){
 e.preventDefault();
 go(async()=>{
  const r=await srv('authenticateUser',$('username').value,$('password').value,$('remember').checked);
  if(r.status!=='success'){Swal.fire({icon:'error',title:'Login gagal',text:r.message,confirmButtonColor:'#3f5d7d'});return}
  const tu=r.role==='guru'||r.role==='admin';
  if(tu!==(roleSel==='guru')){if(r.ingat)srv('keluarIngat',r.ingat).catch(()=>{});Swal.fire({icon:'warning',title:'Perhatian',text:tu?'Akun ini adalah akun Admin. Pilih tab Admin.':'Akun ini adalah akun Siswa. Pilih tab Siswa.',confirmButtonColor:'#3f5d7d'});return}
  simpanRt(r.ingat||'');masuk(r);
  if(tu)menu('dashboard');else await loadSiswa();
 });
}
function logout(){let rt='';try{rt=localStorage.getItem('tagihanRt')||''}catch(e){}if(rt)srv('keluarIngat',rt).catch(()=>{});simpanRt('');me=null;$('app').hidden=true;$('login').hidden=false;$('password').value='';$('username').value='';$('remember').checked=false;if(chart){chart.destroy();chart=null}}
const toggleSide=()=>$('app').classList.toggle('open');
function drawSide(){
 const g=me.tu?[['Ringkasan',[['dashboard','Dashboard','dash']]],['Keuangan',[['rekap','Rekap pembayaran','table'],['tagihan','Tagihan','receipt'],['tabungan','Tabungan','coin']]],['Data',[['siswa','Data siswa','users'],['impor','Impor tagihan','imp'],['alumni','Alumni','users'],['akhir','Akhir tahun','rst']]]]:[];
 $('side').innerHTML=`<div class="brand"><div class="av">${avatar(cfg,cfg.namaSekolah)}</div><div><b>${esc(cfg.namaSekolah)}</b><span class="mu sm">TA ${esc(cfg.tahunAjaran)}</span></div></div>
 ${g.map(x=>`<div class="grp">${x[0]}</div>${x[1].map(i=>`<button class="nav ${cur==i[0]?'on':''}" onclick="menu('${i[0]}')">${ico(i[2])}${i[1]}</button>`).join('')}`).join('')}
 <div class="foot"><div class="me"><div class="av">${initial(me.nama)}</div><div style="min-width:0"><b class="sm" style="display:block">${esc(me.nama)}</b><span class="mu sm">Admin</span></div></div>
 <button class="nav" onclick="settingsUI()">${ico('set')}Pengaturan</button><button class="nav" onclick="changePwUI()">${ico('key')}Ganti password</button><button class="nav" onclick="logout()">${ico('out')}Keluar</button></div>`;
}
function page(t,s,a,h){$('pgT').textContent=t;$('pgS').textContent=s||'';$('pgA').innerHTML=a||'';$('view').innerHTML=h}
function changePwUI(){
 ask('Ganti password','<input id="p0" type="password" class="swal2-input" placeholder="Password saat ini"><input id="p1" type="password" class="swal2-input" placeholder="Password baru (min. 6 karakter)"><input id="p2" type="password" class="swal2-input" placeholder="Ulangi password baru">',
  ()=>{if(p1.value.length<6)return Swal.showValidationMessage('Password baru minimal 6 karakter.');if(p1.value!==p2.value)return Swal.showValidationMessage('Konfirmasi tidak sama.');return[p0.value,p1.value]}).then(r=>{
  if(r.isConfirmed)go(()=>srv('changePassword',tk(),r.value[0],r.value[1]).then(()=>{me.passAwal=false;simpanRt('');if(!me.tu)loadSiswa()}),'Password diganti')});
}

/* ===== WALI MURID ===== */
async function loadSiswa(){
 await go(async()=>{
  const d=await srv('getMine',tk()),B=d.bills,tot=B.reduce((x,b)=>x+b.nominal,0),pay=B.reduce((x,b)=>x+Math.min(b.dibayar,b.nominal),0),k=tot-pay,lg=(d.lama||[]).reduce((x,b)=>x+Math.max(0,b.nominal-b.dibayar),0),tg=B.reduce((x,b)=>x+tunggak(b),0)+lg,bn=BLN_L[nowIdx()-1];
  $('pgT').textContent=cfg.namaSekolah||'Tagihan Siswa';$('pgS').textContent='Tagihan siswa · TA '+(cfg.tahunAjaran||'');
  $('pgA').innerHTML=`<button class="btn" onclick="changePwUI()">${ico('key')}Password</button><button class="btn" onclick="logout()">${ico('out')}Keluar</button>`;
  $('view').innerHTML=`${me.passAwal?'<div class="card" style="background:var(--wns);border-color:#f0dcb0;color:var(--wn)">Password Anda masih bawaan (123456). Demi keamanan, silakan ganti lewat tombol Password.</div>':''}
  <div class="card"><div class="mu sm">${esc(d.nama)} · NISN ${esc(d.nisn)} · ${d.kelas==='Alumni'?'Alumni '+esc(d.lulus):'Kelas '+esc(d.kelas)}</div><div class="sl" style="margin-top:14px">Tunggakan sampai ${bn}</div>
   <div class="stat" style="font-size:2rem;color:${tg?'var(--wn)':'var(--ok)'}">${rp(tg)}</div><div style="margin-top:4px">${pillS(tg,k)}</div>
   <div class="trio"><div><span>Total setahun</span><b>${rp(tot)}</b></div><div><span>Sudah dibayar</span><b>${rp(pay)}</b></div><div><span>Sisa setahun</span><b>${rp(k)}</b></div></div>
   <div class="meter"><i style="width:${tot?Math.min(100,pay/tot*100):0}%"></i></div></div>
  ${lg?`<div class="card"><h2>Tunggakan tahun ajaran sebelumnya</h2><div class="tw"><table><tbody>${d.lama.map(b=>`<tr><td><b>${esc(b.nama)}</b><div class="mu sm">TA ${esc(b.ta)}${b.periode?' · '+esc(b.periode):''}</div></td><td class="r"><b>${rp(b.nominal-b.dibayar)}</b><div class="mu sm">dari ${rp(b.nominal)}</div></td></tr>`).join('')}</tbody></table></div><div class="sm mu" style="margin-top:8px">Sisa pembayaran tahun ajaran lalu yang dibawa ke tahun ini. Pelunasan dilakukan lewat petugas TU.</div></div>`:''}
  <div id="tabCard"></div>
  <div class="card"><h2>Rekap pembayaran</h2>${(()=>{const p=[...new Set(B.map(b=>b.periode).filter(Boolean))].join(', ');return p?`<div class="sm mu" style="margin:-6px 0 10px">Periode: ${esc(p)}</div>`:''})()}<div class="tw"><table class="rk"><thead><tr><th class="sticky">Nama</th>${B.map(b=>`<th>${esc(b.nama)}<small>${rp(b.nominal)}</small>${b.jenis==='Bulanan'?`<small>${rp(b.satuan)} × ${b.bulan} bln</small>`:''}</th>`).join('')}<th class="r">Total</th><th class="r">Kekurangan</th><th>Ket.</th></tr></thead>
  <tbody><tr><td class="sticky" style="white-space:normal;min-width:120px;max-width:170px"><b>${esc(d.nama)}</b></td>${B.map(b=>`<td class="${b.dibayar>=b.nominal?'fu':b.dibayar>0?'pt':'z'}"><b>${rp(Math.min(b.dibayar,b.nominal))}</b></td>`).join('')}<td class="r"><b>${rp(pay)}</b></td><td class="r"><b>${rp(k)}</b></td><td>${pillS(tg,k)}</td></tr></tbody></table></div><div class="sm mu hint">Geser tabel ke kanan untuk melihat semua kolom.</div></div>
  <div class="card"><h2>Rincian per tagihan</h2>${B.map(b=>{const kk=Math.max(0,b.nominal-b.dibayar),tb=tunggak(b),bl=b.jenis==='Bulanan';return `<div class="bill"><div class="bh"><div><b>${esc(b.nama)}</b><div class="mu sm">${esc(b.periode)}${bl?' · '+rp(b.satuan)+' × '+b.bulan+' bulan ('+rentang(b)+')':' · per tahun'}</div></div>${pill(tb>0)}</div>
  <div class="meter" style="height:6px"><i style="width:${b.nominal?Math.min(100,b.dibayar/b.nominal*100):0}%"></i></div><div class="sm mu">Terbayar ${rp(Math.min(b.dibayar,b.nominal))} dari ${rp(b.nominal)}${kk>0?' · sisa '+rp(kk):''}</div>${chips(b)}
  ${b.riwayat.length?`<details><summary>Riwayat pembayaran</summary>${b.riwayat.map(r=>`<div>${esc(r.tgl)} · ${rp(r.jumlah)}${r.catatan?' · '+esc(r.catatan):''}</div>`).join('')}</details>`:''}</div>`}).join('')||'<p class="mu">Belum ada tagihan untuk kelas ini.</p>'}</div>
  <p class="sm mu">Status Lunas berarti tidak ada tunggakan sampai bulan ini; bulan yang belum jatuh tempo belum dihitung. Pembayaran dicatat ke bulan terlama yang belum lunas. Jika angka tidak sesuai dengan pembayaran yang pernah dilakukan, hubungi petugas TU dengan membawa bukti pembayaran.</p>`;
  srv('getTabunganSaya',tk()).then(drawTabSaya).catch(()=>{});   // kartu tabungan dimuat terpisah agar halaman utama tidak menunggu
 });
}
function drawTabSaya(r){
 const el=$('tabCard');if(!el||(!r.riwayat.length&&!r.saldo))return;      // sekolah/siswa yang belum memakai tabungan tidak melihat kartu kosong
 const cur=r.perTA.find(x=>x.ta===r.taSekarang)||{setor:0,tarik:0,koreksi:0},tot=r.perTA.reduce((x,t)=>x+t.setor,0);
 el.innerHTML=`<div class="card"><h2>Tabungan</h2><div class="sl">Saldo tabungan</div><div class="stat" style="font-size:1.8rem;color:var(--ok)">${rp(r.saldo)}</div>
  <div class="trio"><div><span>Setoran TA ${esc(r.taSekarang)}</span><b>${rp(cur.setor)}</b></div><div><span>Pencairan TA ini</span><b>${rp(cur.tarik)}</b></div><div><span>Total setoran semua tahun</span><b>${rp(tot)}</b></div></div>
  ${r.perTA.length>1?`<div class="sm mu" style="margin-bottom:8px">${r.perTA.map(t=>`TA ${esc(t.ta)}: setor ${rp(t.setor)}${t.tarik?', cair '+rp(t.tarik):''}`).join(' · ')}</div>`:''}
  ${r.riwayat.length?`<details><summary>Riwayat tabungan (${r.riwayat.length} terakhir)</summary><div class="tw" style="margin-top:8px"><table><tbody>${r.riwayat.map(x=>{const neg=x.jenis==='Tarik'||x.jumlah<0;return `<tr><td>${esc(x.tgl)}</td><td>${esc(x.jenis==='Tarik'?'Pencairan':x.jenis)}</td><td class="r ${neg?'':'fu'}"><b>${neg?'−':'+'}${rp(Math.abs(x.jumlah))}</b></td><td class="mu sm" style="white-space:normal">${esc(x.catatan)}</td></tr>`}).join('')}</tbody></table></div></details>`:''}
  <div class="sm mu" style="margin-top:8px">Saldo adalah uang titipan milik siswa dan terpisah dari tagihan sekolah.</div></div>`;
}
window.__app1=1;
