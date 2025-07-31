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

auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = "loginadmin.html"; }
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
    auth.signOut().then(() => { window.location.href = "loginadmin.html"; });
});

const formatRupiah = (angka) => `Rp${(angka || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

function showToast(message, type = 'success') {
    const toastElement = document.getElementById('liveToast');
    if (!toastElement) return;
    const toastBody = toastElement.querySelector('.toast-body');
    const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastElement);
    toastElement.className = 'toast align-items-center text-white border-0';
    toastElement.classList.add(type === 'danger' ? 'bg-danger' : `bg-${type}`);
    toastBody.textContent = message;
    toastBootstrap.show();
}

function setButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        if (!button.dataset.originalText) { button.dataset.originalText = button.innerHTML; }
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Memuat...';
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

// ================================================================
//  MANAJEMEN TABS & EVENT LISTENERS
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadPendingResellers(); 
    setupEventListeners();
});

function setupEventListeners() {
    const tabSelectors = {
        'products-tab': loadProducts,
        'sort-products-tab': loadProductsToSort,
        'sort-categories-tab': loadCategoriesAndSetupSort,
        'active-resellers-tab': loadResellers,
        'verification-tab': loadPendingResellers,
        'topup-tab': loadTopupConfirmations,
        'orders-tab': loadOrders,
        'testimonials-tab': loadTestimonials,
        'faq-tab': loadFaq,
        'payments-tab': loadPaymentMethods,
        'promo-management-tab': () => {}, // No load function needed for this static form
        'gift-claims-tab': loadGiftClaims,
        'banners-tab': loadBanners,
        'custom-code-tab': loadCustomFeatures,
    };
    for (const [tabId, loadFunction] of Object.entries(tabSelectors)) {
        const tabElement = document.getElementById(tabId);
        if (tabElement) { tabElement.addEventListener('click', loadFunction); }
    }

    document.getElementById('product-form')?.addEventListener('submit', handleProductSubmit);
    document.getElementById('add-category-form')?.addEventListener('submit', handleAddCategory);
    document.getElementById('testimonial-form')?.addEventListener('submit', handleTestimonialSubmit);
    document.getElementById('faq-form')?.addEventListener('submit', handleFaqSubmit);
    document.getElementById('payment-form')?.addEventListener('submit', handlePaymentSubmit);
    document.getElementById('banner-form')?.addEventListener('submit', handleBannerSubmit);
    document.getElementById('add-feature-form')?.addEventListener('submit', handleAddFeature);
    document.getElementById('grant-reseller-promo-form')?.addEventListener('submit', handleGrantResellerPromo);
    document.getElementById('grant-buyer-promo-form')?.addEventListener('submit', handleGrantBuyerPromo);
    document.getElementById('cancel-edit-btn')?.addEventListener('click', resetProductForm);
    document.getElementById('save-product-order-btn')?.addEventListener('click', saveNewProductOrder);
    document.getElementById('order-filter')?.addEventListener('change', () => renderOrders(allOrdersData));
}

// =================================== PRODUK (Firestore) ===================================
let currentProductId = null;

function loadProducts() {
    const tableBody = document.querySelector('#products-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Memuat produk...</td></tr>';
    dbFS.collection('produk').orderBy('urutan', 'asc').get().then(s => {
        tableBody.innerHTML = '';
        if (s.empty) { tableBody.innerHTML = '<tr><td colspan="6">Belum ada produk.</td></tr>'; return; }
        s.forEach(d => {
            const p = { id: d.id, ...d.data() };
            const r = tableBody.insertRow();
            r.innerHTML = `<td>(${p.urutan || 0}) ${p.nama_produk}</td><td>${p.kategori}</td><td>${formatRupiah(p.harga_umum)}</td><td>${formatRupiah(p.harga_reseller)}</td><td>${p.stok}</td><td><button class="btn btn-warning btn-sm" onclick="editProduct('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Hapus</button></td>`;
        });
    }).catch(e => { console.error("Gagal memuat produk:", e); tableBody.innerHTML = `<tr><td colspan="6" class="text-danger">Gagal memuat produk.</td></tr>`; });
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    setButtonLoading(btn, true);
    const data = {
        nama_produk: document.getElementById('nama_produk').value,
        kategori: document.getElementById('kategori').value,
        deskripsi: document.getElementById('deskripsi').value,
        harga_umum: parseInt(document.getElementById('harga_umum').value),
        harga_reseller: parseInt(document.getElementById('harga_reseller').value),
        stok: parseInt(document.getElementById('stok').value),
        urutan: parseInt(document.getElementById('urutan').value) || 0
    };
    try {
        if (currentProductId) {
            await dbFS.collection('produk').doc(currentProductId).update(data);
            showToast('Produk diperbarui!', 'success');
        } else {
            await dbFS.collection('produk').add(data);
            showToast('Produk ditambahkan!', 'success');
        }
        resetProductForm();
        loadProducts();
    } catch (err) { showToast('Gagal: ' + err.message, 'danger'); } finally { setButtonLoading(btn, false); }
}

function resetProductForm() {
    document.getElementById('product-form')?.reset();
    document.getElementById('cancel-edit-btn')?.style.setProperty('display', 'none');
    currentProductId = null;
}

async function editProduct(id) {
    const doc = await dbFS.collection('produk').doc(id).get();
    if (doc.exists) {
        const p = doc.data();
        currentProductId = id;
        document.getElementById('nama_produk').value = p.nama_produk;
        document.getElementById('kategori').value = p.kategori;
        document.getElementById('deskripsi').value = p.deskripsi;
        document.getElementById('harga_umum').value = p.harga_umum;
        document.getElementById('harga_reseller').value = p.harga_reseller;
        document.getElementById('stok').value = p.stok;
        document.getElementById('urutan').value = p.urutan || 0;
        document.getElementById('cancel-edit-btn')?.style.setProperty('display', 'block');
        document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteProduct(id) {
    if (confirm('Yakin ingin menghapus produk ini?')) {
        try {
            await dbFS.collection('produk').doc(id).delete();
            loadProducts();
            showToast('Produk dihapus!', 'warning');
        } catch (e) { showToast('Gagal: ' + e.message, 'danger');}
    }
}

// ================================================================
//  FITUR URUTKAN PRODUK (Drag & Drop)
// ================================================================
function loadProductsToSort() {
    const sortList = document.getElementById('product-sort-list');
    if (!sortList) return;
    sortList.innerHTML = '<li class="list-group-item">Memuat produk...</li>';
    dbFS.collection('produk').orderBy('urutan').get().then(snapshot => {
        sortList.innerHTML = '';
        if (snapshot.empty) { sortList.innerHTML = '<li class="list-group-item">Tidak ada produk.</li>'; return; }
        snapshot.forEach(doc => {
            const p = doc.data();
            const item = document.createElement('li');
            item.className = 'list-group-item';
            item.setAttribute('data-id', doc.id); 
            item.textContent = `(${p.urutan || 0}) ${p.nama_produk}`;
            sortList.appendChild(item);
        });
        new Sortable(sortList, { animation: 150, ghostClass: 'sortable-ghost' });
    }).catch(error => { console.error("Error loading products to sort: ", error); sortList.innerHTML = `<li class="list-group-item text-danger">Gagal memuat: ${error.message}</li>`; });
}

function saveNewProductOrder() {
    const saveBtn = document.getElementById('save-product-order-btn');
    if (!saveBtn) return;
    setButtonLoading(saveBtn, true);
    const items = document.querySelectorAll('#product-sort-list li');
    const batch = dbFS.batch();
    items.forEach((item, index) => {
        const docId = item.getAttribute('data-id');
        if (docId) { batch.update(dbFS.collection('produk').doc(docId), { urutan: index + 1 }); }
    });
    batch.commit().then(() => {
        showToast('Urutan produk disimpan!', 'success');
        loadProducts(); 
        loadProductsToSort();
    }).catch(error => { console.error('Error saving new product order: ', error); showToast('Gagal: ' + error.message, 'danger'); }).finally(() => { setButtonLoading(saveBtn, false); });
}

// ================================================================
//  FITUR MANAJEMEN & URUTKAN KATEGORI
// ================================================================
let categorySortable = null;

function loadCategoriesAndSetupSort() {
    const tableBody = document.getElementById('category-list-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="2">Memuat kategori...</td></tr>';
    dbFS.collection('kategori').orderBy('urutan').get().then(snapshot => {
        tableBody.innerHTML = '';
        if (snapshot.empty) { tableBody.innerHTML = '<tr><td colspan="2">Belum ada kategori.</td></tr>'; }
        snapshot.forEach(doc => {
            const cat = doc.data();
            const row = tableBody.insertRow();
            row.setAttribute('data-id', doc.id);
            row.innerHTML = `<td>(${cat.urutan || 0}) ${cat.nama}</td><td><button class="btn btn-danger btn-sm" onclick="deleteCategory('${doc.id}', '${cat.nama}')">Hapus</button></td>`;
        });
        if (categorySortable) { categorySortable.destroy(); }
        categorySortable = new Sortable(tableBody, { animation: 150, ghostClass: 'sortable-ghost', onEnd: saveNewCategoryOrder });
    }).catch(error => { console.error("Error loading categories:", error); tableBody.innerHTML = `<tr><td colspan="2" class="text-danger">Gagal: ${error.message}</td></tr>`; });
}

async function handleAddCategory(e) {
    e.preventDefault();
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    if (!name) return;
    const btn = e.target.querySelector('[type=submit]');
    setButtonLoading(btn, true);
    try {
        const snapshot = await dbFS.collection('kategori').get();
        const newOrder = snapshot.size + 1;
        await dbFS.collection('kategori').add({ nama: name, urutan: newOrder });
        showToast('Kategori ditambahkan!', 'success');
        input.value = '';
        loadCategoriesAndSetupSort();
    } catch (error) { showToast('Gagal: ' + error.message, 'danger'); } finally { setButtonLoading(btn, false); }
}

async function saveNewCategoryOrder() {
    const items = document.querySelectorAll('#category-list-body tr');
    const batch = dbFS.batch();
    items.forEach((row, index) => {
        const docId = row.getAttribute('data-id');
        if (docId) { batch.update(dbFS.collection('kategori').doc(docId), { urutan: index + 1 }); }
    });
    try {
        await batch.commit();
        showToast('Urutan kategori diperbarui!', 'success');
        loadCategoriesAndSetupSort();
    } catch (error) { console.error('Error saving new category order:', error); showToast('Gagal menyimpan urutan.', 'danger'); }
}

async function deleteCategory(id, name) {
    if (confirm(`Yakin ingin menghapus kategori "${name}"?`)) {
        try {
            await dbFS.collection('kategori').doc(id).delete();
            showToast('Kategori dihapus.', 'warning');
            loadCategoriesAndSetupSort();
        } catch (e) { showToast('Gagal: ' + e.message, 'danger'); }
    }
}

// =================================== RESELLER & VERIFIKASI ===================================
function loadResellers() { /* ... Kode lengkap Anda ... */ }
function loadPendingResellers() { /* ... Kode lengkap Anda ... */ }
// ... semua fungsi helper reseller ...

// =================================== TOP UP ===================================
function loadTopupConfirmations() { /* ... Kode lengkap Anda ... */ }
// ... semua fungsi helper topup ...

// =================================== PESANAN ===================================
let allOrdersData = [];
function loadOrders() { /* ... Kode lengkap Anda ... */ }
function renderOrders(orders) { /* ... Kode lengkap Anda ... */ }
// ... semua fungsi helper pesanan ...

// =================================== TESTIMONI ===================================
function loadTestimonials() { /* ... Kode lengkap Anda ... */ }
function handleTestimonialSubmit(e){ e.preventDefault(); /* ... */ }
// ... semua fungsi helper testimoni ...

// =================================== FAQ ===================================
function loadFaq() { /* ... Kode lengkap Anda ... */ }
function handleFaqSubmit(e) { e.preventDefault(); /* ... */ }
// ... semua fungsi helper FAQ ...

// ... dan seterusnya untuk semua modul/fitur Anda yang lain
