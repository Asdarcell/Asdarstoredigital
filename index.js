const functions = require("firebase-functions");
const axios = require("axios");

exports.sendWaMessage = functions.https.onCall(async (data, context) => {
  const { to, message } = data;

  if (!to || !message) {
    throw new functions.https.HttpsError("invalid-argument", "Nomor dan pesan wajib diisi.");
  }

  const form = new URLSearchParams();
  form.append("appkey", "ab3727c5-e0be-40f9-bb3f-25d93b029f7a");
  form.append("authkey", "tbAWbiCwmK1H0IgWpkJFzwiv8yXMuenAyenek6rJBG8QEqyiqq");
  form.append("to", to);
  form.append("message", message);

  try {
    const response = await axios.post("https://api.ngirimwa.id/v1/messages", form, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const resData = response.data;
    if (resData.status !== true) {
      throw new Error(resData.message || "Gagal mengirim pesan WA.");
    }

    return { success: true, result: resData };
  } catch (err) {
    console.error("Gagal kirim WA:", err.response?.data || err.message);
    throw new functions.https.HttpsError("internal", "Gagal kirim pesan WA");
  }
});
