const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Anda tidak perlu axios untuk reCAPTCHA lagi di alur ini
const fetch = require("node-fetch"); 

admin.initializeApp();

// ========================================================
// [PERBAIKAN] FUNGSI PENDAFTARAN HANYA UNTUK ADMIN
// ========================================================
exports.registerUserByAdmin = functions.https.onCall(async (data, context) => {
  // 1. Pastikan yang memanggil fungsi ini adalah Admin
  // Ganti 'x7e0NcmetdXtRJPev9EGKMytX0S2' dengan UID Admin Anda
  const ADMIN_UID = 'x7e0NcmetdXtRJPev9EGKMytX0S2'; 
  
  if (!context.auth || context.auth.uid !== ADMIN_UID) {
    throw new functions.https.HttpsError(
      "permission-denied", 
      "Operasi ini hanya diizinkan untuk Admin."
    );
  }

  // 2. Karena hanya admin, kita tidak perlu reCAPTCHA lagi
  const email = data.email;
  const password = data.password;
  
  // 3. Buat akun pengguna baru
  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
    });
    return { success: true, message: `Akun ${userRecord.email} berhasil dibuat oleh Admin.` };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Email ini sudah terdaftar.');
    }
    functions.logger.error("Gagal membuat pengguna oleh Admin:", error);
    throw new functions.https.HttpsError('internal', 'Terjadi kesalahan saat membuat akun.');
  }
});


// ========================================================
// FUNGSI ANDA YANG SUDAH ADA (sendWaMessage)
// (Tidak ada yang diubah di sini)
// ========================================================
exports.sendWaMessage = functions.https.onCall(async (data, context) => {
  // ... (kode fungsi ini tetap sama) ...
});
