const express = require("express");
const bodyParser = require("body-parser");
const FormData = require("form-data");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());

const APPKEY = "ab3727c5-e0be-40f9-bb3f-25d93b029f7a";
const AUTHKEY = "tbAWbiCwmK1H0IgWpkJFzwiv8yXMuenAyenek6rJBG8QEqyiqq";
const NOMOR_ADMIN = "6281803004607";

app.post("/kirim", async (req, res) => {
  const { id, nama, produk } = req.body;

  const form = new FormData();
  form.append("appkey", APPKEY);
  form.append("authkey", AUTHKEY);
  form.append("to", NOMOR_ADMIN);
  form.append(
    "message",
    `📥 Pesanan Baru Masuk\n🧾 ID: ${id}\n👤 Nama: ${nama}\n📦 Produk: ${produk}\n\nKelola ➡ https://asdarcell.github.io/Asdarstoredigital/admin.html`
  );

  try {
    const response = await fetch("https://ngirimwa.id/api/v1/send-message", {
      method: "POST",
      body: form,
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Gagal mengirim WA" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Server berjalan...");
});
