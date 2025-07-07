// adminFinal.js

// Konfigurasi Firebase const firebaseConfig = { apiKey: "AIzaSyA_L6U3HKM1DnKuq_Q1zKFH4bk8GMAz210", authDomain: "asdarstoredigitalll-d89c4.firebaseapp.com", databaseURL: "https://asdarstoredigitalll-d89c4-default-rtdb.firebaseio.com", projectId: "asdarstoredigitalll-d89c4", storageBucket: "asdarstoredigitalll.appspot.com", messagingSenderId: "220670500351", appId: "1:220670500351:web:5737ae5958a6f5a67d5bca" }; firebase.initializeApp(firebaseConfig); const db = firebase.database(); const imgbbApiKey = "f71ccc1a662c9f8656766990018d3a33"; const adminPassword = "asdar123";

// Login Admin function loginAdmin() { const pass = document.getElementById('adminPass').value; if (pass === adminPassword) { document.getElementById('loginSection').style.display = 'none'; document.getElementById('mainSection').style.display = 'block'; tampilkanPesanan(); tampilkanProduk(); tampilkanGaleri(); } else { alert('Password salah'); } }

// Tampilkan Daftar Pesanan function tampilkanPesanan() { db.ref('pesanan').on('value', snapshot => { const data = snapshot.val(); const filter = document.getElementById('filterStatus').value; const search = document.getElementById('searchId').value.toLowerCase(); let html = ''; for (let id in data) { const p = data[id]; if (filter && p.status !== filter) continue; if (search && !id.includes(search)) continue; html += <div class="card"> <div class="card-body"> <b>ID:</b> ${id}<br> <b>Nama:</b> ${p.nama}<br> <b>Produk:</b> ${p.produk}<br> <b>Status:</b> ${p.status}<br> <b>Waktu:</b> ${p.waktu || '-'}<br> ${p.buktiBayar ?<b>Bukti Pembeli:</b><br><img src="${p.buktiBayar}" />: ''} ${p.buktiAdmin ?<br><b>Bukti Admin:</b><br><img src="${p.buktiAdmin}" />: ''} <br> <button onclick="setSelected('${id}')" class="btn btn-warning btn-sm">Pilih Kirim Bukti</button> <button onclick="verifikasi('${id}')" class="btn btn-info btn-sm">Proses</button> <button onclick="hapusPesanan('${id}')" class="btn btn-danger btn-sm">Hapus</button> </div> </div>; } document.getElementById('pesananList').innerHTML = html; }); }

let selectedId = null; function setSelected(id) { selectedId = id; alert('Dipilih: ' + id); }

function verifikasi(id) { const waktu = new Date().toISOString(); db.ref('pesanan/' + id).update({ status: 'Diproses' }); db.ref('riwayat/' + id).push({ status: 'Diproses', waktu }); kirimNotifWA(Pesanan ID: ${id} sedang diproses.); }

async function uploadBukti() { const file = document.getElementById('buktiAdmin').files[0]; if (!file || !selectedId) return alert('Pilih pesanan dan gambar!'); const formData = new FormData(); formData.append('image', file);

const response = await fetch(https://api.imgbb.com/1/upload?key=${imgbbApiKey}, { method: 'POST', body: formData }); const result = await response.json(); const imageUrl = result.data.url; const waktu = new Date().toISOString();

await db.ref('pesanan/' + selectedId).update({ buktiAdmin: imageUrl, status: 'Selesai' }); db.ref('riwayat/' + selectedId).push({ status: 'Selesai', waktu }); kirimNotifWA(✅ Pesanan ${selectedId} selesai. Terima kasih!); selectedId = null; }

function hapusPesanan(id) { if (confirm('Hapus pesanan ini?')) { db.ref('pesanan/' + id).remove(); } }

function exportCSV() { db.ref('pesanan').once('value', snapshot => { const data = snapshot.val(); let csv = 'ID,Nama,Produk,Status,Waktu\n'; for (let id in data) { const p = data[id]; csv += ${id},${p.nama},${p.produk},${p.status},${p.waktu || ''}\n; } const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'pesanan.csv'; a.click(); }); }

function tampilkanGaleri() { db.ref('pesanan').once('value', snapshot => { const data = snapshot.val(); let html = ''; for (let id in data) { const p = data[id]; if (p.buktiBayar) { html += <div class="col-md-3"><img src="${p.buktiBayar}" class="img-thumbnail" /></div>; } } document.getElementById('galeri').innerHTML = html; }); }

function tampilkanProduk() { db.ref('produk').once('value', snapshot => { const data = snapshot.val(); let html = ''; for (let key in data) { const p = data[key]; html += <li class="list-group-item d-flex justify-content-between align-items-center"> ${p.kategori} - ${p.varian} (Rp${p.harga}) <div> <button class="btn btn-sm btn-warning" onclick="editProduk('${key}', '${p.kategori}', '${p.varian}', '${p.harga}', '${p.cara}')">Edit</button> <button class="btn btn-sm btn-danger" onclick="hapusProduk('${key}')">Hapus</button> </div> </li>; } document.getElementById('daftarProduk').innerHTML = html; }); }

function editProduk(key, kategori, varian, harga, cara) { document.getElementById('kategori').value = kategori; document.getElementById('varian').value = varian; document.getElementById('harga').value = harga; document.getElementById('cara').value = cara; db.ref('produk/' + key).remove(); }

function hapusProduk(key) { if (confirm('Hapus produk ini?')) { db.ref('produk/' + key).remove(); } }

document.getElementById('formProduk').addEventListener('submit', function (e) { e.preventDefault(); const kategori = document.getElementById('kategori').value; const varian = document.getElementById('varian').value; const harga = document.getElementById('harga').value; const cara = document.getElementById('cara').value; db.ref('produk').push({ kategori, varian, harga, cara }); alert('✅ Produk disimpan.'); this.reset(); tampilkanProduk(); });

function kirimNotifWA(pesan) { fetch("https://starsender.online/api/sendText", { method: "POST", body: new URLSearchParams({ appkey: "ab3727c5-e0be-40f9-bb3f-25d93b029f7a", authkey: "tbAWbiCwmK1H0IgWpkJFzwiv8yXMuenAyenek6rJBG8QEqyiqq", to: "6281803004607", message: pesan }) }); }

document.getElementById('filterStatus').addEventListener('change', tampilkanPesanan); document.getElementById('searchId').addEventListener('input', tampilkanPesanan);

