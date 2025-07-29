// assets/js/app.js

// --- Kode JavaScript Anda yang SUDAH ADA (dari index.html) ---
AOS.init({ duration: 800, once: true, offset: 50 });

const firebaseConfig = {
  apiKey: "AIzaSyA_L6U3HKM1DnKuq_Q1zKFH4bk8GMAz210",
  authDomain: "asdarstoredigitalll-d89c4.firebaseapp.com",
  databaseURL: "https://asdarstoredigitalll-d89c4-default-rtdb.firebaseio.com",
  projectId: "asdarstoredigitalll-d89c4",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const dbFS = firebase.firestore();
const dbRT = firebase.database();
 
const userPanel = document.getElementById('user-panel');
let produkTerpilihData = null;
let promoProdukTerpakai = false;
let diskonShareTerpakai = false;
const POTONGAN_DISKON_SHARE = 5000;
const submitBtn = document.getElementById('submitBtn');
const kategoriSelect = document.getElementById('kategori');
const produkSelect = document.getElementById('produk');
const infoProduk = document.getElementById('infoProduk');
const hasilDiv = document.getElementById('hasil');
const formNotification = document.getElementById('formNotification');
let testimonialInterval = null;

const formatRupiah = (angka) => `Rp${(angka || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const normalizePhone = (num) => {
  let n = String(num).trim().replace(/[^0-9]/g, '');
  if (n.startsWith('0')) return '62' + n.slice(1);
  if (n.startsWith('62')) return n;
  return num;
};
const showNotification = (message, type = 'error') => {
    formNotification.textContent = message;
    formNotification.className = `notification ${type}`;
    formNotification.style.display = 'block';
};
const hideNotification = () => { formNotification.style.display = 'none'; };

function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHtml = `<i class="far fa-copy"></i> Salin`;
        element.innerHTML = `<i class="fas fa-check"></i> Disalin!`;
        element.disabled = true;
        setTimeout(() => {
            element.innerHTML = originalHtml;
            element.disabled = false;
        }, 2000);
    }).catch(err => {
        console.error('Gagal menyalin teks: ', err);
        alert('Gagal menyalin. Mohon salin secara manual.');
    });
}

// FUNGSI UNTUK MEMUAT KODE KUSTOM DARI ADMIN PANEL
function loadCustomCode() {
    dbRT.ref('customCode').once('value').then(snapshot => {
        if (snapshot.exists()) {
            const customCode = snapshot.val();
            if (customCode.css) {
                const styleTag = document.createElement('style');
                styleTag.innerHTML = customCode.css;
                document.head.appendChild(styleTag);
            }
            const htmlContainer = document.getElementById('custom-html-container');
            if (htmlContainer && customCode.html) {
                htmlContainer.innerHTML = customCode.html;
            }
            if (customCode.js) {
                const scriptTag = document.createElement('script');
                scriptTag.textContent = customCode.js;
                document.body.appendChild(scriptTag);
            }
        }
    }).catch(error => console.error("Gagal memuat kode kustom:", error));
}

document.addEventListener('DOMContentLoaded', () => {
  loadInitialData();
  loadCustomCode(); // Menjalankan fungsi pemuat kode kustom
  kategoriSelect.addEventListener('change', handleCategoryChange);
  produkSelect.addEventListener('change', handleProductSelection);
  document.getElementById('waAktif').addEventListener('input', checkDiskonShare);
  document.getElementById('formTestimoni').addEventListener('submit', handleTestimoniSubmit);
  document.getElementById('formPesanan').addEventListener('submit', handleOrderSubmit);
});

auth.onAuthStateChanged(user => {
    if (user) {
        const resellerRef = dbFS.collection('resellers').doc(user.uid);
        resellerRef.get().then(doc => {
            if (doc.exists && doc.data().status === 'active') {
                userPanel.innerHTML = `<a href="reseller-dashboard.html" class="dashboard-btn"><i class="fas fa-tachometer-alt"></i><span>Dashboard Reseller</span></a>`;
            } else {
                userPanel.innerHTML = `<a href="reseller.html" class="reseller-btn"><i class="fas fa-user-tie"></i><span>Jadi Reseller</span></a>`;
            }
        }).catch(error => {
            console.error("Error checking reseller status:", error);
            userPanel.innerHTML = `<a href="reseller.html" class="reseller-btn"><i class="fas fa-user-tie"></i><span>Jadi Reseller</span></a>`;
        });
    } else {
        userPanel.innerHTML = `<a href="login.html" class="reseller-btn"><i class="fas fa-sign-in-alt"></i><span>Login/Daftar</span></a>`;
    }
});
 
function loadInitialData() {
    dbFS.collection('produk').get().then(snapshot => {
        const categories = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.kategori) {
                categories.add(data.kategori);
            }
        });
        kategoriSelect.innerHTML = '<option value="">Pilih Kategori</option>';
        categories.forEach(kategori => {
            kategoriSelect.innerHTML += `<option value="${kategori}">${kategori}</option>`;
        });
    });
    loadAndDisplayBanners();
    loadAndRenderFaq();
    loadApprovedTestimonials();
    loadAndDisplayDynamicProducts(); // Panggil ini untuk memuat produk dari API Jagoan Pedia
}

async function loadAndDisplayBanners() {
    const bannerContainer = document.getElementById('banner-container');
    if (!bannerContainer) return;
    try {
        const snapshot = await dbFS.collection('banners').orderBy('urutan').get();
        if (snapshot.empty) {
            bannerContainer.style.display = 'none';
            return;
        }
        let bannersHTML = '';
        snapshot.forEach(doc => {
            const banner = doc.data();
            const imgTag = `<img src="${banner.url}" alt="Banner Promosi" class="banner-image">`;
            if (banner.link) {
                bannersHTML += `<a href="${banner.link}" target="_blank" class="banner-item">${imgTag}</a>`;
            } else {
                bannersHTML += `<div class="banner-item">${imgTag}</div>`;
            }
        });
        bannerContainer.innerHTML = bannersHTML;
    } catch (error) {
        console.error("Gagal memuat banner:", error);
    }
}

function handleCategoryChange() {
    resetFormState();
    const kategori = kategoriSelect.value;
    if (!kategori) return;
    produkSelect.innerHTML = '<option value="">Pilih Produk</option>';
    dbFS.collection('produk').where('kategori', '==', kategori).get().then(snapshot => {
        const products = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            products.push({ id: doc.id, ...data });
        });
        products.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
        products.forEach(prod => {
            produkSelect.innerHTML += `<option value="${prod.id}">${prod.nama_produk}</option>`;
        });
    });
}

function handleProductSelection() {
    const produkId = produkSelect.value;
    promoProdukTerpakai = false;
    diskonShareTerpakai = false;
    
    if (!produkId) {
        resetFormState();
        return;
    }
    infoProduk.innerHTML = 'Memuat detail produk...';
    submitBtn.disabled = true;
    submitBtn.textContent = '...';
    document.getElementById('product-promo-container').innerHTML = '';
    
    dbFS.collection('produk').doc(produkId).onSnapshot(doc => {
        if (!doc.exists) {
            infoProduk.innerHTML = 'Produk tidak ditemukan.';
            return;
        }
        produkTerpilihData = { id: doc.id, ...doc.data() };
        updateTotalHarga(); // Panggil ini setelah produk terpilih data di set
        checkDiskonShare(); // Cek diskon share jika ada

        if (!produkTerpilihData.stok || produkTerpilihData.stok <= 0) {
            submitBtn.textContent = 'Stok Habis';
            submitBtn.disabled = true;
            infoProduk.innerHTML += `<br><b class="text-danger">Stok saat ini habis.</b>`;
        } else {
            submitBtn.textContent = 'Pesan Sekarang';
            submitBtn.disabled = false;
            if (!diskonShareTerpakai && produkTerpilihData.promo && produkTerpilihData.promo.jenis) {
                let promoText = produkTerpilihData.promo.jenis === 'nominal' ? `Potongan ${formatRupiah(produkTerpilihData.promo.nilai)}` : `Diskon ${produkTerpilihData.promo.nilai}%`;
                document.getElementById('product-promo-container').innerHTML = `<div class="claim-promo-card"><p style="font-weight:600;">🎉 Promo Spesial!</p><p>${promoText}</p><button type="button" class="btn btn-sm btn-primary mt-1" onclick="klaimPromoProduk()">✨ Klaim Diskon</button></div>`;
            }
        }
    });
}

function updateTotalHarga() {
    if (!produkTerpilihData) return;
    let hargaAwal = produkTerpilihData.harga_umum;
    let hargaFinal = hargaAwal;
    let deskripsiHarga = `<b>Harga:</b> ${formatRupiah(hargaAwal)}`;
    let diskonDeskripsiTambahan = '';

    if (promoProdukTerpakai && produkTerpilihData.promo) {
        let potongan = (produkTerpilihData.promo.jenis === 'nominal') ? produkTerpilihData.promo.nilai : hargaAwal * (produkTerpilihData.promo.nilai / 100);
        hargaFinal = Math.max(0, hargaAwal - potongan);
        diskonDeskripsiTambahan = `<br><b style="color:var(--success);">Harga Promo: ${formatRupiah(hargaFinal)}</b>`;
    } else if (diskonShareTerpakai) {
        hargaFinal = Math.max(0, hargaAwal - POTONGAN_DISKON_SHARE);
        diskonDeskripsiTambahan = `<br><b style="color:var(--success);">Harga Diskon: ${formatRupiah(hargaFinal)}</b>`;
    }
    
    infoProduk.innerHTML = `${deskripsiHarga}${diskonDeskripsiTambahan}<br><b>Deskripsi:</b> ${produkTerpilihData.deskripsi || '-'}<br><b>Stok Tersedia:</b> ${produkTerpilihData.stok || 0}`;
}

async function handleOrderSubmit(e) {
    e.preventDefault();
    hideNotification();
    if (submitBtn.disabled) return;
    const nama = document.getElementById('nama').value.trim();
    const nomor = document.getElementById('nomor').value.trim();
    const waAktifInput = document.getElementById('waAktif');
    if (!nama || !nomor || !waAktifInput.checkValidity() || !produkTerpilihData) {
        showNotification("Harap lengkapi semua data dengan benar!");
        return;
    }
    const waAktif = normalizePhone(waAktifInput.value.trim());
    const kategori = kategoriSelect.value;
    const produkId = produkSelect.value;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';
    try {
        let hargaAwal = produkTerpilihData.harga_umum;
        let hargaFinal = hargaAwal;
        let promoDigunakan = null;
        let diskon_share_digunakan = false;

        if (promoProdukTerpakai && produkTerpilihData.promo) {
            let potongan = (produkTerpilihData.promo.jenis === 'nominal') ? produkTerpilihData.promo.nilai : hargaAwal * (produkTerpilihData.promo.nilai / 100);
            hargaFinal = Math.max(0, hargaAwal - potongan);
            promoDigunakan = produkTerpilihData.promo;
        } else if (diskonShareTerpakai) {
            hargaFinal = Math.max(0, hargaAwal - POTONGAN_DISKON_SHARE);
            diskon_share_digunakan = true;
        }

        const id = "P" + Date.now();
        await dbFS.collection('pesananUmum').doc(id).set({
            id, nama_pelanggan: nama, nomor_pelanggan: nomor, no_whatsap_aktif: waAktif,
            kategori, produk: produkTerpilihData.nama_produk,
            waktu: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'Menunggu Pembayaran',
            harga_final: hargaFinal,
            promo_digunakan: promoDigunakan,
            diskon_share: diskon_share_digunakan,
        });

        if (diskon_share_digunakan) {
            await dbRT.ref('hakDiskon/' + waAktif).remove();
        }
        
        const paymentSnapshot = await dbFS.collection('infoPembayaran').get();
        let paymentHtml = '<div class="payment-methods-list">';
        paymentSnapshot.forEach(doc => {
            const detail = doc.data();
            paymentHtml += `<div class="payment-method-item"><div class="payment-details"><div class="payment-method-name">${detail.metode}</div><div class="payment-method-number">${detail.nomor}</div><div class="payment-method-an">a.n ${detail.atas_nama}</div></div><button class="copy-btn" onclick="copyToClipboard('${detail.nomor}', this)"><i class="far fa-copy"></i> Salin</button></div>`;
        });
        paymentHtml += '</div>';
        hasilDiv.style.display = 'block';
        hasilDiv.innerHTML = `<p class="fw-bold fs-5 text-center" style="color:var(--success);"><i class="fas fa-check-circle me-2"></i>Pesanan Berhasil Dibuat!</p><p class="text-center"><b>ID Pesanan:</b> <code>${id}</code></p><div class="info"><p class="mb-2 text-center"><strong>Lakukan pembayaran sebesar ${formatRupiah(hargaFinal)}</strong> ke salah satu rekening berikut:</p>${paymentHtml}</div><p class="text-center text-muted mt-3">Setelah membayar, jangan lupa upload bukti pembayaran.</p><div class="d-flex justify-content-center gap-2 mt-4"><a class='btn btn-primary' href="upload.html?id=${id}" style="width:100%;"><i class="fas fa-upload me-2"></i>Upload Bukti</a><a class='btn btn-secondary' href="status.html?id=${id}" style="width:100%;"><i class="fas fa-eye me-2"></i>Cek Status</a></div>`;
        document.getElementById('formPesanan').reset();
        resetFormState();
        window.scrollTo({ top: hasilDiv.offsetTop - 80, behavior: 'smooth' });
    } catch (error) {
        console.error("Error saat memesan:", error);
        showNotification("Terjadi kesalahan: " + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Pesan Sekarang';
    }
}

function resetFormState() {
    produkTerpilihData = null;
    promoProdukTerpakai = false;
    diskonShareTerpakai = false;
    
    document.getElementById('claim-button').disabled = false;
    document.getElementById('claim-button').innerText = "✅ Ya, Gunakan Diskon";
    document.getElementById('claim-discount-section').style.display = 'none';
    
    infoProduk.innerHTML = 'Harga dan deskripsi akan muncul di sini.';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Pilih Produk Dahulu';
    document.getElementById('product-promo-container').innerHTML = '';
    hideNotification();
}

function loadAndRenderFaq() {
    const faqContainer = document.getElementById('faq-container');
    dbRT.ref('faq').once('value').then(snap => {
        faqContainer.innerHTML = '';
        if (!snap.exists()) {
            faqContainer.innerHTML = `<p class="text-center text-muted">FAQ tidak tersedia.</p>`;
            return;
        }
        snap.forEach(itemSnap => {
            const itemData = itemSnap.val();
            const item = document.createElement('div');
            item.className = 'faq-item';
            item.innerHTML = `<div class="faq-question">${itemData.q}</div><div class="faq-answer">${itemData.a}</div>`;
            faqContainer.appendChild(item);
        });
        document.querySelectorAll('.faq-question').forEach(item => {
            item.addEventListener('click', () => item.parentElement.classList.toggle('active'));
        });
    }).catch(err => { console.error("Gagal memuat FAQ:", err); });
}

function loadApprovedTestimonials() {
    const container = document.getElementById('testimoniContainer');
    const allTestimonials = [];
    let currentIndex = 0;
    dbRT.ref('testimonials').orderByChild('status').equalTo('disetujui').once('value', snap => {
        container.innerHTML = '';
        if (!snap.exists()) {
            container.innerHTML = `<p style="text-align:center; padding-top: 20px;">Jadilah yang pertama memberi testimoni!</p>`;
            return;
        }
        snap.forEach(childSnap => { allTestimonials.push(childSnap.val()); });
        allTestimonials.reverse();
        if (testimonialInterval) clearInterval(testimonialInterval);
        testimonialInterval = setInterval(() => {
            if (allTestimonials.length === 0) return;
            if (container.children.length > 6) { container.firstChild.remove(); }
            const testi = allTestimonials[currentIndex];
            const bubble = document.createElement('div');
            bubble.className = 'testimonial-bubble';
            bubble.innerHTML = `<div class="testimonial-header"><i class="fas fa-user-circle"></i><span class="testimonial-name">${testi.nama || 'Anonim'}</span></div><div class="testimonial-body">${testi.isi || ''}</div>`;
            container.appendChild(bubble);
            container.scrollTop = container.scrollHeight;
            currentIndex = (currentIndex + 1) % allTestimonials.length;
        }, 4000);
    });
}

async function handleTestimoniSubmit(e) {
    e.preventDefault();
    const nama = document.getElementById('testiNama').value.trim();
    const pesan = document.getElementById('testiPesan').value.trim();
    const statusEl = document.getElementById('testiStatus');
    if (!nama || !pesan) {
        statusEl.textContent = 'Nama dan pesan wajib diisi!';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    try {
        await dbRT.ref('testimonials').push({ nama, isi: pesan, status: 'pending', createdAt: new Date().toISOString() });
        statusEl.textContent = 'Terima kasih! Testimoni Anda akan kami review.';
        statusEl.style.color = 'var(--success)';
        e.target.reset();
        setTimeout(() => { statusEl.textContent = ''; }, 4000);
    } catch (error) {
        statusEl.textContent = 'Gagal mengirim testimoni.';
        statusEl.style.color = 'var(--danger)';
    }
}
 
window.cekStatus = () => {
    const id = document.getElementById('idCek').value.trim();
    if (id) window.location.href = `status.html?id=${id}`;
};

window.klaimPromoProduk = () => {
    promoProdukTerpakai = true;
    diskonShareTerpakai = false;
    document.getElementById('product-promo-container').innerHTML = '';
    updateTotalHarga();
    document.getElementById('claim-button').disabled = true;
    document.getElementById('claim-button').innerText = "✅ Diskon Diterapkan";
};
 
async function checkDiskonShare() {
    if (promoProdukTerpakai) {
        document.getElementById('claim-discount-section').style.display = 'none';
        return;
    }
    const waInput = document.getElementById('waAktif');
    const claimSection = document.getElementById('claim-discount-section');
    const nomorWA = normalizePhone(waInput.value);
    if (waInput.checkValidity() && nomorWA.length > 10) {
        try {
            const snapshot = await dbRT.ref('hakDiskon/' + nomorWA).once('value');
            claimSection.style.display = (snapshot.exists() && snapshot.val() === true) ? 'block' : 'none';
        } catch (error) {
            console.error("Error checking discount:", error);
            claimSection.style.display = 'none';
        }
    } else {
        claimSection.style.display = 'none';
    }
}

window.gunakanDiskonShare = () => {
    diskonShareTerpakai = true;
    promoProdukTerpakai = false;
    document.getElementById('product-promo-container').innerHTML = '';
    updateTotalHarga();
    document.getElementById('claim-button').disabled = true;
    document.getElementById('claim-button').innerText = "✅ Diskon Diterapkan";
};


// --- KODE BARU UNTUK INTEGRASI API JAGOAN PEDIA ---

// Pastikan URL API PHP Anda sudah benar di sini!
const JAGOAN_PEDIA_API_ENDPOINT = 'https://api-ppob.myhosting.com/index.php'; // GANTI DENGAN URL API PHP Anda yang sebenarnya!

// Referensi elemen modal
const buyModal = document.getElementById('buyModal');
const modalProductName = document.getElementById('modalProductName');
const modalProductPrice = document.getElementById('modalProductPrice');
const targetInput = document.getElementById('targetInput');
const confirmBuyBtn = document.getElementById('confirmBuyBtn');
const cancelBuyBtn = document.getElementById('cancelBuyBtn');
const buyMessage = document.getElementById('buyMessage');

let currentApiProduct = null; // Untuk menyimpan data produk API yang sedang dipilih

// Fungsi untuk memanggil API PHP Anda
async function callJagoanPediaApi(action, data = {}) {
    try {
        const response = await fetch(JAGOAN_PEDIA_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, ...data })
        });

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Error saat memanggil API Jagoan Pedia:', error);
        return { success: false, message: 'Kesalahan jaringan atau server saat menghubungi API Jagoan Pedia.' };
    }
}

// Fungsi untuk membuat dan menampilkan kartu produk dinamis
function createDynamicProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card'; // Menggunakan kelas yang sama dengan produk statis

    const price = product.price ? `Rp ${parseFloat(product.price).toLocaleString('id-ID')}` : 'Harga Tidak Tersedia';
    const description = product.note || 'Tidak ada deskripsi.'; // Menggunakan 'note' dari API Jagoan Pedia sebagai deskripsi
    const isAvailable = product.status === 'available'; // Asumsi 'status' field dari Jagoan Pedia API

    card.innerHTML = `
        <h3>${product.name}</h3>
        <p>${description}</p>
        <p class="price">${price}</p>
        <button class="buy-button ${!isAvailable ? 'disabled' : ''}" 
                data-service-id="${product.id}" 
                data-product-name="${product.name}" 
                data-product-price="${price}"
                ${!isAvailable ? 'disabled' : ''}>
            ${isAvailable ? 'Beli Sekarang' : 'Stok Habis'}
        </button>
    `;

    // Tambahkan event listener untuk tombol beli di kartu ini
    const buyButton = card.querySelector('.buy-button');
    if (isAvailable) { // Hanya tambahkan listener jika produk tersedia
        buyButton.addEventListener('click', (event) => {
            // Simpan data produk lengkap untuk digunakan di modal
            currentApiProduct = product; 
            showBuyModalForApiProduct(product.id, product.name, price);
        });
    }

    return card;
}

// Fungsi untuk memuat dan menampilkan produk dinamis dari API
async function loadAndDisplayDynamicProducts() {
    const container = document.getElementById('apiProductsContainer');
    container.innerHTML = '<p>Memuat produk dinamis...</p>'; // Tampilkan pesan loading
    
    const response = await callJagoanPediaApi('get_services');

    if (response.success && response.services && response.services.length > 0) {
        container.innerHTML = ''; // Kosongkan pesan loading
        response.services.forEach(product => {
            const productCard = createDynamicProductCard(product);
            container.appendChild(productCard);
        });
    } else if (response.success && response.services && response.services.length === 0) {
        container.innerHTML = '<p>Tidak ada produk dinamis yang tersedia dari API saat ini.</p>';
    } else {
        container.innerHTML = `<p style="color: red;">Gagal memuat produk dinamis: ${response.message}</p>`;
        console.error('Detail Error API Jagoan Pedia:', response.api_response);
    }
}

// Fungsi untuk menampilkan modal pembelian untuk produk API
function showBuyModalForApiProduct(serviceId, productName, productPrice) {
    // currentApiProduct sudah diatur saat tombol diklik
    modalProductName.textContent = productName;
    modalProductPrice.textContent = productPrice;
    targetInput.value = ''; // Kosongkan input
    buyMessage.textContent = ''; // Kosongkan pesan
    confirmBuyBtn.dataset.serviceId = serviceId; // Simpan serviceId di tombol konfirmasi
    buyModal.style.display = 'flex'; // Gunakan 'flex' untuk centering
}

function hideBuyModal() {
    buyModal.style.display = 'none';
    currentApiProduct = null;
}

// Event listener untuk tombol Konfirmasi Beli di modal (untuk produk API)
confirmBuyBtn.addEventListener('click', async () => {
    const serviceId = confirmBuyBtn.dataset.serviceId;
    const namaPelanggan = document.getElementById('nama').value.trim(); // Ambil dari form utama
    const waAktif = normalizePhone(document.getElementById('waAktif').value.trim()); // Ambil dari form utama
    const target = targetInput.value.trim();

    if (!serviceId || !target || !namaPelanggan || !waAktif) {
        buyMessage.textContent = 'Harap lengkapi Nama, WhatsApp Aktif di form utama, dan Nomor Tujuan/ID di modal.';
        buyMessage.style.color = 'red';
        return;
    }

    buyMessage.textContent = 'Memproses pesanan...';
    buyMessage.style.color = 'var(--muted-text)';
    confirmBuyBtn.disabled = true; // Nonaktifkan tombol saat memproses

    const orderData = {
        service_id: serviceId,
        target: target
        // Anda bisa menambahkan custom_id di sini jika ingin melacak pesanan dari sisi frontend
        // custom_id: `JP_${Date.now()}`
    };

    const response = await callJagoanPediaApi('place_order', orderData);

    if (response.success) {
        buyMessage.style.color = 'green';
        buyMessage.textContent = `Pesanan berhasil! ID Transaksi: ${response.order_data.id}. Status: ${response.order_data.status}`;
        
        // Opsional: Simpan detail pesanan API ke Firestore juga untuk riwayat
        const orderIdFirebase = `API_${Date.now()}`;
        await dbFS.collection('pesananApi').doc(orderIdFirebase).set({
            id: orderIdFirebase,
            service_id: serviceId,
            nama_produk: currentApiProduct ? currentApiProduct.name : 'Produk API',
            harga: currentApiProduct ? currentApiProduct.price : 0,
            nama_pelanggan: namaPelanggan,
            nomor_pelanggan: target, // Target di API menjadi nomor pelanggan
            no_whatsap_aktif: waAktif,
            waktu: firebase.firestore.FieldValue.serverTimestamp(),
            status: response.order_data.status, // Status dari respons API
            id_transaksi_jagoanpedia: response.order_data.id,
            api_response_raw: response.api_response // Simpan respons mentah untuk debugging
        });

        setTimeout(() => {
            hideBuyModal();
            // Anda bisa tambahkan notifikasi atau refresh tampilan di sini jika perlu
        }, 3000); // Tutup modal setelah 3 detik
    } else {
        buyMessage.style.color = 'red';
        buyMessage.textContent = `Gagal memesan: ${response.message}`;
        console.error('Detail Error Pesanan API:', response.api_response);
    }
    confirmBuyBtn.disabled = false; // Aktifkan kembali tombol
});

cancelBuyBtn.addEventListener('click', hideBuyModal);

// Panggil fungsi untuk memuat produk dinamis saat halaman dimuat
// Ini akan berjalan bersamaan dengan fungsi loadInitialData() Anda
// (loadInitialData sudah memanggil loadAndDisplayDynamicProducts())
// window.addEventListener('load', loadAndDisplayDynamicProducts); // Ini sudah dipanggil di loadInitialData()
