// Konfigurasi Firebase (ganti sesuai milikmu)
const firebaseConfig = {
  apiKey: "f71ccc1a662c9f8656766990018d3a33",
  authDomain: "asdarstoredigitalll-d89c4.firebaseapp.com",
  databaseURL: "https://asdarstoredigitalll-d89c4-default-rtdb.firebaseio.com",
  projectId: "asdarstoredigitalll-d89c4",
  storageBucket: "asdarstoredigitalll.appspot.com",
  messagingSenderId: "220670500351",
  appId: "1:220670500351:web:5737ae5958a6f5a67d5bca"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

document.getElementById('formPesanan').addEventListener('submit', function(e) {
  e.preventDefault();

  const nama = document.getElementById('nama').value.trim();
  const nomor = document.getElementById('nomor').value.trim();
  const produk = document.getElementById('produk').value;
  const waktu = new Date().toISOString();
  const id = Date.now().toString();

  if (!nama || !nomor || !produk) {
    alert('Mohon lengkapi semua data!');
    return;
  }

  db.ref('pesanan/' + id).set({
    id, nama, nomor, produk, status: "Menunggu Pembayaran", waktu
  }).then(() => {
    const infoEl = document.getElementById("idPesananInfo");
    infoEl.innerHTML =
      `🟣 PESANAN DITERIMA 🟣<br>` +
      `ID Pesanan Anda: <strong>${id}</strong><br><br>` +
      `Silakan transfer pembayaran ke salah satu metode berikut:<br>` +
      `<strong>ShopeePay:</strong> 081803004607<br>` +
      `<strong>DANA:</strong> 087755432880<br><br>` +
      `<a href="upload.html?id=${id}">Klik di sini untuk upload bukti pembayaran</a>`;

    this.reset();
  }).catch(err => {
    alert('Gagal mengirim pesanan. Coba lagi.');
    console.error(err);
  });
});
