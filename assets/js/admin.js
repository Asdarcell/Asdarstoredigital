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
    if (!user) {
        window.location.href = "loginadmin.html";
    }
});

// Fungsi logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = "loginadmin.html";
        });
    });
}

// Fungsi format Rupiah
const formatRupiah = (angka) => `Rp${(angka || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

// Fungsi menampilkan Toast Notifikasi
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

// Fungsi loading button
function setButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.innerHTML;
        }
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
//  MANAJEMEN TABS & EVENT LISTENERS
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Memuat data untuk tab yang aktif pertama kali
    loadProducts();
    
    // Menyiapkan semua event listener
    setupEventListeners();
});

function setupEventListeners() {
    // Listener untuk tab
    const tabSelectors = {
        'products-tab': loadProducts,
        'sort-products-tab': loadProductsToSort,
        'sort-categories-tab': loadCategoriesAndSetupSort,
        // Tambahkan fungsi load untuk tab lain di sini jika ada
    };

    for (const [tabId, loadFunction] of Object.entries(tabSelectors)) {
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.addEventListener('click', loadFunction);
        }
    }

    // Listener untuk form
    const productForm = document.getElementById('product-form');
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);

    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) addCategoryForm.addEventListener('submit', handleAddCategory);

    // Listener untuk tombol
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetProductForm);

    const saveProductOrderBtn = document.getElementById('save-product-order-btn');
    if (saveProductOrderBtn) saveProductOrderBtn.addEventListener('click', saveNewProductOrder);
}

// =================================== PRODUK (Firestore) ===================================
let currentProductId = null;

function loadProducts() {
    const productsTableBody = document.querySelector('#products-table tbody');
    if (!productsTableBody) return;
    dbFS.collection('produk').orderBy('urutan', 'asc').get()
        .then(snapshot => {
            productsTableBody.innerHTML = '';
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
        urutan: parseInt(document.getElementById('urutan').value)
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
            categoryListBody.innerHTML = '<tr><td colspan="2">Belum ada kategori. Tambahkan di bawah.</td></tr>';
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

        // Hancurkan instance Sortable lama jika ada, lalu buat yang baru
        if (categorySortable) {
            categorySortable.destroy();
        }
        categorySortable = new Sortable(categoryListBody, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => saveNewCategoryOrder() // Simpan otomatis saat selesai digeser
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
        loadCategoriesAndSetupSort(); // Muat ulang daftar
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
        // Muat ulang daftar untuk menampilkan nomor urutan yang baru
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
