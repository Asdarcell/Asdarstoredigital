// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyA_L6U3HKM1DnKuq_Q1zKFH4bk8GMAz210",
  authDomain: "asdarstoredigitalll-d89c4.firebaseapp.com",
  projectId: "asdarstoredigitalll-d89c4",
  storageBucket: "asdarstoredigitalll-d89c4.appspot.com",
  messagingSenderId: "220670500351",
  appId: "1:220670500351:web:5737ae5958a6f5a67d5bca"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();
