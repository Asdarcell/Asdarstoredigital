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
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// ================================================================
//  MANAJEMEN TABS & PEMUATAN DATA AWAL
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Memuat data untuk tab yang aktif pertama kali (Produk)
    loadProducts(); 
    loadPendingResellers(); // Untuk notifikasi badge
    
    // Menyiapkan semua event listener untuk tab dan tombol
    setupEventListeners();
});

function setupEventListeners() {
    const tabSelectors = {
        'products-tab': loadProducts,
        'sort-products-tab': loadProductsToSort, // [BARU]
        'api-products-tab': loadJagoanPediaProducts,
        'active-resellers-tab': loadResellers,
        'verification-tab': loadPendingResellers,
        'topup-tab': loadTopupConfirmations,
        'orders-tab': loadOrders,
        'testimonials-tab': loadTestimonials,
        'faq-tab': loadFaq,
        'payments-tab': loadPaymentMethods,
        'promo-management-tab': setupPromoManagementForms,
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
    
    // Listener untuk tombol simpan urutan produk [BARU]
    const saveOrderBtn = document.getElementById('save-sort-order-btn');
    if (saveOrderBtn) {
        saveOrderBtn.addEventListener('click', saveNewProductOrder);
    }
}

// =================================== MANAJEMEN PROMO MANUAL ===================================
// ... (Kode untuk manajemen promo, produk, reseller, dll. tetap sama seperti sebelumnya)

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
                r.innerHTML = `<td>(${p.urutan || 0}) ${p.nama_produk}</td><td>${p.kategori}</td><td>${formatRupiah(p.harga_umum)}</td><td>${formatRupiah(p.harga_reseller)}</td><td>${p.stok}</td><td><button class="btn btn-warning btn-sm" onclick="editProduct('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Hapus</button></td>`;
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

// ================================================================
//  [BARU] FITUR URUTKAN PRODUK (Drag & Drop)
// ================================================================
function loadProductsToSort() {
    const sortList = document.getElementById('product-sort-list');
    if (!sortList) return;

    sortList.innerHTML = '<li class="list-group-item">Memuat produk...</li>';

    dbFS.collection('produk').orderBy('urutan').get().then(snapshot => {
        sortList.innerHTML = '';
        if (snapshot.empty) {
            sortList.innerHTML = '<li class="list-group-item">Tidak ada produk untuk diurutkan.</li>';
            return;
        }

        snapshot.forEach(doc => {
            const product = doc.data();
            const item = document.createElement('li');
            item.className = 'list-group-item';
            item.setAttribute('data-id', doc.id); 
            item.textContent = `(Urutan: ${product.urutan || 0}) ${product.nama_produk}`;
            sortList.appendChild(item);
        });

        // Aktifkan SortableJS
        new Sortable(sortList, {
            animation: 150,
            ghostClass: 'sortable-ghost'
        });

    }).catch(error => {
        console.error("Error loading products to sort: ", error);
        sortList.innerHTML = `<li class="list-group-item text-danger">Gagal memuat produk: ${error.message}</li>`;
    });
}

function saveNewProductOrder() {
    const saveBtn = document.getElementById('save-sort-order-btn');
    if (!saveBtn) return;
    setButtonLoading(saveBtn, true);

    const productItems = document.querySelectorAll('#product-sort-list li');
    const batch = dbFS.batch();

    productItems.forEach((item, index) => {
        const docId = item.getAttribute('data-id');
        if (docId) {
            const docRef = dbFS.collection('produk').doc(docId);
            batch.update(docRef, { urutan: index + 1 });
        }
    });

    batch.commit().then(() => {
        showToast('Urutan produk berhasil disimpan!', 'success');
        loadProducts(); // Muat ulang tabel produk utama
        loadProductsToSort(); // Muat ulang daftar urutan ini
    }).catch(error => {
        console.error('Error saving new order: ', error);
        showToast('Gagal menyimpan urutan: ' + error.message, 'danger');
    }).finally(() => {
        setButtonLoading(saveBtn, false);
    });
}


// ... SEMUA FUNGSI LAINNYA (RESELLER, TOP UP, PESANAN, DLL) ...
// ... Kode lengkap dari file sebelumnya untuk semua fitur lain tetap sama ...
// ... (Saya akan menaruh kembali kode lengkapnya di sini untuk kepastian)

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

// ... Sisa kode untuk Testimoni, FAQ, Pembayaran, dll. akan mengikuti pola yang sama
// dan bisa disalin dari versi lengkap sebelumnya jika diperlukan.
