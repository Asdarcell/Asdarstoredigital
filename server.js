// server.js const express = require("express"); const bodyParser = require("body-parser"); const cors = require("cors"); const axios = require("axios");

const app = express(); app.use(cors()); app.use(bodyParser.json());

const STARSENDER_APIKEY = process.env.STARSENDER_APIKEY; const NO_WA_ADMIN = process.env.NO_WA_ADMIN;

app.post("/notif-wa", async (req, res) => { const { nama, produk, harga } = req.body; if (!nama || !produk || !harga) { return res.status(400).send("Data tidak lengkap"); }

const pesan = \u{1F4E2} Pesanan Masuk\nNama: ${nama}\nProduk: ${produk}\nHarga: Rp${harga.toLocaleString()}\nSegera proses di Dashboard Admin.;

try { const response = await axios.post( "https://starsender.online/api/sendText", { phone: NO_WA_ADMIN, message: pesan }, { headers: { apikey: STARSENDER_APIKEY, "Content-Type": "application/json" } } );

res.status(200).send("Notifikasi terkirim");

} catch (err) { console.error(err.response?.data || err.message); res.status(500).send("Gagal mengirim notifikasi"); } });

const PORT = process.env.PORT || 3000; app.listen(PORT, () => console.log("Server running on port", PORT));

