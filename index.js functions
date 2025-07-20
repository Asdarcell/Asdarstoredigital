const functions = require("firebase-functions");
const fetch = require("node-fetch");

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
