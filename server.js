// server.js const express = require("express"); const bodyParser = require("body-parser"); const axios = require("axios"); const cors = require("cors");

const app = express(); app.use(cors()); app.use(bodyParser.json());

// Ganti dengan API key StarSender kamu const API_KEY = "APIKEY_KAMU"; const NOMOR_ADMIN = "6281803004607"; const URL_STARSENDER = "https://starsender.online/api/sendText";

app.post("/notif-wa", async (req, res) => { const { nama, produk, harga } = req.body;

if (!nama || !produk || !harga) { return res.status(400).json({ error: "Data tidak lengkap" }); }

try { const pesan = \u2705 Pesanan Baru Masuk!\n\nNama/HP: ${nama}\nProduk: ${produk}\nHarga: Rp${harga.toLocaleString()}\n\nSegera cek dashboard admin.;

const kirim = await axios.post(
  URL_STARSENDER,
  {
    phone: NOMOR_ADMIN,
    message: pesan,
    secret: API_KEY,
    priority: 1
  },
  { headers: { "Content-Type": "application/json" } }
);

res.json({ success: true, result: kirim.data });

} catch (error) { res.status(500).json({ error: "Gagal kirim WhatsApp", detail: error.message }); } });

app.get("/", (req, res) => { res.send("API WA Notifikasi Aktif"); });

const PORT = process.env.PORT || 3000; app.listen(PORT, () => { console.log("Server jalan di port", PORT); });

