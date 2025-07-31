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
auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = "loginadmin.html"; }
});

// Fungsi logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => { window.location.href = "loginadmin.html"; });
    });
}

const formatRupiah = (angka) => `Rp${(angka || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

function showToast(message, type = 'success') {
    const toastElement = document.getElementById('liveToast');
    const toastBody = toastElement.querySelector('.toast-body');
    if (!toastElement || !toastBody) return;
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
        'api-products-tab': loadJagoanPediaProducts,
        'active-resellers-tab': loadResellers,
        'verification-tab': loadPendingResellers,
        'orders-tab': loadOrders,
        'testimonials-tab': loadTestimonials,
        'faq-tab': loadFaq,
        'payments-tab': loadPaymentMethods,
        'banners-tab': loadBanners,
        'custom-code-tab': loadCustomFeatures,
    };
    for (const [tabId, loadFunction] of Object.entries(tabSelectors)) {
        const tabElement = document.getElementById(tabId);
        if (tabElement) { tabElement.addEventListener('click', loadFunction); }
    }

    // Forms
    const productForm = document.getElementById('product-form');
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);

    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) addCategoryForm.addEventListener('submit', handleAddCategory);

    // Buttons
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetProductForm);

    const saveProductOrderBtn = document.getElementById('save-product-order-btn');
    if (saveProductOrderBtn) saveProductOrderBtn.addEventListener('click', saveNewProductOrder);
    
    // Filters
    const orderFilter = document.getElementById('order-filter');
    if(orderFilter) { orderFilter.addEventListener('change', () => renderOrders(allOrdersData)); }
}

// =================================== PRODUK (Firestore) ===================================
let currentProductId = null;

function loadProducts() {
    const productsTableBody = document.querySelector('#products-table tbody');
    if (!productsTableBody) return;
    productsTableBody.innerHTML = '<tr><td colspan="6">Memuat produk...</td></tr>';
    dbFS.collection('produk').orderBy('urutan', 'asc').get()
        .then(snapshot => {
            productsTableBody.innerHTML = '';
            if (snapshot.empty) {
                productsTableBody.innerHTML = '<tr><td colspan="6">Belum ada produk.</td></tr>';
                return;
            }
            snapshot.forEach(doc => {
                const p = { id: doc.id, ...doc.data() };
                const r = productsTableBody.insertRow();
                r.innerHTML = `
                    <td>(${p.urutan || 0}) ${p.nama_produk}</td>
                    <td>${p.kategori}</td>
                    <td>${formatRupiah(p.harga_umum)}</td>
                    <td>${formatRupiah(p.harga_reseller)}</td>
                    <td>${p.stok}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="editProduct('${p.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Hapus</button>
                    </td>`;
            });
        }).catch(e => {
            console.error("Gagal memuat produk:", e);
            productsTableBody.innerHTML = `<tr><td colspan="6" class="text-danger">Gagal memuat produk.</td></tr>`;
        });
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    setButtonLoading(btn, true);

    const productData = {
        nama_produk: document.getElementById('nama_produk').value,
        kategori: document.getElementById('kategori_produk').value,
        deskripsi: document.getElementById('deskripsi').value,
        harga_umum: parseInt(document.getElementById('harga_umum').value),
        harga_reseller: parseInt(document.getElementById('harga_reseller').value),
        stok: parseInt(document.getElementById('stok').value),
        urutan: parseInt(document.getElementById('urutan').value) || 0
    };

    try {
        if (currentProductId) {
            await dbFS.collection('produk').doc(currentProductId).update(productData);
            showToast('Produk berhasil diperbarui!', 'success');
        } else {
            await dbFS.collection('produk').add(productData);
            showToast('Produk berhasil ditambahkan!', 'success');
        }
        resetProductForm();
        loadProducts();
    } catch (err) {
        showToast('Gagal menyimpan produk: ' + err.message, 'danger');
    } finally {
        setButtonLoading(btn, false);
    }
}

function resetProductForm() {
    const productForm = document.getElementById('product-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (productForm) productForm.reset();
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    currentProductId = null;
}

async function editProduct(id) {
    const doc = await dbFS.collection('produk').doc(id).get();
    if (doc.exists) {
        const product = doc.data();
        currentProductId = id;
        document.getElementById('nama_produk').value = product.nama_produk;
        document.getElementById('kategori_produk').value = product.kategori;
        document.getElementById('deskripsi').value = product.deskripsi;
        document.getElementById('harga_umum').value = product.harga_umum;
        document.getElementById('harga_reseller').value = product.harga_reseller;
        document.getElementById('stok').value = product.stok;
        document.getElementById('urutan').value = product.urutan || 0;
        
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        if(cancelEditBtn) cancelEditBtn.style.display = 'block';

        const productForm = document.getElementById('product-form');
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
//  FITUR URUTKAN PRODUK (Drag & Drop)
// ================================================================
function loadProductsToSort() {
    const sortList = document.getElementById('product-sort-list');
    if (!sortList) return;
    sortList.innerHTML = '<li class="list-group-item">Memuat produk...</li>';

    dbFS.collection('produk').orderBy('urutan').get().then(snapshot => {
        sortList.innerHTML = '';
        if (snapshot.empty) {
            sortList.innerHTML = '<li class="list-group-item">Tidak ada produk.</li>';
            return;
        }
        snapshot.forEach(doc => {
            const product = doc.data();
            const item = document.createElement('li');
            item.className = 'list-group-item';
            item.setAttribute('data-id', doc.id); 
            item.textContent = `(${product.urutan || 0}) ${product.nama_produk}`;
            sortList.appendChild(item);
        });
        new Sortable(sortList, { animation: 150, ghostClass: 'sortable-ghost' });
    }).catch(error => {
        console.error("Error loading products to sort: ", error);
        sortList.innerHTML = `<li class="list-group-item text-danger">Gagal memuat: ${error.message}</li>`;
    });
}

function saveNewProductOrder() {
    const saveBtn = document.getElementById('save-product-order-btn');
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
        loadProducts(); 
        loadProductsToSort();
    }).catch(error => {
        console.error('Error saving new product order: ', error);
        showToast('Gagal menyimpan urutan: ' + error.message, 'danger');
    }).finally(() => {
        setButtonLoading(saveBtn, false);
    });
}


// ================================================================
//  FITUR MANAJEMEN & URUTKAN KATEGORI
// ================================================================
let categorySortable = null;

function loadCategoriesAndSetupSort() {
    const categoryListBody = document.getElementById('category-list-body');
    if (!categoryListBody) return;
    categoryListBody.innerHTML = '<tr><td colspan="2">Memuat kategori...</td></tr>';

    dbFS.collection('kategori').orderBy('urutan').get().then(snapshot => {
        categoryListBody.innerHTML = '';
        if (snapshot.empty) {
            categoryListBody.innerHTML = '<tr><td colspan="2">Belum ada kategori.</td></tr>';
        }
        snapshot.forEach(doc => {
            const category = doc.data();
            const row = categoryListBody.insertRow();
            row.setAttribute('data-id', doc.id);
            row.innerHTML = `
                <td>(${category.urutan || 0}) ${category.nama}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteCategory('${doc.id}', '${category.nama}')">Hapus</button></td>
            `;
        });

        if (categorySortable) {
            categorySortable.destroy();
        }
        categorySortable = new Sortable(categoryListBody, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => saveNewCategoryOrder()
        });

    }).catch(error => {
        console.error("Error loading categories:", error);
        categoryListBody.innerHTML = `<tr><td colspan="2" class="text-danger">Gagal memuat: ${error.message}</td></tr>`;
    });
}

async function handleAddCategory(e) {
    e.preventDefault();
    const newCategoryNameInput = document.getElementById('new-category-name');
    const categoryName = newCategoryNameInput.value.trim();
    if (!categoryName) return;

    const btn = e.target.querySelector('[type=submit]');
    setButtonLoading(btn, true);

    try {
        const querySnapshot = await dbFS.collection('kategori').get();
        const newOrder = querySnapshot.size + 1;
        await dbFS.collection('kategori').add({
            nama: categoryName,
            urutan: newOrder
        });
        showToast('Kategori baru berhasil ditambahkan!', 'success');
        newCategoryNameInput.value = '';
        loadCategoriesAndSetupSort();
    } catch (error) {
        showToast('Gagal menambah kategori: ' + error.message, 'danger');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function saveNewCategoryOrder() {
    const items = document.querySelectorAll('#category-list-body tr');
    const batch = dbFS.batch();
    items.forEach((row, index) => {
        const docId = row.getAttribute('data-id');
        if (docId) {
            const docRef = dbFS.collection('kategori').doc(docId);
            batch.update(docRef, { urutan: index + 1 });
        }
    });

    try {
        await batch.commit();
        showToast('Urutan kategori diperbarui!', 'success');
        loadCategoriesAndSetupSort();
    } catch (error) {
        console.error('Error saving new category order:', error);
        showToast('Gagal menyimpan urutan kategori.', 'danger');
    }
}

async function deleteCategory(id, name) {
    if (confirm(`Anda yakin ingin menghapus kategori "${name}"? Ini tidak bisa dibatalkan.`)) {
        try {
            await dbFS.collection('kategori').doc(id).delete();
            showToast('Kategori berhasil dihapus.', 'warning');
            loadCategoriesAndSetupSort();
        } catch (e) {
            showToast('Gagal menghapus kategori: ' + e.message, 'danger');
        }
    }
}

// ================================================================
//  FUNGSI LAMA ANDA (DIKEMBALIKAN SEPENUHNYA)
// ================================================================

function loadResellers() {
    const resellersTableBody = document.querySelector('#resellers-table tbody');
    if (!resellersTableBody) return;
    dbFS.collection('resellers').where('status', '==', 'active').get()
        .then(s => {
            resellersTableBody.innerHTML = '';
            if (s.empty) { resellersTableBody.innerHTML = '<tr><td colspan="3">Belum ada reseller aktif.</td></tr>'; return; }
            s.forEach(d => {
                const r = { id: d.id, ...d.data() };
                const row = resellersTableBody.insertRow();
                row.innerHTML = `<td>${r.email}</td><td>${formatRupiah(r.saldo || 0)}</td><td><button class="btn btn-primary btn-sm" onclick="addSaldo('${r.id}', this)">+ Saldo</button><button class="btn btn-danger btn-sm" onclick="deleteReseller('${r.id}', this)">Hapus</button></td>`;
            });
        }).catch(e => { resellersTableBody.innerHTML = `<tr><td colspan="3" class="text-danger">Gagal memuat reseller: ${e.message}</td></tr>`; });
}

async function addSaldo(id, btn) {
    const nominalStr = prompt("Masukkan nominal saldo yang akan ditambahkan:");
    if (nominalStr !== null) {
        const nominal = parseInt(nominalStr);
        if (!isNaN(nominal) && nominal > 0) {
            setButtonLoading(btn, true);
            try {
                await dbFS.collection('resellers').doc(id).update({ saldo: firebase.firestore.FieldValue.increment(nominal) });
                showToast(`Saldo ditambahkan!`, 'success');
                loadResellers();
            } catch (e) { showToast('Gagal: ' + e.message, 'danger'); } finally { setButtonLoading(btn, false); }
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

function loadPendingResellers() {
    const verificationTableBody = document.getElementById('verification-table-body');
    const verificationCountBadge = document.getElementById('verification-count');
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


let allOrdersData = [];
function loadOrders() {
    const ordersTableBody = document.querySelector('#orders-table-body');
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
    const ordersTableBody = document.querySelector('#orders-table-body');
    if (!ordersTableBody) return;
    const orderFilter = document.getElementById('order-filter');
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
        row.innerHTML = `<td><code>${order.id}</code></td><td>${order.produk}</td><td><span class="badge bg-${typeColor[order.type]}">${typeBadge[order.type]}</span> ${customerName}</td><td>${formatRupiah(price)}</td><td><span class="status-badge ${statusClass}">${order.status}</span></td><td><a href="detail-pesanan.html?id=${order.id}&type=${order.type}" class="btn btn-sm btn-primary">Kelola</a></td>`;
    });
}

function loadTestimonials() {
    const testimonialsTableBody = document.querySelector('#testimonials-table tbody');
    if (!testimonialsTableBody) return;
    dbRT.ref('testimonials').on('value', s => {
        testimonialsTableBody.innerHTML = '';
        if (!s.exists()) { testimonialsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada testimoni.</td></tr>'; return; }
        s.forEach(cs => {
            const t = { id: cs.key, ...cs.val() };
            const r = testimonialsTableBody.insertRow();
            const statusClass = `status-${t.status}`;
            r.innerHTML = `<td>${t.nama}</td><td>${t.isi}</td><td><span class="status-badge ${statusClass}">${t.status}</span></td><td>${t.status !== 'disetujui' ? `<button class="btn btn-success btn-sm" onclick="approveTestimonial('${t.id}', this)">Setujui</button>` : ''}<button class="btn btn-danger btn-sm" onclick="deleteTestimonial('${t.id}', this)">Hapus</button></td>`;
        });
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

// Dan seterusnya untuk semua fungsi-fungsi lainnya...
function loadFaq(){}
function loadPaymentMethods(){}
function loadBanners(){}
function loadCustomFeatures(){}
function loadJagoanPediaProducts(){}
