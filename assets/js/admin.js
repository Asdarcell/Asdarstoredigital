// ==========================================================
//  KONFIGURASI FIREBASE DAN FUNGSI UMUM
// ==========================================================
const firebaseConfig = {
    apiKey: "AIzaSyA_L6U3HKM1DnKuq_Q1zKFH4bk8GMAz210",
    authDomain: "asdarstoredigitalll-d89c4.firebaseapp.com",
    databaseURL: "https://asdarstoredigitalll-d89c4-default-rtdb.firebaseio.com",
    projectId: "asdarstoredigitalll-d89c4",
    storageBucket: "asdarstoredigitalll-d89c4.appspot.com",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const dbFS = firebase.firestore();
const dbRT = firebase.database();
const storage = firebase.storage();

// Redirect jika belum login
auth.onAuthStateChanged(user => { if (!user) { window.location.href = "loginadmin.html"; } });

// Fungsi logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => { auth.signOut().then(() => { window.location.href = "loginadmin.html"; }); });
}

// Fungsi format Rupiah
const formatRupiah = (angka) => `Rp${(angka || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

// Fungsi copy to clipboard
function copyToClipboard(text, element) {
    if (!navigator.clipboard) { alert("Browser Anda tidak mendukung fitur salin."); return; }
    navigator.clipboard.writeText(text).then(() => {
        const originalText = element.innerHTML;
        element.innerHTML = 'Disalin!'; element.disabled = true;
        setTimeout(() => { element.innerHTML = originalText; element.disabled = false; }, 1500);
    }).catch(err => { console.error('Gagal menyalin: ', err); alert('Gagal menyalin ID.'); });
}

// Fungsi menampilkan Toast Notifikasi
function showToast(message, type = 'success') {
    const toastElement = document.getElementById('liveToast');
    const toastBody = toastElement.querySelector('.toast-body');
    if (!toastElement || !toastBody) return;
    const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastElement);
    toastElement.className = 'toast align-items-center text-white border-0'; // Reset classes
    toastElement.classList.add(type === 'danger' ? 'bg-danger' : `bg-${type}`);
    toastBody.textContent = message;
    toastBootstrap.show();
}

// Fungsi loading button
function setButtonLoading(button, isLoading) {
    if(!button) return;
    if (isLoading) {
        if (!button.dataset.originalText) { button.dataset.originalText = button.innerHTML; }
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Memuat...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText;
    }
}

// ================================================================
//  MANAJEMEN TABS & PEMUATAN DATA AWAL
// [OPTIMASI] Hanya memuat data untuk tab pertama saat halaman dibuka. 
// Data untuk tab lain akan dimuat saat tab tersebut di-klik. Ini membuat dashboard lebih cepat terbuka.
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Memuat data untuk tab yang aktif pertama kali (Produk)
    loadProducts(); 
    // Memuat data verifikasi secara realtime untuk notifikasi badge
    loadPendingResellers(); 
    // Menyiapkan form promo
    setupPromoManagementForms();

    // Menambahkan event listeners untuk memuat data saat tab di-klik
    const tabSelectors = {
        'products-tab': loadProducts,
        'api-products-tab': loadJagoanPediaProducts,
        'active-resellers-tab': loadResellers,
        'verification-tab': loadPendingResellers,
        'topup-tab': loadTopupConfirmations,
        'orders-tab': loadOrders,
        'testimonials-tab': loadTestimonials,
        'faq-tab': loadFaq,
        'payments-tab': loadPaymentMethods,
        'gift-claims-tab': loadGiftClaims,
        'banners-tab': loadBanners,
        'custom-code-tab': loadCustomFeatures
    };

    for (const [tabId, loadFunction] of Object.entries(tabSelectors)) {
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.addEventListener('click', loadFunction);
        }
    }
});


// =================================== MANAJEMEN PROMO MANUAL ===================================
function setupPromoManagementForms() {
    const resellerPromoForm = document.getElementById('grant-reseller-promo-form');
    if (resellerPromoForm) {
        resellerPromoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reseller-promo-email').value;
            const button = e.target.querySelector('[type=submit]');
            setButtonLoading(button, true);
            try {
                const resellerQuery = await dbFS.collection('resellers').where('email', '==', email).limit(1).get();
                if (resellerQuery.empty) throw new Error('Reseller dengan email tersebut tidak ditemukan.');
                
                const resellerDoc = resellerQuery.docs[0];
                await dbFS.collection('resellers').doc(resellerDoc.id).update({ punyaHakDiskon: true });
                showToast(`Hak diskon berhasil diberikan kepada reseller: ${email}`, 'success');
                resellerPromoForm.reset();
            } catch (error) {
                showToast('Gagal: ' + error.message, 'danger');
            } finally {
                setButtonLoading(button, false);
            }
        });
    }

    const buyerPromoForm = document.getElementById('grant-buyer-promo-form');
    if (buyerPromoForm) {
        buyerPromoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const whatsappNumberInput = document.getElementById('buyer-promo-whatsapp');
            const button = e.target.querySelector('[type=submit]');
            setButtonLoading(button, true);

            const normalizePhone = (num) => {
                let n = String(num).trim().replace(/[^0-9]/g, '');
                if (n.startsWith('0')) return '62' + n.slice(1);
                if (n.startsWith('62')) return n;
                return num;
            };

            const normalizedWhatsappNumber = normalizePhone(whatsappNumberInput.value.trim());

            if (!normalizedWhatsappNumber || normalizedWhatsappNumber.length < 10) {
                showToast('Nomor WhatsApp tidak valid.', 'danger');
                setButtonLoading(button, false);
                return;
            }
            try {
                await dbRT.ref('hakDiskon/' + normalizedWhatsappNumber).set(true);
                showToast(`Hak diskon berhasil diberikan kepada pembeli: ${whatsappNumberInput.value.trim()}`, 'success');
                buyerPromoForm.reset();
            } catch (error) {
                showToast('Gagal memberikan diskon: ' + error.message, 'danger');
            } finally {
                setButtonLoading(button, false);
            }
        });
    }
}

// =================================== PRODUK (Firestore) ===================================
const productForm = document.getElementById('product-form');
const productsTableBody = document.querySelector('#products-table tbody');
const promoCheckbox = document.getElementById('promo-checkbox');
const promoOptions = document.getElementById('promo-options');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
let currentProductId = null;

if (promoCheckbox) {
    promoCheckbox.addEventListener('change', () => { promoOptions.style.display = promoCheckbox.checked ? 'block' : 'none'; });
}

function loadProducts() {
    if(!productsTableBody) return;
    dbFS.collection('produk').orderBy('urutan').get()
        .then(s => {
            productsTableBody.innerHTML = '';
            s.forEach(d => {
                const p = { id: d.id, ...d.data() };
                const r = productsTableBody.insertRow();
                r.innerHTML = `<td>${p.nama_produk}</td><td>${p.kategori}</td><td>${formatRupiah(p.harga_umum)}</td><td>${formatRupiah(p.harga_reseller)}</td><td>${p.stok}</td><td><button class="btn btn-warning btn-sm" onclick="editProduct('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Hapus</button></td>`;
            });
        }).catch(e => {
            productsTableBody.innerHTML = `<tr><td colspan="6" class="text-danger">Gagal memuat produk: ${e.message}</td></tr>`;
        });
}

if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        setButtonLoading(btn, true);
        const productData = {
            nama_produk: document.getElementById('nama_produk').value,
            kategori: document.getElementById('kategori').value,
            deskripsi: document.getElementById('deskripsi').value,
            harga_umum: parseInt(document.getElementById('harga_umum').value),
            harga_reseller: parseInt(document.getElementById('harga_reseller').value),
            stok: parseInt(document.getElementById('stok').value),
            urutan: parseInt(document.getElementById('urutan').value),
            promo: promoCheckbox.checked ? {
                jenis: document.getElementById('promo-jenis').value,
                nilai: parseInt(document.getElementById('promo-nilai').value)
            } : null
        };
        try {
            if (currentProductId) {
                await dbFS.collection('produk').doc(currentProductId).update(productData);
                showToast('Produk berhasil diperbarui!', 'success');
            } else {
                await dbFS.collection('produk').add(productData);
                showToast('Produk berhasil ditambahkan!', 'success');
            }
            productForm.reset();
            if(cancelEditBtn) cancelEditBtn.style.display = 'none';
            if(promoOptions) promoOptions.style.display = 'none';
            currentProductId = null;
            loadProducts();
        } catch (err) {
            showToast('Gagal menyimpan produk: ' + err.message, 'danger');
        } finally {
            setButtonLoading(btn, false);
        }
    });
}

if(cancelEditBtn){
    cancelEditBtn.addEventListener('click', () => {
        if(productForm) productForm.reset();
        cancelEditBtn.style.display = 'none';
        if(promoOptions) promoOptions.style.display = 'none';
        currentProductId = null;
    });
}

async function editProduct(id) {
    const doc = await dbFS.collection('produk').doc(id).get();
    if (doc.exists) {
        const product = doc.data();
        currentProductId = id;
        document.getElementById('nama_produk').value = product.nama_produk;
        document.getElementById('kategori').value = product.kategori;
        document.getElementById('deskripsi').value = product.deskripsi;
        document.getElementById('harga_umum').value = product.harga_umum;
        document.getElementById('harga_reseller').value = product.harga_reseller;
        document.getElementById('stok').value = product.stok;
        document.getElementById('urutan').value = product.urutan || 0;
        if(promoCheckbox) promoCheckbox.checked = !!product.promo;
        if(promoOptions) promoOptions.style.display = product.promo ? 'block' : 'none';
        if (product.promo) {
            document.getElementById('promo-jenis').value = product.promo.jenis;
            document.getElementById('promo-nilai').value = product.promo.nilai;
        }
        if(cancelEditBtn) cancelEditBtn.style.display = 'block';
        if(productForm) productForm.scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteProduct(id) {
    if (confirm('Anda yakin ingin menghapus produk ini?')) {
        try {
            await dbFS.collection('produk').doc(id).delete();
            loadProducts();
            showToast('Produk berhasil dihapus!', 'warning');
        } catch (e) {
            showToast('Gagal menghapus produk: ' + e.message, 'danger');
        }
    }
}

// =================================== RESELLER (Firestore) ===================================
const resellersTableBody = document.querySelector('#resellers-table tbody');
function loadResellers() {
    if(!resellersTableBody) return;
    dbFS.collection('resellers').where('status', '==', 'active').get()
        .then(s => {
            resellersTableBody.innerHTML = '';
            if (s.empty) { resellersTableBody.innerHTML = '<tr><td colspan="3">Belum ada reseller aktif.</td></tr>'; return; }
            s.forEach(d => {
                const r = { id: d.id, ...d.data() };
                const row = resellersTableBody.insertRow();
                row.innerHTML = `<td>${r.email}</td><td>${formatRupiah(r.saldo || 0)}</td><td><button class="btn btn-primary btn-sm" onclick="addSaldo('${r.id}')">+ Saldo</button><button class="btn btn-danger btn-sm" onclick="deleteReseller('${r.id}', this)">Hapus</button></td>`;
            });
        }).catch(e => { resellersTableBody.innerHTML = `<tr><td colspan="3" class="text-danger">Gagal memuat reseller: ${e.message}</td></tr>`; });
}
async function addSaldo(id) {
    const nominalStr = prompt("Masukkan nominal saldo:");
    if (nominalStr !== null) {
        const nominal = parseInt(nominalStr);
        if (!isNaN(nominal) && nominal > 0) {
            try {
                await dbFS.collection('resellers').doc(id).update({ saldo: firebase.firestore.FieldValue.increment(nominal) });
                showToast(`Saldo ditambahkan!`, 'success');
                loadResellers();
            } catch (e) { showToast('Gagal: ' + e.message, 'danger'); }
        } else { showToast("Input nominal tidak valid.", 'warning'); }
    }
}
async function deleteReseller(id, btn) {
    if (confirm('Yakin hapus reseller ini?')) {
        setButtonLoading(btn, true);
        try {
            await dbFS.collection('resellers').doc(id).delete();
            showToast('Reseller dihapus.', 'warning');
            loadResellers();
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}

// =================================== VERIFIKASI RESELLER (Firestore) ===================================
const verificationTableBody = document.getElementById('verification-table-body');
const verificationCountBadge = document.getElementById('verification-count');
function loadPendingResellers() {
    if (!verificationTableBody) return;
    dbFS.collection('resellers').where('status', '==', 'pending-approval').onSnapshot(s => {
        verificationTableBody.innerHTML = '';
        if (s.empty) {
            verificationTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Tidak ada pendaftar baru.</td></tr>`;
            if (verificationCountBadge) verificationCountBadge.style.display = 'none';
            return;
        }
        if (verificationCountBadge) {
            verificationCountBadge.textContent = s.size;
            verificationCountBadge.style.display = 'inline';
        }
        s.forEach(d => {
            const r = d.data();
            const row = `<tr><td>${r.email}</td><td>Paket ${r.paket || 'N/A'}</td><td>${formatRupiah(r.depositAmount)}</td><td><a href="${r.depositProofURL}" target="_blank" class="btn btn-sm btn-info">Lihat Bukti</a></td><td><button class="btn btn-success btn-sm" onclick="approveReseller('${d.id}', ${r.depositAmount})">Setujui</button><button class="btn btn-warning btn-sm" onclick="rejectReseller('${d.id}')">Tolak</button><button class="btn btn-danger btn-sm" onclick="deletePendingReseller('${d.id}', this)">Hapus</button></td></tr>`;
            verificationTableBody.innerHTML += row;
        });
    }, e => { verificationTableBody.innerHTML = `<tr><td colspan="5" class="text-danger">Gagal: ${e.message}</td></tr>`; });
}
async function approveReseller(uid, amount) {
    if (!confirm(`Setujui pendaftaran dan tambah saldo ${formatRupiah(amount)}?`)) return;
    try {
        await dbFS.collection('resellers').doc(uid).update({ status: 'active', saldo: firebase.firestore.FieldValue.increment(amount), approvedAt: new Date() });
        showToast('Pendaftaran disetujui!', 'success');
    } catch (e) { showToast('Gagal: ' + e.message, 'danger'); }
}
async function rejectReseller(uid) {
    if (!confirm('Tolak pendaftaran ini?')) return;
    try {
        await dbFS.collection('resellers').doc(uid).update({ status: 'rejected', rejectionReason: 'Ditolak oleh admin', rejectedAt: new Date() });
        showToast('Pendaftaran ditolak.', 'warning');
    } catch (e) { showToast('Gagal: ' + e.message, 'danger'); }
}
async function deletePendingReseller(uid, btn) {
    if (confirm('Hapus pendaftaran ini?')) {
        setButtonLoading(btn, true);
        try {
            await dbFS.collection('resellers').doc(uid).delete();
            showToast('Permintaan pendaftaran dihapus.', 'warning');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}

// =================================== TOP UP (Firestore) ===================================
const topupTableBody = document.querySelector('#topup-table tbody');
function loadTopupConfirmations() {
    if (!topupTableBody) return;
    dbFS.collection('konfirmasiTopup').orderBy('created_at', 'desc').onSnapshot(s => {
        topupTableBody.innerHTML = '';
        if (s.empty) { topupTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Belum ada permintaan top up.</td></tr>'; return;}
        s.forEach(d => {
            const k = { id: d.id, ...d.data() };
            const r = topupTableBody.insertRow();
            const statusClass = `status-${k.status.replace(/ /g, '-')}`;
            r.innerHTML = `<td><code>${k.id.substring(0,6)}...</code></td><td>${k.reseller_email}</td><td>${formatRupiah(k.nominal)}</td><td><a href="${k.bukti_url}" target="_blank" class="btn btn-sm btn-info">Lihat</a></td><td><span class="status-badge ${statusClass}">${k.status}</span></td><td>${k.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="approveTopup('${k.id}', '${k.reseller_uid}', ${k.nominal}, this)">Setujui</button><button class="btn btn-danger btn-sm" onclick="rejectTopup('${k.id}', this)">Tolak</button>`: ''}<button class="btn btn-outline-danger btn-sm ms-1" onclick="deleteTopupConfirmation('${k.id}', this)">Hapus</button></td>`;
        });
    }, e => { topupTableBody.innerHTML = `<tr><td colspan="6" class="text-danger">Gagal memuat top up: ${e.message}</td></tr>`; });
}
async function approveTopup(id, uid, nominal, btn) {
    setButtonLoading(btn, true);
    try {
        await dbFS.runTransaction(async (transaction) => {
            const resellerRef = dbFS.collection('resellers').doc(uid);
            const topupRef = dbFS.collection('konfirmasiTopup').doc(id);
            const resellerDoc = await transaction.get(resellerRef);
            if (!resellerDoc.exists) throw new Error("Data reseller tidak ditemukan.");
            transaction.update(resellerRef, { saldo: firebase.firestore.FieldValue.increment(nominal) });
            transaction.update(topupRef, { status: 'disetujui', confirmed_at: new Date() });
        });
        showToast('Top up berhasil disetujui!', 'success');
    } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
}
async function rejectTopup(id, btn) {
    if (confirm('Tolak permintaan top up ini?')) {
        setButtonLoading(btn, true);
        try {
            await dbFS.collection('konfirmasiTopup').doc(id).update({ status: 'ditolak', rejected_at: new Date() });
            showToast('Permintaan top up ditolak.', 'warning');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}
async function deleteTopupConfirmation(id, btn) {
    if (confirm('Hapus riwayat top up ini?')) {
        setButtonLoading(btn, true);
        try {
            await dbFS.collection('konfirmasiTopup').doc(id).delete();
            showToast('Riwayat top up dihapus.', 'warning');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}

// =================================== PESANAN (Firestore) ===================================
const ordersTableBody = document.querySelector('#orders-table-body');
const orderFilter = document.getElementById('order-filter');
let allOrdersData = [];
function loadOrders() {
    if (!ordersTableBody) return;
    Promise.all([
        dbFS.collection('pesananUmum').orderBy('waktu', 'desc').get(),
        dbFS.collection('pesananReseller').orderBy('waktu', 'desc').get(),
        dbFS.collection('pesananApi').orderBy('waktu', 'desc').get()
    ]).then(([umumSnapshot, resellerSnapshot, apiSnapshot]) => {
        let combinedOrders = [];
        umumSnapshot.forEach(doc => combinedOrders.push({ id: doc.id, ...doc.data(), type: 'umum' }));
        resellerSnapshot.forEach(doc => combinedOrders.push({ id: doc.id, ...doc.data(), type: 'reseller' }));
        apiSnapshot.forEach(doc => combinedOrders.push({ id: doc.id, ...doc.data(), type: 'api' }));
        allOrdersData = combinedOrders.sort((a, b) => (b.waktu?.toDate()?.getTime() || 0) - (a.waktu?.toDate()?.getTime() || 0));
        renderOrders(allOrdersData);
    }).catch(e => { ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-danger">Gagal memuat pesanan: ${e.message}</td></tr>`; });
}
function renderOrders(orders) {
    if (!ordersTableBody) return;
    const filterValue = orderFilter ? orderFilter.value : 'all';
    const filteredOrders = orders.filter(order => filterValue === 'all' || order.type === filterValue);
    ordersTableBody.innerHTML = '';
    if (filteredOrders.length === 0) { ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-center">Belum ada pesanan.</td></tr>`; return; }
    filteredOrders.forEach(order => {
        const statusClass = `status-${(order.status || '').toLowerCase().replace(/ /g, '-')}`;
        const customerName = order.nama_pelanggan || order.reseller_email || order.nama || 'N/A';
        const price = order.type === 'reseller' ? order.harga_beli : order.harga_final;
        const typeBadge = { 'reseller': 'R', 'api': 'API', 'umum': 'U' };
        const typeColor = { 'reseller': 'primary', 'api': 'info', 'umum': 'secondary' };
        const row = ordersTableBody.insertRow();
        row.innerHTML = `<td><code>${order.id}</code> <button class="btn btn-secondary btn-sm py-0 px-1" onclick="copyToClipboard('${order.id}', this)">Salin</button></td><td>${order.produk}</td><td><span class="badge bg-${typeColor[order.type]}">${typeBadge[order.type]}</span> ${customerName}</td><td>${formatRupiah(price)}</td><td><span class="status-badge ${statusClass}">${order.status}</span></td><td><a href="detail-pesanan.html?id=${order.id}&type=${order.type}" class="btn btn-sm btn-primary">Kelola</a><button class="btn btn-sm btn-danger" onclick="deleteOrder('${order.id}', '${order.type}', this)">Hapus</button></td>`;
    });
}
if(orderFilter) { orderFilter.addEventListener('change', () => renderOrders(allOrdersData)); }
async function deleteOrder(id, type, btn) {
    if (confirm('Hapus pesanan ini?')) {
        setButtonLoading(btn, true);
        const collectionName = type === 'reseller' ? 'pesananReseller' : (type === 'api' ? 'pesananApi' : 'pesananUmum');
        try {
            await dbFS.collection(collectionName).doc(id).delete();
            showToast('Pesanan dihapus.', 'warning');
            loadOrders();
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}

// =================================== TESTIMONI (Realtime Database) ===================================
const testimonialsTableBody = document.querySelector('#testimonials-table tbody');
const testimonialForm = document.getElementById('testimonial-form');
const cancelTestimonialEditBtn = document.getElementById('cancel-testimonial-edit-btn');
let currentTestimonialId = null;
function loadTestimonials() {
    if (!testimonialsTableBody) return;
    dbRT.ref('testimonials').on('value', s => {
        testimonialsTableBody.innerHTML = '';
        if (!s.exists()) { testimonialsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada testimoni.</td></tr>'; return; }
        s.forEach(cs => {
            const t = { id: cs.key, ...cs.val() };
            const r = testimonialsTableBody.insertRow();
            const statusClass = `status-${t.status}`;
            r.innerHTML = `<td>${t.nama}</td><td>${t.isi}</td><td><span class="status-badge ${statusClass}">${t.status}</span></td><td>${t.status !== 'disetujui' ? `<button class="btn btn-success btn-sm" onclick="approveTestimonial('${t.id}', this)">Setujui</button>` : ''}<button class="btn btn-warning btn-sm" onclick="editTestimonial('${t.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteTestimonial('${t.id}', this)">Hapus</button></td>`;
        });
    });
}
if(testimonialForm){
    testimonialForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        setButtonLoading(btn, true);
        const data = { nama: document.getElementById('testimonial-nama').value, isi: document.getElementById('testimonial-isi').value, status: 'pending' };
        const promise = currentTestimonialId ? dbRT.ref('testimonials/' + currentTestimonialId).update(data) : dbRT.ref('testimonials').push(data);
        promise.then(() => {
            showToast('Testimoni disimpan!', 'success');
            testimonialForm.reset(); currentTestimonialId = null;
            if(cancelTestimonialEditBtn) cancelTestimonialEditBtn.style.display = 'none';
        }).catch(err => { showToast('Gagal: ' + err.message, 'danger'); }).finally(() => { setButtonLoading(btn, false); });
    });
}
if(cancelTestimonialEditBtn){
    cancelTestimonialEditBtn.addEventListener('click', () => {
        if(testimonialForm) testimonialForm.reset();
        currentTestimonialId = null;
        cancelTestimonialEditBtn.style.display = 'none';
    });
}
function editTestimonial(id) {
    dbRT.ref('testimonials/' + id).once('value', s => {
        if(s.exists()){
            const item = s.val();
            document.getElementById('testimonial-nama').value = item.nama;
            document.getElementById('testimonial-isi').value = item.isi;
            currentTestimonialId = id;
            if(testimonialForm) testimonialForm.scrollIntoView({ behavior: 'smooth' });
        }
    });
}
async function approveTestimonial(id, btn) {
    setButtonLoading(btn, true);
    try {
        await dbRT.ref('testimonials/' + id).update({ status: 'disetujui' });
        showToast('Testimoni disetujui!', 'success');
    } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
}
async function deleteTestimonial(id, btn) {
    if (confirm('Hapus testimoni ini?')) {
        setButtonLoading(btn, true);
        try {
            await dbRT.ref('testimonials/' + id).remove();
            showToast('Testimoni dihapus.', 'warning');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}

// =================================== FAQ (Realtime Database) ===================================
const faqForm = document.getElementById('faq-form');
const faqTableBody = document.querySelector('#faq-table tbody');
let currentFaqId = null;
function loadFaq() {
    if (!faqTableBody) return;
    dbRT.ref('faq').on('value', s => {
        faqTableBody.innerHTML = '';
        if (!s.exists()) { faqTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Belum ada FAQ.</td></tr>'; return; }
        s.forEach((cs) => {
            const item = cs.val();
            const row = faqTableBody.insertRow();
            row.innerHTML = `<td>${item.q}</td><td>${item.a}</td><td><button class="btn btn-warning btn-sm" onclick="editFaq('${cs.key}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteFaq('${cs.key}', this)">Hapus</button></td>`;
        });
    });
}
if(faqForm){
    faqForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        setButtonLoading(btn, true);
        const data = { q: document.getElementById('faq_q').value, a: document.getElementById('faq_a').value };
        const promise = currentFaqId ? dbRT.ref('faq/' + currentFaqId).update(data) : dbRT.ref('faq').push(data);
        promise.then(() => {
            showToast('FAQ disimpan!', 'success');
            faqForm.reset(); currentFaqId = null;
        }).catch(err => { showToast('Gagal: ' + err.message, 'danger'); }).finally(() => { setButtonLoading(btn, false); });
    });
}
function editFaq(id) {
    dbRT.ref('faq/' + id).once('value', s => {
        if(s.exists()){
            const item = s.val();
            document.getElementById('faq_q').value = item.q;
            document.getElementById('faq_a').value = item.a;
            currentFaqId = id;
            if(faqForm) faqForm.scrollIntoView({ behavior: 'smooth' });
        }
    });
}
async function deleteFaq(id, btn) {
    if (confirm('Hapus FAQ ini?')) {
        setButtonLoading(btn, true);
        try {
            await dbRT.ref('faq/' + id).remove();
            showToast('FAQ dihapus.', 'warning');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}

// =================================== PEMBAYARAN (Firestore) ===================================
const paymentForm = document.getElementById('payment-form');
const paymentsTableBody = document.querySelector('#payments-table tbody');
let currentPaymentId = null;
function loadPaymentMethods() {
    if (!paymentsTableBody) return;
    dbFS.collection('infoPembayaran').get().then(s => {
        paymentsTableBody.innerHTML = '';
        if (s.empty) { paymentsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada info pembayaran.</td></tr>'; }
        s.forEach(d => {
            const p = { id: d.id, ...d.data() };
            const r = paymentsTableBody.insertRow();
            r.innerHTML = `<td>${p.metode}</td><td>${p.nomor}</td><td>${p.atas_nama}</td><td><button class="btn btn-warning btn-sm" onclick="editPayment('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deletePayment('${p.id}', this)">Hapus</button></td>`;
        });
    });
}
if(paymentForm){
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        setButtonLoading(btn, true);
        const data = { metode: document.getElementById('payment_metode').value, nomor: document.getElementById('payment_nomor').value, atas_nama: document.getElementById('payment_an').value };
        const promise = currentPaymentId ? dbFS.collection('infoPembayaran').doc(currentPaymentId).update(data) : dbFS.collection('infoPembayaran').add(data);
        promise.then(() => {
            showToast('Info pembayaran disimpan!', 'success');
            paymentForm.reset(); currentPaymentId = null;
            loadPaymentMethods();
        }).catch(err => { showToast('Gagal: ' + err.message, 'danger'); }).finally(() => { setButtonLoading(btn, false); });
    });
}
function editPayment(id) {
    dbFS.collection('infoPembayaran').doc(id).get().then(d => {
        if (d.exists) {
            const p = d.data();
            document.getElementById('payment_metode').value = p.metode;
            document.getElementById('payment_nomor').value = p.nomor;
            document.getElementById('payment_an').value = p.atas_nama;
            currentPaymentId = id;
            if(paymentForm) paymentForm.scrollIntoView({ behavior: 'smooth' });
        }
    });
}
async function deletePayment(id, btn) {
    if (confirm('Hapus info pembayaran ini?')) {
        setButtonLoading(btn, true);
        try {
            await dbFS.collection('infoPembayaran').doc(id).delete();
            showToast('Info pembayaran dihapus.', 'warning');
            loadPaymentMethods();
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}

// =================================== KLAIM HADIAH BUYER (Firestore) ===================================
const giftClaimsTableBody = document.querySelector('#gift-claims-table tbody');
function loadGiftClaims() {
    if (!giftClaimsTableBody) return;
    dbFS.collection('klaimHadiahBuyer').orderBy('waktuKlaim', 'desc').onSnapshot(s => {
        giftClaimsTableBody.innerHTML = '';
        if (s.empty) { giftClaimsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada klaim hadiah.</td></tr>'; return; }
        s.forEach(d => {
            const claim = { id: d.id, ...d.data() };
            const row = giftClaimsTableBody.insertRow();
            const waktuKlaim = claim.waktuKlaim?.toDate ? claim.waktuKlaim.toDate().toLocaleString() : 'N/A';
            const statusClass = `status-${(claim.status || '').toLowerCase().replace(/ /g, '-')}`;
            row.innerHTML = `<td>${claim.email || claim.userId}</td><td>${waktuKlaim}</td><td><span class="status-badge ${statusClass}">${claim.status}</span></td><td>${claim.buktiUrl ? `<a href="${claim.buktiUrl}" target="_blank" class="btn btn-sm btn-info">Lihat Bukti</a>` : 'Belum Unggah'}</td><td>${claim.status === 'menunggu-verifikasi' ? `<button class="btn btn-success btn-sm" onclick="approveGiftClaim('${claim.id}', this)">Setujui</button><button class="btn btn-danger btn-sm" onclick="rejectGiftClaim('${claim.id}', this)">Tolak</button>` : ''}<button class="btn btn-outline-danger btn-sm ms-1" onclick="deleteGiftClaim('${claim.id}', this)">Hapus</button></td>`;
        });
    }, e => { giftClaimsTableBody.innerHTML = `<tr><td colspan="5" class="text-danger">Gagal memuat klaim: ${e.message}</td></tr>`; });
}
async function approveGiftClaim(id, btn) {
    if (confirm('Setujui klaim hadiah ini?')) {
        setButtonLoading(btn, true);
        try {
            await dbFS.collection('klaimHadiahBuyer').doc(id).update({ status: 'disetujui', waktuDisetujui: firebase.firestore.FieldValue.serverTimestamp() });
            showToast('Klaim hadiah disetujui!', 'success');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}
async function rejectGiftClaim(id, btn) {
    if (confirm('Tolak klaim hadiah ini?')) {
        const reason = prompt("Alasan penolakan (opsional):");
        setButtonLoading(btn, true);
        try {
            await dbFS.collection('klaimHadiahBuyer').doc(id).update({ status: 'ditolak', alasanDitolak: reason, waktuDitolak: firebase.firestore.FieldValue.serverTimestamp() });
            showToast('Klaim hadiah ditolak.', 'warning');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}
async function deleteGiftClaim(id, btn) {
    if (confirm('Hapus klaim hadiah ini?')) {
        setButtonLoading(btn, true);
        try {
            const claimDoc = await dbFS.collection('klaimHadiahBuyer').doc(id).get();
            if (claimDoc.exists && claimDoc.data().buktiUrl) {
                try {
                    const storageRef = storage.refFromURL(claimDoc.data().buktiUrl);
                    await storageRef.delete();
                } catch (storageError) { console.warn("Gagal hapus dari Storage:", storageError.message); }
            }
            await dbFS.collection('klaimHadiahBuyer').doc(id).delete();
            showToast('Klaim hadiah dihapus.', 'warning');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
}

// =================================== BANNER (Firestore) ===================================
const bannerForm = document.getElementById('banner-form');
const bannersTableBody = document.querySelector('#banners-table tbody');
const cancelBannerEditBtn = document.getElementById('cancel-banner-edit-btn');
let currentBannerId = null;
function loadBanners() {
    if(!bannersTableBody) return;
    dbFS.collection('banners').orderBy('urutan').get().then(s => {
        bannersTableBody.innerHTML = '';
        if (s.empty) { bannersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada banner.</td></tr>'; }
        s.forEach(d => {
            const b = { id: d.id, ...d.data() };
            const r = bannersTableBody.insertRow();
            r.innerHTML = `<td>${b.urutan}</td><td><a href="${b.url}" target="_blank">Lihat Gambar</a></td><td>${b.link || '-'}</td><td><button class="btn btn-warning btn-sm" onclick="editBanner('${b.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteBanner('${b.id}', this)">Hapus</button></td>`;
        });
    }).catch(e => { bannersTableBody.innerHTML = `<tr><td colspan="4" class="text-danger">Gagal memuat banner: ${e.message}</td></tr>`; });
}
if(bannerForm){
    bannerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        setButtonLoading(btn, true);
        const data = {
            url: document.getElementById('banner_url').value,
            link: document.getElementById('banner_link').value,
            urutan: parseInt(document.getElementById('banner_urutan').value) || 0,
        };
        try {
            if (currentBannerId) {
                await dbFS.collection('banners').doc(currentBannerId).update(data);
                showToast('Banner diperbarui!', 'success');
            } else {
                await dbFS.collection('banners').add(data);
                showToast('Banner ditambahkan!', 'success');
            }
            bannerForm.reset();
            if(cancelBannerEditBtn) cancelBannerEditBtn.style.display = 'none';
            currentBannerId = null;
            loadBanners();
        } catch (err) {
            showToast('Gagal menyimpan banner: ' + err.message, 'danger');
        } finally {
            setButtonLoading(btn, false);
        }
    });
}
if(cancelBannerEditBtn){
    cancelBannerEditBtn.addEventListener('click', () => {
        if(bannerForm) bannerForm.reset();
        cancelBannerEditBtn.style.display = 'none';
        currentBannerId = null;
    });
}
async function editBanner(id) {
    const doc = await dbFS.collection('banners').doc(id).get();
    if (doc.exists) {
        const b = doc.data();
        currentBannerId = id;
        document.getElementById('banner_url').value = b.url;
        document.getElementById('banner_link').value = b.link;
        document.getElementById('banner_urutan').value = b.urutan;
        if(cancelBannerEditBtn) cancelBannerEditBtn.style.display = 'block';
        if(bannerForm) bannerForm.scrollIntoView({ behavior: 'smooth' });
    }
}
async function deleteBanner(id, btn) {
    if (confirm('Hapus banner ini?')) {
        setButtonLoading(btn, true);
        try {
            await dbFS.collection('banners').doc(id).delete();
            loadBanners();
            showToast('Banner dihapus!', 'warning');
        } catch (e) {
            showToast('Gagal: ' + e.message, 'danger');
        } finally {
            setButtonLoading(btn, false);
        }
    }
}

// =================================== KODE KUSTOM (Realtime Database) ===================================
const addFeatureForm = document.getElementById('add-feature-form');
const customFeaturesListContainer = document.getElementById('custom-features-list');
function renderCustomFeatures(features) {
    if(!customFeaturesListContainer) return;
    customFeaturesListContainer.innerHTML = '';
    if (!features) { customFeaturesListContainer.innerHTML = '<p class="text-muted">Belum ada fitur kustom.</p>'; return; }
    Object.keys(features).forEach(featureId => {
        const feature = features[featureId];
        const featureCard = document.createElement('div');
        featureCard.className = 'd-flex justify-content-between align-items-center p-3 mb-2 border rounded';
        featureCard.innerHTML = `<div><strong style="color: var(--primary);">${feature.name}</strong><small class="d-block text-muted">HTML: ${feature.htmlCode ? '✓' : '✗'} | CSS: ${feature.cssCode ? '✓' : '✗'} | JS: ${feature.jsCode ? '✓' : '✗'}</small></div><button class="btn btn-danger btn-sm" onclick="deleteCustomFeature('${featureId}')">Hapus</button>`;
        customFeaturesListContainer.appendChild(featureCard);
    });
}
function loadCustomFeatures() {
    if(!customFeaturesListContainer) return;
    dbRT.ref('customFeatures').on('value', snapshot => { renderCustomFeatures(snapshot.val()); }, 
    error => {
        console.error("Gagal memuat fitur kustom:", error);
        customFeaturesListContainer.innerHTML = '<p class="text-danger">Gagal memuat data.</p>';
    });
}
if(addFeatureForm){
    addFeatureForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const featureName = document.getElementById('feature-name').value;
        const newFeatureData = { name: featureName, htmlCode: document.getElementById('feature-html').value, cssCode: document.getElementById('feature-css').value, jsCode: document.getElementById('feature-js').value };
        dbRT.ref('customFeatures').push(newFeatureData).then(() => {
            showToast(`Fitur "${featureName}" ditambahkan!`, 'success');
            addFeatureForm.reset();
        }).catch(error => { showToast('Gagal: ' + error.message, 'danger'); });
    });
}
window.deleteCustomFeature = function(featureId) {
    if (confirm('Yakin hapus fitur ini?')) {
        dbRT.ref('customFeatures/' + featureId).remove()
            .then(() => { showToast('Fitur dihapus.', 'warning'); })
            .catch(error => { showToast('Gagal: ' + error.message, 'danger'); });
    }
}

// =================================== PRODUK API JAGOAN PEDIA ===================================
const JAGOAN_PEDIA_API_ADMIN_ENDPOINT = 'https://4ca872c1-c2d0-4c55-a17b-db97b0ba9c9b-00-1mexijqem27fy.pike.replit.dev/';
const syncApiProductsBtn = document.getElementById('sync-api-products-btn');
const apiSyncStatusDiv = document.getElementById('api-sync-status');
const apiProductsTableBody = document.querySelector('#api-products-table tbody');
async function callAdminApi(action, data = {}) {
    try {
        const response = await fetch(JAGOAN_PEDIA_API_ADMIN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });
        return await response.json();
    } catch (error) {
        console.error('API Admin Error:', error);
        return { success: false, message: 'Error: ' + error.toString() };
    }
}
function loadJagoanPediaProducts() {
    if(!apiProductsTableBody) return;
    dbFS.collection('jagoanPediaManagedProducts').orderBy('jp_name').onSnapshot(s => {
        apiProductsTableBody.innerHTML = '';
        if (s.empty) { apiProductsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada produk API.</td></tr>'; return; }
        s.forEach(d => {
            const p = { id: d.id, ...d.data() };
            const priceAdjustment = parseFloat(p.price_adjustment || 0);
            let finalPrice = parseFloat(p.jp_price || 0) + priceAdjustment;
            finalPrice = Math.max(0, finalPrice);
            const statusJpClass = `status-${(p.jp_status || '').toLowerCase().replace(/ /g, '-')}`;
            const r = apiProductsTableBody.insertRow();
            r.innerHTML = `<td>${p.jp_name}</td><td>${p.jp_category || '-'}</td><td>${formatRupiah(p.jp_price)}</td><td><input type="number" class="form-control form-control-sm" value="${priceAdjustment}" onchange="updateJagoanPediaPriceAdjustment('${p.id}', this.value)" placeholder="500 or -500"></td><td>${formatRupiah(finalPrice)}</td><td><span class="status-badge ${statusJpClass}">${p.jp_status || 'Unknown'}</span></td><td><label class="switch"><input type="checkbox" ${p.is_active_on_site ? 'checked' : ''} onchange="updateJagoanPediaProductStatus('${p.id}', this.checked, this)"><span class="slider round"></span></label></td><td><button class="btn btn-danger btn-sm" onclick="deleteJagoanPediaProduct('${p.id}', this)">Hapus</button></td>`;
        });
    }, e => { apiProductsTableBody.innerHTML = `<tr><td colspan="8" class="text-danger">Gagal memuat produk API: ${e.message}</td></tr>`; });
}
if (syncApiProductsBtn) {
    syncApiProductsBtn.addEventListener('click', async () => {
        setButtonLoading(syncApiProductsBtn, true);
        if(apiSyncStatusDiv) apiSyncStatusDiv.style.display = 'none';
        const response = await callAdminApi('sync_jagoanpedia_products');
        if(apiSyncStatusDiv){
            apiSyncStatusDiv.textContent = response.success ? response.message : `Gagal: ${response.message}`;
            apiSyncStatusDiv.className = `alert ${response.success ? 'alert-success' : 'alert-danger'}`;
            apiSyncStatusDiv.style.display = 'block';
        }
        setButtonLoading(syncApiProductsBtn, false);
    });
}
window.updateJagoanPediaProductStatus = async function(id, isActive, element) {
    try {
        await dbFS.collection('jagoanPediaManagedProducts').doc(id).update({ is_active_on_site: isActive });
        showToast(`Produk ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
    } catch (e) {
        showToast('Gagal: ' + e.message, 'danger');
        element.checked = !isActive;
    }
}
window.updateJagoanPediaPriceAdjustment = async function(id, value) {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) { showToast('Nilai harus angka.', 'danger'); return; }
    try {
        await dbFS.collection('jagoanPediaManagedProducts').doc(id).update({ price_adjustment: numericValue });
        showToast('Harga diperbarui!', 'success');
    } catch (e) { showToast('Gagal: ' + e.message, 'danger'); }
}
window.deleteJagoanPediaProduct = async function(id, btn) {
    if (confirm('Hapus produk ini dari daftar kelola?')) {
        setButtonLoading(btn, true);
        try {
            await dbFS.collection('jagoanPediaManagedProducts').doc(id).delete();
            showToast('Produk dihapus dari daftar.', 'warning');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
    }
                          }
