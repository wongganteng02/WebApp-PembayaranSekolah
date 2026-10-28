// Bagian 2: panel admin (dashboard, rekap, tagihan, siswa, impor, pengaturan)
/* ===== GURU TU ===== */
async function loadData(){const d=await srv('getData',tk());
 if(!d||!Array.isArray(d.siswa)||!Array.isArray(d.tagihan)||!Array.isArray(d.bayar))throw new Error('Balasan server tidak lengkap. Pastikan Code.gs versi terbaru sudah di-deploy ulang di Apps Script.');
 D=d;PM={};D.bayar.forEach(b=>{const k=b.nisn+'|'+b.tid;PM[k]=(PM[k]||0)+b.jumlah})}
const aktif=()=>D.siswa.filter(s=>s.kelas!=='Alumni');   // alumni tidak ikut daftar kelas, rekap, dan tagihan (ada di menu Alumni)
const kelasList=()=>[...new Set(aktif().map(s=>s.kelas))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true}));
const billsOf=k=>k==='Alumni'?[]:D.tagihan.filter(t=>t.kelas==='Semua'||t.kelas===k),paid=(n,t)=>PM[n+'|'+t]||0;
const kur=s=>billsOf(s.kelas).reduce((a,t)=>a+Math.max(0,t.nominal-paid(s.nisn,t.id)),0);
const lamaOf=n=>(D.lama||[]).filter(x=>x.nisn===n&&x.nominal-paid(n,x.tid)>0),lamaS=s=>lamaOf(s.nisn).reduce((a,x)=>a+x.nominal-paid(s.nisn,x.tid),0);   // tunggakan tahun ajaran lalu (dibawa saat naik kelas)
const tungS=s=>billsOf(s.kelas).reduce((a,t)=>a+tunggak(Object.assign({},t,{dibayar:paid(s.nisn,t.id)})),0)+lamaS(s);
const kelasOpt=(sel,all)=>(all?['Semua']:[]).concat(kelasList()).map(k=>`<option ${k==sel?'selected':''}>${esc(k)}</option>`).join('');
function menu(m){
 cur=m;$('app').classList.remove('open');drawSide();
 go(async()=>{if(m==='siswa')users=await srv('listUsers',tk());else if(m!=='impor')await loadData();
  if(m==='tabungan'||m==='alumni')TB=await srv('getTabunganData',tk());
  if(m==='akhir')AT=await srv('getAkhirTahun',tk());
  if(m!=='siswa'&&m!=='impor'||!kls){if(!kls||!kelasList().includes(kls))kls=kelasList()[0]||''}
  ({dashboard,rekap,tagihan,tabungan,akhir,siswa,impor,alumni}[m])()});
}
const empty=(t,p,btn)=>`<div class="card empty"><div class="av">${ico('users')}</div><b>${t}</b><p>${p}</p>${btn?`<div class="eact">${btn}</div>`:''}</div>`;
function dashboard(){
 const ks=kelasList().map(k=>{const ss=aktif().filter(s=>s.kelas===k),t=ss.length*billsOf(k).reduce((x,b)=>x+b.nominal,0),kk=ss.reduce((a,s)=>a+kur(s),0);return{k,t,kk,p:t-kk}});
 const T=ks.reduce((a,x)=>a+x.t,0),K=ks.reduce((a,x)=>a+x.kk,0),pct=T?Math.round((T-K)/T*100):0,lunas=aktif().filter(s=>billsOf(s.kelas).length&&!tungS(s)).length;
 const TG=aktif().reduce((a,s)=>a+tungS(s),0),top=aktif().map(s=>({s,k:tungS(s)})).filter(x=>x.k>0).sort((a,b)=>b.k-a.k).slice(0,8);
 const st=[['Total siswa',aktif().length,'users'],['Tunggakan s/d '+BLN_L[nowIdx()-1],rp(TG),'receipt'],['Terbayar',rp(T-K),'coin'],['Sisa tagihan setahun',rp(K),'table']];
 page('Dashboard','Ringkasan pembayaran seluruh kelas','',aktif().length?`<div class="grid4">${st.map(x=>`<div class="card"><div class="sl"><span>${ico(x[2])}</span>${x[0]}</div><div class="stat">${x[1]}</div></div>`).join('')}</div>
 <div class="card"><div class="sl">Tingkat pelunasan</div><div class="stat">${pct}%</div><div class="meter"><i style="width:${pct}%"></i></div><div class="sm mu">${lunas} siswa berstatus lunas (tanpa tunggakan)</div></div>
 <div class="two"><div class="card"><h2>Terbayar dan kekurangan per kelas</h2><canvas id="ch" height="220"></canvas></div>
 <div class="card"><h2>Tunggakan terbesar</h2>${top.length?`<div class="tw"><table><tbody>${top.map(x=>`<tr><td>${esc(x.s.nama)}<div class="mu sm">Kelas ${esc(x.s.kelas)}</div></td><td class="r"><b>${rp(x.k)}</b></td></tr>`).join('')}</tbody></table></div>`:'<p class="mu">Tidak ada tunggakan.</p>'}</div></div>`
 :empty('Belum ada data siswa','Mulai dengan mengimpor data siswa dari Excel, lalu impor tagihan.',`<button class="btn p" onclick="menu('siswa')">${ico('imp')}Impor siswa</button>`));
 if(chart){chart.destroy();chart=null}
 if($('ch'))chart=new Chart($('ch'),{type:'bar',data:{labels:ks.map(x=>'Kelas '+x.k),datasets:[{label:'Terbayar',data:ks.map(x=>x.p),backgroundColor:'#6f9a84',borderRadius:4},{label:'Kekurangan',data:ks.map(x=>x.kk),backgroundColor:'#d9b56f',borderRadius:4}]},options:{plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{callback:v=>rp(v)}}}}});
}
function rekap(){
 const bl=billsOf(kls),ss=D.siswa.filter(s=>s.kelas===kls),hl=ss.some(s=>lamaS(s)>0);
 page('Rekap pembayaran','Klik angka untuk mencatat pembayaran · Lunas = tanpa tunggakan sampai '+BLN_L[nowIdx()-1],`<select class="in" style="width:auto" aria-label="Kelas" onchange="kls=this.value;rekap()">${kelasOpt(kls)}</select><button class="btn" onclick="cetak()">${ico('print')}Cetak</button>`,
 !D.siswa.length?empty('Belum ada siswa','Impor data siswa terlebih dahulu agar rekap pembayaran bisa dibuat.',`<button class="btn p" onclick="menu('siswa')">${ico('imp')}Impor siswa</button>`)
 :!bl.length&&!hl?empty('Belum ada tagihan untuk kelas '+esc(kls),'Buat tagihan baru atau impor dari spreadsheet rekap.',`<button class="btn p" onclick="menu('tagihan')">${ico('receipt')}Kelola tagihan</button> <button class="btn" onclick="menu('impor')">${ico('imp')}Impor tagihan</button>`)
 :`<div class="tw"><table class="rk"><thead><tr><th class="sticky">Nama</th>${bl.map(b=>`<th class="c">${esc(b.nama)}<small>${rp(b.nominal)}</small>${b.jenis==='Bulanan'?`<small>${rp(b.satuan)} × ${b.bulan} bln</small>`:''}</th>`).join('')}<th class="c">Total</th><th class="c">Kekurangan</th>${hl?'<th class="c">Tunggakan TA lalu<small>klik untuk bayar</small></th>':''}<th class="c">Tunggakan</th><th class="c">Ket.</th></tr></thead><tbody>
 ${ss.map(s=>{const k=kur(s),tg=tungS(s),lm=lamaS(s);return `<tr><td class="sticky"><b>${esc(s.nama)}</b></td>${bl.map(b=>{const p=paid(s.nisn,b.id);return `<td class="c"><button class="cb ${p>=b.nominal?'fu':p>0?'pt':'z'}" onclick="bayarUI('${esc(s.nisn)}','${b.id}')">${rp(p)}</button></td>`}).join('')}<td class="c">${rp(bl.reduce((a,b)=>a+paid(s.nisn,b.id),0))}</td><td class="c">${rp(k)}</td>${hl?`<td class="c">${lm?`<button class="cb pt" onclick="bayarLamaUI('${esc(s.nisn)}')">${rp(lm)}</button>`:'-'}</td>`:''}<td class="c">${rp(tg)}</td><td class="c">${pillS(tg,k)}</td></tr>`}).join('')}</tbody></table></div>`);
}
function bayarUI(nisn,tid){
 const s=(D.siswa||[]).find(x=>x.nisn===nisn),b=(D.tagihan||[]).find(x=>x.id===tid);
 if(!s||!b){go(async()=>{await loadData();rekap()});Swal.fire({icon:'info',title:'Data dimuat ulang',text:'Data belum lengkap di layar. Silakan ketuk angkanya sekali lagi.',confirmButtonColor:'#3f5d7d'});return}
 const sisa=b.nominal-paid(nisn,tid),bb=Object.assign({},b,{dibayar:paid(nisn,tid)}),tb=tunggak(bb),def=b.jenis==='Bulanan'?(tb>0?tb:Math.min(b.satuan,sisa)):sisa;
 const riw=D.bayar.filter(x=>x.nisn===nisn&&x.tid===tid).map(x=>`${esc(x.tgl)} · ${rp(x.jumlah)}${x.catatan?' · '+esc(x.catatan):''}`).join('<br>');
 ask('Catat pembayaran',`<div style="text-align:left" class="sm"><b>${esc(s.nama)}</b><br>${esc(b.nama)} · ${esc(b.periode)}<br>Sisa setahun ${rp(sisa)}${b.jenis==='Bulanan'?' · tunggakan '+rp(tb):''}</div>${chips(bb)}<input id="bj" type="number" class="swal2-input" placeholder="Jumlah (minus untuk koreksi)" value="${def>0?def:''}"><input id="bc" class="swal2-input" placeholder="Catatan (opsional)">${riw?`<div class="sm mu" style="text-align:left;margin-top:10px"><b>Riwayat</b><br>${riw}</div>`:''}`,
  ()=>{if(!Number(bj.value))return Swal.showValidationMessage('Isi jumlah pembayaran.');return[bj.value,bc.value]}).then(r=>{
  if(r.isConfirmed)go(async()=>{await srv('catatBayar',tk(),nisn,tid,r.value[0],r.value[1]);await loadData();rekap()},'Pembayaran dicatat')});
}
function bayarLamaUI(nisn){
 const s=D.siswa.find(x=>x.nisn===nisn),L=lamaOf(nisn),back=()=>(cur==='alumni'?alumni:rekap)();
 if(!s||!L.length){go(async()=>{await loadData();back()});return}
 const sisa=x=>x.nominal-paid(nisn,x.tid);
 ask('Bayar tunggakan TA lalu',`<div style="text-align:left" class="sm"><b>${esc(s.nama)}</b> · ${s.kelas==='Alumni'?'Alumni '+esc(s.lulus):'Kelas '+esc(s.kelas)}</div><select id="lt" class="swal2-select" style="display:flex;width:100%;margin:12px 0 0">${L.map(x=>`<option value="${esc(x.tid)}" data-s="${sisa(x)}">${esc(x.nama)} · TA ${esc(x.ta)} · sisa ${rp(sisa(x))}</option>`).join('')}</select><input id="lj" type="number" class="swal2-input" placeholder="Jumlah (minus untuk koreksi)" value="${sisa(L[0])}"><input id="lc" class="swal2-input" placeholder="Catatan (opsional)">`,
  ()=>{if(!Number(lj.value))return Swal.showValidationMessage('Isi jumlah pembayaran.');return[lt.value,lj.value,lc.value]},480,
  ()=>lt.addEventListener('change',()=>{lj.value=lt.selectedOptions[0].dataset.s})).then(r=>{
  if(r.isConfirmed)go(async()=>{await srv('catatBayar',tk(),nisn,r.value[0],r.value[1],r.value[2]);await loadData();back()},'Pembayaran dicatat')});
}
function cetak(){
 const bl=billsOf(kls),ss=D.siswa.filter(s=>s.kelas===kls),hl=ss.some(s=>lamaS(s)>0),tgl=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
 $('printArea').innerHTML=`<div style="display:flex;align-items:center;gap:14px;padding-bottom:10px;border-bottom:3px double #333">${cfg.logoUrl?`<img src="${esc(cfg.logoUrl)}" alt="" style="width:74px;height:74px;object-fit:contain">`:''}<div style="flex:1;text-align:center"><div>${esc(cfg.namaYayasan)}</div><h2 style="margin:2px 0">${esc(cfg.namaSekolah)}</h2><small>${esc(cfg.alamatSekolah)}</small></div>${cfg.logoUrl?'<div style="width:74px"></div>':''}</div>
 <div style="text-align:center;margin:14px 0"><b>Rekap Pembayaran Kelas ${esc(kls)} · TA ${esc(cfg.tahunAjaran)}</b><br><small>Tunggakan dihitung sampai bulan ${BLN_L[nowIdx()-1]}</small></div><br>
 <table style="border-collapse:collapse;width:100%"><thead><tr><th>No</th><th>Nama</th>${bl.map(b=>`<th>${esc(b.nama)}</th>`).join('')}<th>Total</th><th>Kekurangan</th>${hl?'<th>Tunggakan TA lalu</th>':''}<th>Tunggakan</th><th>Ket.</th></tr></thead><tbody>${ss.map((s,i)=>{const k=kur(s),tg=tungS(s);return `<tr><td>${i+1}</td><td>${esc(s.nama)}</td>${bl.map(b=>`<td>${rp(paid(s.nisn,b.id))}</td>`).join('')}<td>${rp(bl.reduce((a,b)=>a+paid(s.nisn,b.id),0))}</td><td>${rp(k)}</td>${hl?`<td>${rp(lamaS(s))}</td>`:''}<td>${rp(tg)}</td><td>${tg>0?'Belum lunas':'Lunas'}</td></tr>`}).join('')}</tbody></table>
 <div style="display:flex;justify-content:space-between;margin-top:30px"><div style="text-align:center">Mengetahui,<br>Kepala Sekolah<br><br><br><br><u>${esc(cfg.namaKepala)}</u></div><div style="text-align:center">${esc(tgl)}<br>Guru TU<br><br><br><br><u>${esc(cfg.namaTU)}</u></div></div>`;
 const im=$('printArea').querySelector('img');let done=false;const go=()=>{if(!done){done=true;window.print()}};
 if(im&&!im.complete){im.onload=go;im.onerror=()=>{im.remove();go()};setTimeout(go,4000)}else go();
}
function tagihan(){
 page('Tagihan','Tagihan baru otomatis tampil di akun semua siswa pada kelas tujuan',`${salinBtn()}<button class="btn p" onclick="tagihanBaru()">${ico('plus')}Tagihan baru</button>`,
 D.tagihan.length?`<div class="tw"><table><thead><tr><th>Kelas</th><th>Tagihan</th><th>Periode</th><th class="r">Nominal</th><th></th></tr></thead><tbody>${D.tagihan.map((t,i)=>({t,i})).sort((a,b)=>a.t.nama.localeCompare(b.t.nama,'id')||a.t.periode.localeCompare(b.t.periode)||a.t.kelas.localeCompare(b.t.kelas,'id',{numeric:true})).map(({t,i})=>`<tr><td><span class="pill nt">${esc(t.kelas)}</span></td><td><b>${esc(t.nama)}</b><div><span class="pill ${t.jenis==='Bulanan'?'wn':'ok'}">${t.jenis}</span></div></td><td>${esc(t.periode)}</td>
 <td class="r">${t.jenis==='Bulanan'?`<b>${rp(t.nominal)}</b><div class="mu sm">${rp(t.satuan)} × ${t.bulan} bulan · ${rentang(t)}</div>`:`<b>${rp(t.nominal)}</b><div class="mu sm">per tahun</div>`}</td>
 <td class="r nw"><button class="btn ib" title="Ubah" aria-label="Ubah" onclick="tagihanForm(${i})">${ico('edit')}</button><button class="btn ib d" title="Hapus" aria-label="Hapus" onclick="delTagihan(${i})">${ico('del')}</button></td></tr>`).join('')}</tbody></table></div>`
 :empty('Belum ada tagihan','Buat tagihan pertama atau impor dari spreadsheet rekap.',`${salinBtn()}<button class="btn p" onclick="tagihanBaru()">${ico('plus')}Tagihan baru</button> <button class="btn" onclick="menu('impor')">${ico('imp')}Impor tagihan</button>`));
}
const salinBtn=()=>D.arsipTA?`<button class="btn" onclick="salinTagihanUI()">${ico('receipt')}Salin tagihan TA ${esc(D.arsipTA)}</button> `:'';
function salinTagihanUI(){
 Swal.fire({title:'Salin tagihan tahun lalu?',width:480,icon:'question',html:`<div class="sm" style="text-align:left">Semua tagihan <b>TA ${esc(D.arsipTA)}</b> disalin ke <b>TA ${esc(cfg.tahunAjaran)}</b> dengan kelas, jenis, dan nominal yang sama. Tagihan yang sudah ada tidak digandakan.<br><br>Setelah itu, nominal yang berubah bisa diperbaiki lewat tombol ubah di tiap tagihan.</div>`,showCancelButton:true,confirmButtonText:'Salin',cancelButtonText:'Batal',buttonsStyling:false,customClass:{confirmButton:'btn p',cancelButton:'btn',actions:'fact'}}).then(r=>{
  if(!r.isConfirmed)return;
  go(async()=>{const x=await srv('salinTagihan',tk());await loadData();tagihan();return x}).then(x=>{if(x)Swal.fire({icon:x.salin?'success':'info',title:x.salin?'Tagihan disalin':'Tidak ada yang disalin',html:x.salin?`${x.salin} tagihan disalin ke TA ${esc(x.ta)}${x.lewat?`, ${x.lewat} dilewati karena sudah ada`:''}.<br>Periksa nominalnya, lalu ubah yang berbeda dari tahun lalu.`:'Semua tagihan sudah ada di tahun ajaran ini.',confirmButtonColor:'#3f5d7d'})})});
}
const MULAI_OPT=BLN_L.map((n,i)=>`<option value="${i+1}">${n}</option>`).join('');
function tagihanBaru(){tagihanDialog()}
function tagihanForm(i){tagihanDialog(i)}
function tagihanDialog(i){
 const edit=i!==undefined,ks=kelasList(),t=edit?D.tagihan[i]:{id:'',kelas:'',nama:'',jenis:'Bulanan',bulan:12,mulai:1,periode:cfg.tahunAjaran||'',satuan:''};
 if(!edit&&!ks.length)return Swal.fire({icon:'info',title:'Belum ada siswa',text:'Impor data siswa dulu supaya daftar kelas tersedia.',confirmButtonColor:'#3f5d7d'});
 let jenis=t.jenis;
 const top=`<div class="fm"><div class="fg"><label for="fn">Nama tagihan</label><input id="fn" class="in" placeholder="Contoh: SPP, Buku, Daftar ulang" value="${esc(t.nama)}"></div>
  <div class="fg"><label>Jenis tagihan</label><div class="seg tight"><button type="button" id="jB">Bulanan</button><button type="button" id="jT">Tahunan</button></div><div class="fnote" id="jHint"></div></div>
  <div class="row2" id="gBulan"><div class="fg"><label for="fs">Mulai bulan</label><select id="fs" class="in">${MULAI_OPT}</select></div><div class="fg"><label for="fb">Jumlah bulan</label><select id="fb" class="in"></select></div></div>
  <div class="fg"><label for="fp">Periode</label><input id="fp" class="in" placeholder="Contoh: 2026/2027" value="${esc(t.periode)}"></div>`;
 const bottom=edit?`<div class="row2"><div class="fg"><label for="fk">Untuk kelas</label><select id="fk" class="in">${kelasOpt(t.kelas,true)}</select></div>
  <div class="fg"><label class="nl" for="fm1">Nominal</label><div class="pre"><span>Rp</span><input id="fm1" type="number" min="0" class="in nk" value="${esc(t.satuan)}"></div><div class="tot" id="tot1"></div></div></div></div>`
  :`<div class="kls"><div class="kh"><b>Nominal per kelas</b><div class="ap"><div class="pre"><span>Rp</span><input id="fsama" type="number" min="0" class="in" placeholder="Sama untuk semua"></div><button type="button" class="btn" id="fapply">Terapkan</button></div></div>
  <div class="kb">${ks.map(k=>`<div class="kr"><span class="kn">Kelas ${esc(k)}</span><div class="pre"><span>Rp</span><input type="number" min="0" class="in nk" data-k="${esc(k)}" placeholder="Kosong = tidak ditagih" aria-label="Nominal kelas ${esc(k)}"></div><span class="tot"></span></div>`).join('')}</div></div></div>`;
 const refresh=()=>{
  const ml=+$('fs').value||1,mx=13-ml,cur=+$('fb').value||0;
  if($('fb').options.length!==mx){$('fb').innerHTML=Array.from({length:mx},(_,i)=>`<option value="${i+1}">${i+1} bulan</option>`).join('');$('fb').value=Math.min(cur||mx,mx)}
  const b=jenis==='Bulanan'?(+$('fb').value||1):1;
  $('jB').className=jenis==='Bulanan'?'on':'';$('jT').className=jenis==='Tahunan'?'on':'';$('gBulan').style.display=jenis==='Bulanan'?'':'none';
  $('jHint').textContent=jenis==='Bulanan'?`Dibayar tiap bulan, mulai ${BLN_L[ml-1]} selama ${b} bulan (sampai ${BLN_L[ml+b-2]}). Total = nominal per bulan × jumlah bulan. Contoh: SPP, Ekstra.`:'Dibayar sekali untuk satu tahun ajaran. Contoh: buku, daftar ulang, kegiatan.';
  document.querySelectorAll('.nl').forEach(x=>x.textContent=jenis==='Bulanan'?'Nominal per bulan':'Nominal per tahun');
  document.querySelectorAll('.nk').forEach(x=>{const o=x.closest('.kr,.fg').querySelector('.tot'),v=+x.value;if(o)o.textContent=v>0&&b>1?'Total '+rp(v*b):''});
 };
 ask(edit?'Ubah tagihan':'Tagihan baru',top+bottom,()=>{
  if(!$('fn').value.trim())return Swal.showValidationMessage('Isi nama tagihan.');
  const b=jenis==='Bulanan'?(+$('fb').value||1):1,base={nama:$('fn').value.trim(),periode:$('fp').value.trim(),jenis,bulan:b,mulai:+$('fs').value||1};
  if(edit){const n=+$('fm1').value;if(!(n>0))return Swal.showValidationMessage('Isi nominal tagihan.');return Object.assign(base,{id:t.id,kelas:$('fk').value,nominal:n})}
  const items=[...document.querySelectorAll('.nk')].filter(x=>+x.value>0).map(x=>({kelas:x.dataset.k,nominal:+x.value}));
  if(!items.length)return Swal.showValidationMessage('Isi nominal untuk minimal satu kelas.');return Object.assign(base,{items})
 },600,()=>{
  $('fs').value=t.mulai||1;refresh();$('fb').value=Math.min(t.bulan||12,13-(+$('fs').value));
  $('jB').onclick=()=>{jenis='Bulanan';refresh()};$('jT').onclick=()=>{jenis='Tahunan';refresh()};$('fb').onchange=refresh;$('fs').onchange=refresh;
  document.querySelectorAll('.nk').forEach(x=>x.addEventListener('input',refresh));
  if($('fapply'))$('fapply').onclick=()=>{const v=$('fsama').value;document.querySelectorAll('.kb .nk').forEach(x=>x.value=v);refresh()};
  refresh();$('fn').focus();
 }).then(r=>{
  if(!r.isConfirmed)return;
  go(async()=>{await srv(edit?'saveTagihan':'saveTagihanBanyak',tk(),r.value);await loadData();tagihan()},edit?'Tagihan diperbarui':'Tagihan terkirim ke '+r.value.items.length+' kelas')});
}
const delTagihan=i=>{const t=D.tagihan[i];confirmX('Hapus tagihan?',t.nama+' ('+t.kelas+') beserta catatan pembayarannya.').then(y=>y&&go(async()=>{await srv('deleteTagihan',tk(),t.id);await loadData();tagihan()},'Tagihan dihapus'))};

function siswa(){
 const sw=users.filter(u=>u.role==='siswa'&&u.kelas!=='Alumni'),ks=[...new Set(sw.map(u=>u.kelas))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true}));
 page('Data siswa',sw.length+' siswa terdaftar · username wali murid = NISN',`<button class="btn" onclick="importUsersUI()">${ico('imp')}Impor dari Excel</button><button class="btn p" onclick="userForm()">${ico('plus')}Tambah siswa</button>`,
 sw.length?`<div class="tools"><input id="su" class="in" placeholder="Cari nama atau NISN" aria-label="Cari" oninput="renderUsers()"><select id="fu" class="in" aria-label="Kelas" onchange="renderUsers()"><option value="">Semua kelas</option>${ks.map(k=>`<option>${esc(k)}</option>`).join('')}</select></div><div class="tw"><table><thead><tr><th>NISN</th><th>Nama</th><th class="hm">Kelas</th><th></th></tr></thead><tbody id="ub"></tbody></table></div>`
 :empty('Belum ada data siswa','Salin kolom NISN, Nama, dan Kelas dari Excel lalu tempel. Password awal semua siswa otomatis 123456.',`<button class="btn p" onclick="importUsersUI()">${ico('imp')}Impor dari Excel</button> <button class="btn" onclick="userForm()">${ico('plus')}Tambah manual</button>`));
 if(sw.length)renderUsers();
}
function renderUsers(){
 const q=$('su').value.toLowerCase(),k=$('fu').value;
 $('ub').innerHTML=users.map((u,i)=>({u,i})).filter(({u})=>u.role==='siswa'&&u.kelas!=='Alumni'&&(!k||u.kelas===k)&&(u.nama+u.username).toLowerCase().includes(q)).map(({u,i})=>`<tr><td>${esc(u.username)}</td><td style="white-space:normal;min-width:120px"><b>${esc(u.nama)}</b></td><td class="hm"><span class="pill nt">${esc(u.kelas)}</span></td>
 <td class="r nw"><button class="btn ib" title="Edit" aria-label="Edit" onclick="userForm(${i})">${ico('edit')}</button><button class="btn ib" title="Reset password" aria-label="Reset password" onclick="resetPw(${i})">${ico('rst')}</button><button class="btn ib d" title="Hapus" aria-label="Hapus" onclick="delUser(${i})">${ico('del')}</button></td></tr>`).join('')||'<tr><td class="mu">Tidak ada yang cocok.</td></tr>';
}
function userForm(i){
 const e=i!==undefined,u=e?users[i]:{username:'',nama:'',kelas:kls,role:'siswa'};
 ask(e?'Edit siswa':'Tambah siswa',`<input id="uu" class="swal2-input" placeholder="NISN" value="${esc(u.username)}" ${e?'readonly':''}><input id="un" class="swal2-input" placeholder="Nama lengkap" value="${esc(u.nama)}"><input id="uk" class="swal2-input" placeholder="Kelas" value="${esc(u.kelas)}"><div class="sm mu" style="margin-top:8px">Siswa baru otomatis memakai password 123456.</div>`,
  ()=>{if(!uu.value.trim()||!un.value.trim())return Swal.showValidationMessage('NISN dan nama wajib diisi.');return{username:uu.value.trim(),nama:un.value.trim(),kelas:uk.value.trim(),role:u.role}}).then(r=>{
  if(r.isConfirmed)go(async()=>{await srv('saveUser',tk(),r.value);users=await srv('listUsers',tk());siswa()},'Tersimpan')});
}
const resetPw=i=>{const u=users[i];confirmX('Reset password?',u.nama+' akan kembali memakai 123456.').then(y=>y&&go(()=>srv('resetPassword',tk(),u.username),'Password direset ke 123456'))};
const delUser=i=>{const u=users[i];confirmX('Hapus siswa?',u.nama+' ('+u.username+') beserta catatan pembayaran dan tabungannya. Tidak bisa dibatalkan.').then(y=>y&&go(async()=>{await srv('deleteUser',tk(),u.username);users=await srv('listUsers',tk());siswa()},'Siswa dihapus'))};
const parseRow=l=>{l=l.trim();if(!l)return null;let c=l.split(/\t|;|\|/).map(x=>x.trim());
 if(c.length<2)c=l.split(',').map(x=>x.trim());
 if(c.length<2){const m=l.match(/^(\S+)\s+(.+?)\s+(\S+)$/);if(m)c=[m[1],m[2],m[3]]}
 return c.length>=3&&c[0]&&c[1]&&c[2]?{username:c[0],nama:c[1],kelas:c[2]}:{bad:l}};
const parseUsers=t=>{const r=t.split('\n').map(parseRow).filter(Boolean);return{ok:r.filter(x=>!x.bad),bad:r.filter(x=>x.bad).map(x=>x.bad)}};
function importUsersUI(){
 ask('Impor siswa','<p class="sm mu" style="text-align:left;margin:0 0 8px">Satu siswa per baris: <b>NISN, Nama, Kelas</b> (tanpa judul). Bisa tempel dari Excel, atau ketik dipisah koma, contoh:<br><code>3170010001, Abid Aqila Pranaja, 6</code><br>Password awal siswa: <b>123456</b>.</p><textarea id="imp" class="swal2-textarea" style="height:190px;margin:0!important;width:100%" placeholder="3170010001, Abid Aqila Pranaja, 6"></textarea><div id="cnt" class="sm mu" style="text-align:left;margin-top:6px">0 baris terdeteksi</div>',
  ()=>{const p=parseUsers(imp.value);if(!p.ok.length&&!p.bad.length)return Swal.showValidationMessage('Belum ada data yang ditempel.');
   if(p.bad.length)return Swal.showValidationMessage('Baris tidak terbaca: "'+p.bad[0].slice(0,50)+'". Pastikan ada NISN, nama, dan kelas.');return p.ok},620,
  ()=>imp.addEventListener('input',()=>{const p=parseUsers(imp.value);cnt.textContent=p.ok.length+' baris siap diimpor'+(p.bad.length?', '+p.bad.length+' baris tidak terbaca':'')})).then(r=>{
  if(r.isConfirmed)go(async()=>{const x=await srv('importUsers',tk(),r.value);users=await srv('listUsers',tk());siswa();Swal.fire({icon:'success',title:'Impor selesai',text:`${x.baru} siswa baru, ${x.ubah} diperbarui, ${x.lewat} baris dilewati. Password awal: 123456.`,confirmButtonColor:'#3f5d7d'})})});
}

function impor(){
 page('Impor tagihan','Ambil tagihan dari spreadsheet rekap yang sudah ada','',`<div class="card"><div class="steps"><div><b>1. Siapkan siswa</b>Impor data siswa kelas tersebut lebih dulu.</div><div><b>2. Salin tabel rekap</b>Blok dari judul NO/NAMA sampai daftar nominal di bawah, lalu salin.</div><div><b>3. Tempel dan impor</b>Tagihan dan pembayaran terbaca otomatis. Impor ulang aman.</div></div>
 <div class="row3"><div><label for="ik">Untuk kelas</label><input id="ik" class="in" value="${esc(kls)}"></div><div><label for="ip">Periode</label><input id="ip" class="in" value="${esc(cfg.tahunAjaran||'')}"></div></div>
 <label for="idt">Tabel rekap</label><textarea id="idt" class="in" rows="9" placeholder="Tempel tabel rekap di sini"></textarea><div style="margin-top:14px"><button class="btn p" onclick="doImpor()">${ico('imp')}Impor tagihan</button></div></div>`);
}
function doImpor(){
 const data=$('idt').value.split('\n').map(l=>l.split('\t'));
 if(!$('ik').value.trim()||data.length<3)return Swal.fire({icon:'warning',title:'Lengkapi dulu',text:'Isi kelas dan tempel tabel rekap.',confirmButtonColor:'#3f5d7d'});
 go(async()=>{const x=await srv('importRekap',tk(),{kelas:$('ik').value,periode:$('ip').value,data});
  Swal.fire({icon:x.tidakCocok.length?'warning':'success',title:'Impor selesai',html:`${x.tagihan.length} tagihan (${esc(x.tagihan.join(', '))}), ${x.cocok} siswa cocok.${x.tidakCocok.length?'<br><br>Nama tidak ditemukan di data siswa:<br>'+esc(x.tidakCocok.join(', ')):''}`,confirmButtonColor:'#3f5d7d'});$('idt').value=''});
}
function settingsUI(){
 const f=[['namaYayasan','Nama yayasan'],['namaSekolah','Nama sekolah'],['alamatSekolah','Alamat sekolah'],['namaKepala','Nama kepala sekolah'],['namaTU','Nama guru TU'],['tahunAjaran','Tahun ajaran'],['logoUrl','URL logo (opsional)']];
 ask('Pengaturan sekolah',f.map(x=>`<input id="c_${x[0]}" class="swal2-input" placeholder="${x[1]}" aria-label="${x[1]}" value="${esc(cfg[x[0]])}">`).join(''),()=>Object.fromEntries(f.map(x=>[x[0],$('c_'+x[0]).value]))).then(r=>{
  if(r.isConfirmed)go(async()=>{await srv('updateConfig',tk(),r.value);cfg=r.value;applyCfg()},'Pengaturan disimpan')});
}
/* ===== tabungan siswa: dicatat guru TU ===== */
let TB={saldo:{},ta:'',tanggal:''};
const tabS=n=>TB.saldo[n]||{saldo:0,setorTA:0,tarikTA:0,setorAll:0,hariIni:0},qa=s=>[...document.querySelectorAll(s)];
function tabungan(){
 const ss=D.siswa.filter(s=>s.kelas===kls),sum=f=>ss.reduce((x,s)=>x+tabS(s.nisn)[f],0);
 page('Tabungan siswa','Catat setoran harian · TA '+TB.ta,`<select class="in" style="width:auto" aria-label="Kelas" onchange="kls=this.value;tabungan()">${kelasOpt(kls)}</select><button class="btn" onclick="cetakTabungan()">${ico('print')}Cetak</button>`,
 !aktif().length?empty('Belum ada siswa','Impor data siswa terlebih dahulu agar tabungan bisa dicatat.',`<button class="btn p" onclick="menu('siswa')">${ico('imp')}Impor siswa</button>`):
 `<div class="grid4">${[['Jumlah siswa',ss.length,'users'],['Saldo kelas',rp(sum('saldo')),'coin'],['Setoran TA ini',rp(sum('setorTA')),'table'],['Pencairan TA ini',rp(sum('tarikTA')),'receipt']].map(x=>`<div class="card"><div class="sl"><span>${ico(x[2])}</span>${x[0]}</div><div class="stat">${x[1]}</div></div>`).join('')}</div>
 <div class="card"><div class="tools"><div style="min-width:170px"><label for="tt">Tanggal transaksi</label><input id="tt" type="date" class="in" value="${esc(TB.tanggal)}" max="${esc(TB.tanggal)}"></div><div class="mu sm" style="flex:1;min-width:200px">Kolom setoran kosong tidak dicatat. Tombol <b>Cairkan</b> mencairkan seluruh saldo satu siswa. Klik nama siswa untuk riwayat dan koreksi.</div><div class="sp"><button class="btn p" onclick="simpanTab()">${ico('plus')}Simpan semua</button></div></div>
 <div class="tw"><table><thead><tr><th class="sticky">Nama</th><th>Setor (Rp)</th><th class="c">Hari ini</th><th class="r"><div class="sc"><span class="sn">Total Saldo</span><span class="btn bc bsp" aria-hidden="true">Cairkan</span></div></th></tr></thead><tbody>
 ${ss.map(s=>{const t=tabS(s.nisn);return `<tr><td class="sticky" style="white-space:normal;min-width:104px;max-width:124px"><button class="cb" title="Lihat riwayat" onclick="riwayatTab('${esc(s.nisn)}')"><b>${esc(s.nama)}</b></button></td><td><input type="number" min="0" inputmode="numeric" class="in tin tin-s" data-n="${esc(s.nisn)}" aria-label="Setor ${esc(s.nama)}"></td><td class="c">${rp(t.hariIni||0)}</td><td class="r"><div class="sc"><b class="sn">${rp(t.saldo)}</b><button class="btn bc" ${t.saldo>0?'':'disabled'} title="${t.saldo>0?'Cairkan seluruh saldo':'Saldo Rp0'}" onclick="cairkanUI('${esc(s.nisn)}')">Cairkan</button></div></td></tr>`}).join('')||'<tr><td>Belum ada siswa di kelas ini.</td></tr>'}</tbody></table></div></div>`);
}
function simpanTab(){
 const tgl=$('tt').value,items=qa('.tin-s').map(e=>({nisn:e.dataset.n,setor:+e.value||0})).filter(x=>x.setor);
 if(!tgl)return Swal.fire({icon:'warning',title:'Pilih tanggal dulu',confirmButtonColor:'#3f5d7d'});
 if(!items.length)return Swal.fire({icon:'info',title:'Belum ada jumlah yang diisi',text:'Isi setoran pada siswa yang menabung.',confirmButtonColor:'#3f5d7d'});
 if(items.some(x=>x.setor<0))return Swal.fire({icon:'warning',title:'Jumlah tidak boleh minus',text:'Untuk perbaikan salah catat, klik nama siswa lalu pilih Koreksi saldo.',confirmButtonColor:'#3f5d7d'});
 const s=items.reduce((x,i)=>x+i.setor,0);
 Swal.fire({title:'Simpan tabungan?',icon:'question',html:`Tanggal <b>${esc(tgl)}</b> · Kelas ${esc(kls)}<br>${items.length} setoran: <b>${rp(s)}</b>`,showCancelButton:true,confirmButtonText:'Simpan',cancelButtonText:'Batal',buttonsStyling:false,customClass:{confirmButton:'btn p',cancelButton:'btn',actions:'fact'}}).then(r=>{
  if(r.isConfirmed)go(async()=>{await srv('simpanTabungan',tk(),{tanggal:tgl,items});TB=await srv('getTabunganData',tk());tabungan()},'Tabungan tersimpan')});
}
function cairkanUI(nisn){
 const s=D.siswa.find(x=>x.nisn===nisn),saldo=tabS(nisn).saldo;if(!(saldo>0))return;
 Swal.fire({title:'Cairkan tabungan',width:480,html:`<div class="fm"><div class="msum wn" style="margin:0 0 12px"><b>${esc(s.nama)}</b> · ${s.kelas==='Alumni'?'Alumni '+esc(s.lulus):'Kelas '+esc(s.kelas)}<br>Saldo yang akan dicairkan: <b>${rp(saldo)}</b><br>Setelah ini saldo menjadi Rp0.</div>
  <div class="fg"><label for="tdt">Tanggal pencairan</label><input id="tdt" type="date" class="in" value="${esc(TB.tanggal)}" max="${esc(TB.tanggal)}"></div>
  <div class="fg"><label for="tkf">Ketik <b>CAIRKAN TABUNGAN</b> untuk melanjutkan</label><input id="tkf" class="in" autocomplete="off" autocapitalize="characters" placeholder="CAIRKAN TABUNGAN"></div>
  <div class="fnote">Pencairan tidak bisa dihapus. Jika terlanjur salah, perbaiki lewat Koreksi saldo dengan alasan.</div></div>`,
  showCancelButton:true,confirmButtonText:'Cairkan',cancelButtonText:'Batal',buttonsStyling:false,customClass:{popup:'fpop',confirmButton:'btn dg',cancelButton:'btn',actions:'fact'},
  preConfirm:()=>{if($('tkf').value.trim().toUpperCase().replace(/\s+/g,' ')!=='CAIRKAN TABUNGAN')return Swal.showValidationMessage('Ketik CAIRKAN TABUNGAN persis untuk melanjutkan.');if(!$('tdt').value)return Swal.showValidationMessage('Pilih tanggal pencairan.');return{nisn,tanggal:$('tdt').value,saldoDiharapkan:saldo,konfirmasi:$('tkf').value}}
 }).then(r=>{if(r.isConfirmed)go(async()=>{await srv('cairkanTabungan',tk(),r.value);TB=await srv('getTabunganData',tk());(cur==='alumni'?alumni:tabungan)()},rp(saldo)+' dicairkan')});
}
async function riwayatTab(nisn){
 const s=D.siswa.find(x=>x.nisn===nisn),r=await go(()=>srv('getRiwayatTabungan',tk(),nisn));if(!r)return;
 const h=`<div class="mu sm">Kelas ${esc(s.kelas)} · NISN ${esc(s.nisn)}</div><div class="stat" style="color:var(--ok)">${rp(r.saldo)}</div><div class="sm mu">Saldo tabungan</div>
 <div class="tw" style="margin:12px 0"><table><thead><tr><th>Tahun ajaran</th><th class="r">Setor</th><th class="r">Cair</th><th class="r">Koreksi</th></tr></thead><tbody>${r.perTA.map(t=>`<tr><td>${esc(t.ta)}</td><td class="r">${rp(t.setor)}</td><td class="r">${rp(t.tarik)}</td><td class="r">${rp(t.koreksi)}</td></tr>`).join('')||'<tr><td colspan="4" class="mu">Belum ada transaksi.</td></tr>'}</tbody></table></div>
 <div class="sm"><b>Transaksi terakhir</b></div><div class="tw" style="max-height:220px;overflow:auto;margin-top:6px"><table><tbody>${r.riwayat.map(x=>{const neg=x.jenis==='Tarik'||x.jumlah<0;return `<tr><td>${esc(x.tgl)}</td><td>${esc(x.jenis==='Tarik'?'Pencairan':x.jenis)}</td><td class="r ${neg?'':'fu'}"><b>${neg?'−':'+'}${rp(Math.abs(x.jumlah))}</b></td><td class="mu sm" style="white-space:normal">${esc(x.catatan||x.petugas)}</td></tr>`}).join('')||'<tr><td class="mu">Belum ada transaksi.</td></tr>'}</tbody></table></div>`;
 const x=await Swal.fire({title:s.nama,html:h,width:560,showCancelButton:true,confirmButtonText:'Koreksi saldo',cancelButtonText:'Tutup',buttonsStyling:false,customClass:{popup:'fpop',confirmButton:'btn',cancelButton:'btn p',actions:'fact'}});
 if(x.isConfirmed)koreksiTab(nisn);
}
function koreksiTab(nisn){
 const s=D.siswa.find(x=>x.nisn===nisn);
 ask('Koreksi saldo',`<div class="sm mu" style="margin-bottom:8px">${esc(s.nama)}. Koreksi tidak menghapus catatan lama; tercatat sebagai baris baru lengkap dengan alasannya.</div><div class="fm"><div class="fg"><label for="kj">Jumlah koreksi (boleh minus)</label><div class="pre"><span>Rp</span><input id="kj" type="number" class="in" placeholder="Contoh: -1000 atau 2000"></div></div><div class="fg"><label for="ka">Alasan (wajib)</label><input id="ka" class="in" placeholder="Contoh: salah ketik tanggal 24 Okt"></div></div>`,
  ()=>{if(!+$('kj').value)return Swal.showValidationMessage('Isi jumlah koreksi.');if($('ka').value.trim().length<3)return Swal.showValidationMessage('Alasan koreksi wajib diisi.');return{nisn,jumlah:+$('kj').value,catatan:$('ka').value.trim()}}).then(r=>{
  if(r.isConfirmed)go(async()=>{await srv('koreksiTabungan',tk(),r.value);TB=await srv('getTabunganData',tk());tabungan()},'Koreksi dicatat')});
}
const kopHtml=()=>`<div style="display:flex;align-items:center;gap:14px;padding-bottom:10px;border-bottom:3px double #333">${cfg.logoUrl?`<img src="${esc(cfg.logoUrl)}" alt="" style="width:74px;height:74px;object-fit:contain">`:''}<div style="flex:1;text-align:center"><div>${esc(cfg.namaYayasan)}</div><h2 style="margin:2px 0">${esc(cfg.namaSekolah)}</h2><small>${esc(cfg.alamatSekolah)}</small></div>${cfg.logoUrl?'<div style="width:74px"></div>':''}</div>`;
function cetakDok(html){$('printArea').innerHTML=html;const im=$('printArea').querySelector('img');let done=false;const go2=()=>{if(!done){done=true;window.print()}};if(im&&!im.complete){im.onload=go2;im.onerror=()=>{im.remove();go2()};setTimeout(go2,4000)}else go2()}
function cetakTabungan(){
 const ss=D.siswa.filter(s=>s.kelas===kls),tgl=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),S=f=>ss.reduce((x,s)=>x+tabS(s.nisn)[f],0);
 cetakDok(`${kopHtml()}<div style="text-align:center;margin:14px 0"><b>Rekap Tabungan Siswa Kelas ${esc(kls)} · TA ${esc(TB.ta)}</b><br><small>Posisi per ${esc(tgl)}</small></div>
 <table style="border-collapse:collapse;width:100%"><thead><tr><th>No</th><th>Nama</th><th>Saldo</th><th>Setoran TA ini</th><th>Penarikan TA ini</th></tr></thead><tbody>${ss.map((s,i)=>{const t=tabS(s.nisn);return `<tr><td>${i+1}</td><td>${esc(s.nama)}</td><td>${rp(t.saldo)}</td><td>${rp(t.setorTA)}</td><td>${rp(t.tarikTA)}</td></tr>`}).join('')}<tr><td></td><td><b>Total</b></td><td><b>${rp(S('saldo'))}</b></td><td><b>${rp(S('setorTA'))}</b></td><td><b>${rp(S('tarikTA'))}</b></td></tr></tbody></table>
 <div style="display:flex;justify-content:space-between;margin-top:30px"><div style="text-align:center">Mengetahui,<br>Kepala Sekolah<br><br><br><br><u>${esc(cfg.namaKepala)}</u></div><div style="text-align:center">${esc(tgl)}<br>Guru TU<br><br><br><br><u>${esc(cfg.namaTU)}</u></div></div>`);
}
window.__app2=1;
