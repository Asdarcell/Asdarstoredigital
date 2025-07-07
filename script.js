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

document.getElementById('formPesanan')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const nama = document.getElementById('nama').value;
  const nomor = document.getElementById('nomor').value;
  const produk = document.getElementById('produk').value;
  const waktu = new Date().toISOString();
  const id = Date.now();

  db.ref('pesanan/' + id).set({
    id, nama, nomor, produk, status: "Menunggu Pembayaran", waktu
  }).then(() => {
    alert(
      '🟣 PESANAN DITERIMA 🟣\n' +
      'Silakan transfer pembayaran ke:\n\n' +
      'ShopeePay: 081803004607\n' +
      'DANA: 087755432880\n\n' +
      'Setelah transfer, upload bukti pembayaran di halaman selanjutnya.\n\n' +
      'ID Pesanan: ' + id
    );
    location.href = "upload.html?id=" + id;
  }).catch(err => {
    alert('Gagal menyimpan pesanan. Coba lagi.');
    console.error(err);
  });
});
