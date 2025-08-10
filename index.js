const functions = require("firebase-functions");
const admin = require("firebase-admin"); // [BARU] Diperlukan untuk mendaftarkan user
const axios = require("axios"); // [BARU] Diperlukan untuk verifikasi reCAPTCHA
const fetch = require("node-fetch"); // <-- Ini dari fungsi Anda yang sudah ada

// Inisialisasi Firebase Admin SDK (hanya perlu sekali di atas)
admin.initializeApp();

// ========================================================
// [BARU] FUNGSI PENDAFTARAN DENGAN RECAPTCHA
// ========================================================
exports.registerUser = functions.https.onCall(async (data, context) => {
  // PENTING: Ganti dengan Secret Key reCAPTCHA Anda
  const RECAPTCHA_SECRET_KEY = "6LfRVKErAAAAAH90BJ8Vj3reUBVsJZaSVtPe-_AB";
  const userToken = data.token;

  // 1. Verifikasi token reCAPTCHA
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${userToken}`
    );
    if (!response.data.success || response.data.score < 0.5) {
      throw new functions.https.HttpsError("invalid-argument", "Verifikasi reCAPTCHA gagal. Anda terdeteksi sebagai bot.");
    }
  } catch (error) {
    functions.logger.error("Gagal memverifikasi reCAPTCHA:", error);
    throw new functions.https.HttpsError("internal", "Gagal menghubungi layanan reCAPTCHA.");
  }

  // 2. Jika lolos verifikasi, buat akun pengguna baru
  const email = data.email;
  const password = data.password;
  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
    });
    return { success: true, message: `Akun ${userRecord.email} dibuat.` };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Email ini sudah terdaftar.');
    }
    functions.logger.error("Gagal membuat pengguna:", error);
    throw new functions.https.HttpsError('internal', 'Terjadi kesalahan saat membuat akun.');
  }
});


// ========================================================
// FUNGSI ANDA YANG SUDAH ADA (sendWaMessage)
// (Tidak ada yang diubah di sini)
// ========================================================
exports.sendWaMessage = functions.https.onCall(async (data, context) => {
  const { to, message } = data;
  const appkey = "ab3727c5-e0be-40f9-bb3f-25d93b029f7a";
  const authkey = "tbAWbiCwmK1H0IgWpkJFzwiv8yXMuenAyenek6rJBG8QEqyiqq";

  const formData = new URLSearchParams();
  formData.append('appkey', appkey);
  formData.append('authkey', authkey);
  formData.append('to', to);
  formData.append('message', message);

  try {
    const response = await fetch('https://ngirimwa.com/api/send-message', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    return { success: true, result: result };
  } catch (error) {
    throw new functions.https.HttpsError('unknown', 'Gagal mengirim pesan.', error);
  }
});
