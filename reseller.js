// reseller.js

// Impor fungsi yang dibutuhkan dari Firebase SDK v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, runTransaction, serverTimestamp, increment, setDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
import { firebaseConfig } from './firebase-config.js';

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Inisialisasi AOS (Animasi)
AOS.init({ duration: 800, once: true, offset: 50 });

// --- Selektor Elemen DOM ---
const submitBtn = document.getElementById('submitBtn');
const kategoriSelect = document.getElementById('kategori');
const produkSelect = document.getElementById('produk');
const infoProduk = document.getElementById('infoProduk');
const hasilDiv = document.getElementById('hasil');
const formNotification = document.getElementById('formNotification');
const saldoDisplay = document.getElementById('saldo-display');
const backToIndexBtn = document.getElementById('back-to-index-btn');
const logoutBtn = document.getElementById('logoutBtn');
const topupSection = document.getElementById('topup-section');
const toggleTopupBtn = document.getElementById('show-topup-btn');
const nominalButtons = document.querySelectorAll('.topup-btn');
const nominalInput = document.getElementById('nominalInput');
const confirmationForm = document.getElementById('confirmation-form');
const formStatusTopup = document.getElementById('form-status');
const submitBtnTopup = document.getElementById('submit-btn-topup');

// --- Variabel State Aplikasi ---
let produkTerpilihData = null;
let hasResellerDiscount = false;
const POTONGAN_DISKON = 5000;
let currentUser = null;
let saldoReseller = 0;
let selectedNominal = null;

// --- Fungsi Helper ---
const formatRupiah = (angka) => `Rp${(angka || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

const showNotification = (element, message, type = 'error') => {
    element.textContent = message;
    element.className = `notification ${type}`;
    element.style.display = 'block';
};

const hideNotification = (element) => {
    element.style.display = 'none';
};

// --- Logika Utama ---
document.addEventListener('DOMContentLoaded', () => {
    // Cek status otentikasi pengguna
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadInitialData();
            listenToResellerBalance(user.uid);
            loadPaymentMethodsForTopup();
            loadOrderHistory(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    // Tambahkan Event Listeners
    backToIndexBtn.addEventListener('click', () => window.location.href = 'index.html');
    logoutBtn.addEventListener('click', handleLogout);
    kategoriSelect.addEventListener('change', handleCategoryChange);
    produkSelect.addEventListener('change', handleProductSelection);
    document.getElementById('formPesanan').addEventListener('submit', handleOrderSubmit);
    toggleTopupBtn.addEventListener('click', toggleTopupSection);
    confirmationForm.addEventListener('submit', handleTopupConfirmation);
    
    nominalButtons.forEach(btn => btn.addEventListener('click', handleNominalButtonClick));
    nominalInput.addEventListener('input', handleNominalInput);
});

function handleLogout() {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    }).catch(error => console.error("Error saat logout:", error));
}

function listenToResellerBalance(uid) {
    const resellerRef = doc(db, 'resellers', uid);
    onSnapshot(resellerRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            saldoReseller = data.saldo || 0;
            hasResellerDiscount = data.punyaHakDiskon || false;
            saldoDisplay.textContent = `Saldo: ${formatRupiah(saldoReseller)}`;
            if (produkTerpilihData) updateTotalHarga(); // Perbarui harga jika produk sudah dipilih
        } else {
            saldoReseller = 0;
            hasResellerDiscount = false;
            saldoDisplay.textContent = `Saldo: Rp0 (Akun belum aktif)`;
        }
    }, (error) => {
        console.error("Error mendengarkan saldo:", error);
        saldoDisplay.textContent = `Saldo: Error`;
    });
}

async function loadInitialData() {
    try {
        const q = query(collection(db, 'produk'), orderBy('urutan'));
        const querySnapshot = await getDocs(q);
        const categories = new Set(querySnapshot.docs.map(doc => doc.data().kategori).filter(Boolean));
        
        kategoriSelect.innerHTML = '<option value="">Pilih Kategori</option>';
        categories.forEach(kategori => {
            kategoriSelect.innerHTML += `<option value="${kategori}">${kategori}</option>`;
        });
    } catch (error) {
        console.error("Gagal memuat kategori:", error);
    }
}

async function handleCategoryChange() {
    resetFormState();
    const kategori = kategoriSelect.value;
    if (!kategori) return;
    
    produkSelect.innerHTML = '<option value="">Memuat produk...</option>';
    
    try {
        // Kode Anda untuk mengatasi masalah index sudah benar! Ini adalah cara yang tepat.
        const q = query(collection(db, 'produk'), where('kategori', '==', kategori), orderBy('urutan'));
        const snapshot = await getDocs(q);
        
        produkSelect.innerHTML = '<option value="">Pilih Produk</option>';
        if (snapshot.empty) {
            produkSelect.innerHTML = '<option value="">Tidak ada produk</option>';
            return;
        }
        snapshot.forEach(doc => {
            produkSelect.innerHTML += `<option value="${doc.id}">${doc.data().nama_produk}</option>`;
        });
    } catch (error) {
        console.error("Error memuat produk:", error);
        produkSelect.innerHTML = '<option value="">Gagal memuat</option>';
        if (error.code === 'failed-precondition') {
            alert("DATABASE ERROR: Anda perlu membuat Index di Firestore. Silakan buka halaman ini di Komputer, tekan F12 untuk membuka Console, dan klik link yang muncul untuk membuat index secara otomatis.");
        } else {
            alert("Terjadi kesalahan saat memuat produk: " + error.message);
        }
    }
}

async function handleProductSelection() {
    const produkId = produkSelect.value;
    if (!produkId) {
        resetFormState();
        return;
    }

    infoProduk.innerHTML = 'Memuat detail produk...';
    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
        const productRef = doc(db, 'produk', produkId);
        const docSnap = await getDoc(productRef);

        if (!docSnap.exists()) {
            infoProduk.innerHTML = 'Produk tidak ditemukan.';
            return;
        }
        
        produkTerpilihData = { id: docSnap.id, ...docSnap.data() };
        updateTotalHarga();
        
        if (!produkTerpilihData.stok || produkTerpilihData.stok <= 0) {
            submitBtn.textContent = 'Stok Habis';
            submitBtn.disabled = true;
        } else {
            submitBtn.textContent = 'Pesan Sekarang';
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error("Gagal mengambil data produk:", error);
        infoProduk.innerHTML = 'Gagal memuat detail produk.';
    }
}

function updateTotalHarga() {
    if (!produkTerpilihData) return;
    
    let hargaAwal = produkTerpilihData.harga_reseller;
    let hargaFinal = hargaAwal;
    let deskripsiHarga = `<b>Harga Reseller:</b> ${formatRupiah(hargaAwal)}`;
    let promoMessage = '';
    
    if (hasResellerDiscount) {
        hargaFinal = Math.max(0, hargaAwal - POTONGAN_DISKON);
        deskripsiHarga = `<b>Harga Normal:</b> <del>${formatRupiah(hargaAwal)}</del>`;
        promoMessage = `<b style="color:var(--success);">Harga Diskon Anda: ${formatRupiah(hargaFinal)}</b>`;
        document.getElementById('reseller-discount-info').innerHTML = `<div class="claim-promo-card"><p style="font-weight:600;">🎉 Diskon promosi Rp 5.000 otomatis diterapkan!</p></div>`;
    } else {
         document.getElementById('reseller-discount-info').innerHTML = '';
    }
    
    infoProduk.innerHTML = `
        ${deskripsiHarga}<br>
        ${promoMessage}<hr class="my-2">
        <b>Deskripsi:</b> ${produkTerpilihData.deskripsi || '-'}<br>
        <b>Stok Sisa:</b> ${produkTerpilihData.stok || 0}
    `;
}

async function handleOrderSubmit(e) {
    e.preventDefault();
    hideNotification(formNotification);
    if (submitBtn.disabled || !currentUser) return;

    const nama = document.getElementById('nama').value.trim();
    const nomor = document.getElementById('nomor').value.trim();
    if (!nama || !nomor || !produkTerpilihData) {
        showNotification(formNotification, "Harap lengkapi semua data dengan benar!");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Memproses...';

    try {
        const hargaFinal = hasResellerDiscount 
            ? Math.max(0, produkTerpilihData.harga_reseller - POTONGAN_DISKON)
            : produkTerpilihData.harga_reseller;

        if (saldoReseller < hargaFinal) {
            throw new Error("Saldo tidak cukup untuk melakukan transaksi ini.");
        }

        // Jalankan transaksi atomik untuk memastikan konsistensi data
        await runTransaction(db, async (transaction) => {
            const resellerDocRef = doc(db, 'resellers', currentUser.uid);
            const produkDocRef = doc(db, 'produk', produkTerpilihData.id);

            const resellerDoc = await transaction.get(resellerDocRef);
            const produkDoc = await transaction.get(produkDocRef);

            if (!resellerDoc.exists()) throw new Error("Data reseller Anda tidak ditemukan.");
            if (!produkDoc.exists()) throw new Error("Data produk tidak ditemukan, mungkin sudah dihapus.");
            
            const currentSaldo = resellerDoc.data().saldo || 0;
            const currentStok = produkDoc.data().stok || 0;

            if (currentSaldo < hargaFinal) throw new Error("Transaksi gagal, saldo Anda tidak mencukupi.");
            if (currentStok < 1) throw new Error("Transaksi gagal, stok produk baru saja habis.");
            
            // Lakukan update
            transaction.update(resellerDocRef, { saldo: increment(-hargaFinal) });
            transaction.update(produkDocRef, { stok: increment(-1) });
            if (hasResellerDiscount) {
                transaction.update(resellerDocRef, { punyaHakDiskon: false });
            }
        });
        
        // Buat catatan pesanan baru
        const idPesanan = "R" + Date.now();
        const pesananRef = doc(db, 'pesananReseller', idPesanan);
        await setDoc(pesananRef, {
            id: idPesanan,
            reseller_uid: currentUser.uid,
            email_reseller: currentUser.email,
            nama_reseller: currentUser.displayName || currentUser.email,
            nama_pelanggan: nama,
            nomor_pelanggan: nomor,
            kategori: kategoriSelect.value,
            produk: produkTerpilihData.nama_produk,
            waktu: serverTimestamp(),
            status: 'Selesai',
            harga_beli: hargaFinal
        });
        
        showNotification(formNotification, `Pesanan berhasil! Saldo Anda berkurang ${formatRupiah(hargaFinal)}.`, 'success');
        hasilDiv.style.display = 'block';
        hasilDiv.innerHTML = `<p class="fw-bold fs-5 text-center" style="color:var(--success);"><i class="fas fa-check-circle me-2"></i>Pesanan Berhasil!</p><p class="text-center"><b>ID Pesanan:</b> <code>${idPesanan}</code></p><div class="info"><p class="text-center">Pesanan telah dibayar menggunakan saldo.</p></div>`;
        document.getElementById('formPesanan').reset();
        resetFormState();
        window.scrollTo({ top: hasilDiv.offsetTop - 80, behavior: 'smooth' });

    } catch (error) {
        showNotification(formNotification, `Terjadi kesalahan: ${error.message}`, 'error');
    } finally {
        // Tombol pesan di-reset di dalam resetFormState()
    }
}

function resetFormState() {
    produkTerpilihData = null;
    infoProduk.innerHTML = 'Harga dan deskripsi akan muncul di sini.';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Pilih Produk Dahulu';
    document.getElementById('reseller-discount-info').innerHTML = ''; 
    hideNotification(formNotification);
}

// --- Bagian Top Up Saldo ---

function toggleTopupSection() {
    const isVisible = topupSection.style.display === 'block';
    topupSection.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        window.scrollTo({ top: topupSection.offsetTop, behavior: 'smooth' });
    }
}

function handleNominalButtonClick(e) {
    const btn = e.target;
    nominalButtons.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedNominal = parseInt(btn.dataset.nominal, 10);
    nominalInput.value = selectedNominal;
    submitBtnTopup.disabled = false;
    submitBtnTopup.textContent = 'Kirim Bukti Sekarang';
}

function handleNominalInput() {
    const value = parseInt(nominalInput.value, 10);
    if (!isNaN(value) && value >= 20000) {
        selectedNominal = value;
        submitBtnTopup.disabled = false;
        submitBtnTopup.textContent = 'Kirim Bukti Sekarang';
        nominalButtons.forEach(b => b.classList.remove('selected'));
    } else {
        selectedNominal = null;
        submitBtnTopup.disabled = true;
        submitBtnTopup.textContent = 'Pilih/Masukkan Nominal Valid';
    }
}

async function handleTopupConfirmation(e) {
    e.preventDefault();
    if (!selectedNominal) {
        showNotification(formStatusTopup, 'Silakan pilih nominal!', 'error');
        return;
    }
    if (!currentUser) {
        showNotification(formStatusTopup, 'Anda harus login!', 'error');
        return;
    }
    const proofFile = document.getElementById('uploadProof').files[0];
    if (!proofFile) {
        showNotification(formStatusTopup, 'Harap unggah bukti transfer.', 'error');
        return;
    }

    submitBtnTopup.disabled = true;
    submitBtnTopup.innerHTML = 'Mengunggah...';
    showNotification(formStatusTopup, 'Sedang mengunggah bukti, mohon tunggu...', 'info');

    try {
        const storageRef = ref(storage, `buktiTopup/${currentUser.uid}-${Date.now()}-${proofFile.name}`);
        await uploadBytes(storageRef, proofFile);
        const fileUrl = await getDownloadURL(storageRef);

        const konfirmasiId = 'T' + Date.now();
        const konfirmasiRef = doc(db, 'konfirmasiTopup', konfirmasiId);
        await setDoc(konfirmasiRef, {
            id: konfirmasiId,
            reseller_uid: currentUser.uid,
            reseller_email: currentUser.email,
            nominal: selectedNominal,
            bukti_url: fileUrl,
            status: 'pending',
            created_at: serverTimestamp()
        });
        
        showNotification(formStatusTopup, 'Konfirmasi berhasil dikirim! Silakan tunggu admin memprosesnya.', 'success');
        confirmationForm.reset();
        document.getElementById('uploadProof').value = ''; // Membersihkan input file
        nominalButtons.forEach(b => b.classList.remove('selected'));
        selectedNominal = null;
    } catch (error) {
        showNotification(formStatusTopup, 'Gagal mengirim konfirmasi. ' + error.message, 'error');
    } finally {
        submitBtnTopup.disabled = true; // Kembali disabled setelah selesai
        submitBtnTopup.innerHTML = 'Pilih Nominal Dahulu';
    }
}

async function loadPaymentMethodsForTopup() {
    const paymentMethodsContainer = document.getElementById('payment-methods-topup');
    try {
        const snapshot = await getDocs(collection(db, 'infoPembayaran'));
        paymentMethodsContainer.innerHTML = '';
        if (snapshot.empty) {
            paymentMethodsContainer.innerHTML = `<p>Info pembayaran belum tersedia.</p>`;
            return;
        }
        snapshot.forEach(doc => {
            const data = doc.data();
            paymentMethodsContainer.innerHTML += `
                <div class="payment-details mb-2">
                    <div class="payment-method-name">${data.metode}</div>
                    <div class="payment-method-number">${data.nomor} (a.n ${data.atas_nama})</div>
                </div>`;
        });
    } catch (error) {
        console.error("Error memuat info pembayaran:", error);
        paymentMethodsContainer.innerHTML = `<p class="text-danger">Gagal memuat info pembayaran.</p>`;
    }
}

function loadOrderHistory(uid) {
    const container = document.getElementById('order-history-container');
    container.innerHTML = '<p>Memuat riwayat pesanan...</p>';
    
    const q = query(
        collection(db, 'pesananReseller'), 
        where('reseller_uid', '==', uid), 
        orderBy('waktu', 'desc'), 
        limit(10)
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = '<p>Anda belum memiliki riwayat pesanan.</p>';
            return;
        }
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const waktu = order.waktu?.toDate ? order.waktu.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
            const orderDiv = document.createElement('div');
            orderDiv.className = 'info mb-3';
            orderDiv.innerHTML = `
                <p class="mb-1"><b>ID Pesanan:</b> ${order.id}</p>
                <p class="mb-1"><b>Status:</b> <span class="fw-bold">${order.status}</span></p>
                <p class="mb-1"><b>Produk:</b> ${order.produk}</p>
                <p class="mb-1"><b>Harga Beli:</b> ${formatRupiah(order.harga_beli)}</p>
                <p class="mb-0"><b>Waktu:</b> ${waktu}</p>
            `;
            container.appendChild(orderDiv);
        });
    }, (error) => {
        console.error("Gagal memuat riwayat:", error);
        container.innerHTML = '<p class="text-danger">Gagal memuat riwayat pesanan.</p>';
    });
}
