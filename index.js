
const firebaseConfig = {
  apiKey: "AIzaSyA_L6U3HKM1DnKuq_Q1zKFH4bk8GMAz210",
  authDomain: "asdarstoredigitalll-d89c4.firebaseapp.com",
  databaseURL: "https://asdarstoredigitalll-default-rtdb.firebaseio.com",
  projectId: "asdarstoredigitalll-d89c4",
  storageBucket: "asdarstoredigitalll.appspot.com",
  messagingSenderId: "220670500351",
  appId: "1:220670500351:web:5737ae5958a6f5a67d5bca"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Load kategori & produk
const kategoriEl = document.getElementById("kategori");
const produkEl = document.getElementById("produk");
const infoProduk = document.getElementById("infoProduk");
const tambahanInput = document.getElementById("tambahanInput");

const kategoriRef = db.ref("produk");
kategoriRef.once("value").then((snap) => {
  const data = snap.val() || {};
  Object.keys(data).forEach((kategori) => {
    const option = document.createElement("option");
    option.value = kategori;
    option.textContent = kategori;
    kategoriEl.appendChild(option);
  });
});

kategoriEl.addEventListener("change", () => {
  produkEl.innerHTML = "<option value=''>Pilih Produk</option>";
  infoProduk.innerText = "Loading...";
  const selected = kategoriEl.value;
  if (!selected) return;

  db.ref("produk/" + selected).once("value").then((snap) => {
    const data = snap.val() || {};
    Object.entries(data).forEach(([id, val]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = val.nama;
      option.dataset.deskripsi = val.deskripsi || "";
      option.dataset.harga = val.harga || "";
      produkEl.appendChild(option);
    });
  });
});

produkEl.addEventListener("change", () => {
  const selected = produkEl.selectedOptions[0];
  const namaProduk = selected.textContent;
  const deskripsi = selected.dataset.deskripsi;
  const harga = selected.dataset.harga;
  infoProduk.innerText = `Harga: ${harga}\n${deskripsi}`;

  db.ref("formLogic/" + namaProduk).once("value").then((snap) => {
    const logic = snap.val();
    renderTambahan(logic);
  });
});

function renderTambahan(logic = {}) {
  db.ref("kontenDinamis/inputTambahan").once("value").then((snap) => {
    const fields = snap.val() || {};
    tambahanInput.innerHTML = "";
    Object.values(fields).forEach((f) => {
      if (logic.tampilkan && !logic.tampilkan.includes(f.id)) return;
      if (logic.sembunyikan && logic.sembunyikan.includes(f.id)) return;

      const label = document.createElement("label");
      label.textContent = f.label;
      const input = f.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
      input.id = "custom_" + f.id;
      input.required = f.required;
      tambahanInput.appendChild(label);
      tambahanInput.appendChild(input);
    });
  });
}

document.getElementById("formPesanan").addEventListener("submit", (e) => {
  e.preventDefault();
  const nama = document.getElementById("nama").value;
  const nomor = document.getElementById("nomor").value;
  const kategori = kategoriEl.value;
  const produk = produkEl.value;
  const produkText = produkEl.selectedOptions[0]?.textContent || "";
  const data = {
    nama,
    nomor,
    kategori,
    produk: produkText,
    waktu: new Date().toISOString(),
    status: "Menunggu Verifikasi"
  };

  const inputTambahan = document.querySelectorAll("#tambahanInput input, #tambahanInput textarea");
  inputTambahan.forEach((input) => {
    const id = input.id.replace("custom_", "");
    data[id] = input.value;
  });

  const idPesanan = "TRX" + Date.now();
  db.ref("pesanan/" + idPesanan).set(data);
  alert("âœ… Pesanan berhasil dikirim!\nID Pesanan: " + idPesanan);
});

const box = document.getElementById("animTestimoni");
db.ref("testimoni").on("value", (snap) => {
  const data = snap.val() || {};
  const list = Object.values(data).map(d => d.nama + ": " + d.komentar);
  let i = 0;
  const putar = () => {
    box.innerText = list[i] || "Belum ada testimoni...";
    i = (i + 1) % list.length;
    setTimeout(putar, 3000);
  };
  putar();
});

window.cekStatus = () => {
  const id = document.getElementById("idCek").value;
  db.ref("pesanan/" + id).once("value").then(snap => {
    const data = snap.val();
    if (data) {
      alert(`Status: ${data.status || '-'}\nProduk: ${data.produk}\nAtas Nama: ${data.nama}`);
    } else {
      alert("âŒ Data tidak ditemukan");
    }
  });
};

function toggleTheme() {
  const body = document.body;
  const current = body.getAttribute("data-theme");
  body.setAttribute("data-theme", current === "light" ? "dark" : "light");
  document.getElementById("themeToggle").textContent = current === "light" ? "â˜€ï¸" : "ðŸŒ™";
}
