<?php
// Mengatur header agar browser tahu ini adalah JSON dan mengizinkan CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ini mengizinkan akses dari domain manapun (sesuaikan jika perlu untuk keamanan)

// --- Konfigurasi Firebase Anda ---
$firebaseApiKey = 'AIzaSyA_L6U3HKM1DnKuq_Q1zKFH4bk8GMAz210'; // API Key Anda dari admin.html
$firestoreProjectId = 'asdarstoredigitalll-d89c4'; // Project ID Firebase Anda

// Endpoint Firestore REST API untuk koleksi 'produk'
// Kita akan mengambil semua dokumen dari koleksi 'produk'
$url = "https://firestore.googleapis.com/v1beta1/projects/{$firestoreProjectId}/databases/(default)/documents/produk?key={$firebaseApiKey}";

// Inisialisasi cURL untuk membuat permintaan HTTP
$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, $url);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true); // Mengembalikan respons sebagai string
curl_setopt($curl, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
]);

// Eksekusi permintaan cURL
$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE); // Mendapatkan kode status HTTP
curl_close($curl); // Tutup sesi cURL

// Cek jika ada error pada cURL atau respons HTTP
if ($response === false) {
    echo json_encode(['success' => false, 'message' => 'Gagal terhubung ke Firebase. Pastikan ekstensi cURL PHP aktif.']);
    exit;
}

if ($httpCode != 200) {
    // Jika respons bukan 200 OK, berarti ada error dari Firebase
    $errorData = json_decode($response, true);
    echo json_encode(['success' => false, 'message' => 'Error Firebase API: ' . ($errorData['error']['message'] ?? 'Error tidak diketahui'), 'code' => $httpCode]);
    exit;
}

// Mengurai respons JSON dari Firebase
$data = json_decode($response, true);

$products = [];
// Cek apakah ada dokumen yang ditemukan
if (isset($data['documents']) && is_array($data['documents'])) {
    foreach ($data['documents'] as $doc) {
        $fields = $doc['fields']; // Mendapatkan field dari dokumen Firebase
        $productId = basename($doc['name']); // ID dokumen adalah ID produk kita

        // Memetakan data dari Firebase ke struktur yang diharapkan frontend Anda
        $productName = $fields['nama_produk']['stringValue'] ?? 'Nama Produk Tidak Diketahui';
        $category = $fields['kategori']['stringValue'] ?? 'Umum';
        $description = $fields['deskripsi']['stringValue'] ?? '';
        $priceGeneral = $fields['harga_umum']['integerValue'] ?? 0;
        $priceReseller = $fields['harga_reseller']['integerValue'] ?? 0;
        $stock = $fields['stok']['integerValue'] ?? 0;
        $order = $fields['urutan']['integerValue'] ?? 0;

        // Tangani data promo jika ada
        $promoEnabled = false;
        $promoType = '';
        $promoValue = 0;
        if (isset($fields['promo']['mapValue']['fields'])) {
            $promoFields = $fields['promo']['mapValue']['fields'];
            if (isset($promoFields['jenis']['stringValue']) && isset($promoFields['nilai']['integerValue'])) {
                $promoEnabled = true;
                $promoType = $promoFields['jenis']['stringValue'];
                $promoValue = $promoFields['nilai']['integerValue'];
            }
        }

        $products[] = [
            'product_id' => $productId,
            'name' => $productName,
            'type' => $category, // 'type' di frontend Anda bisa diisi dari 'kategori' di Firebase
            'description' => $description,
            'price_buyer' => (int)$priceGeneral,
            'price_reseller' => (int)$priceReseller,
            'stock' => (int)$stock,
            'order' => (int)$order,
            'promo' => $promoEnabled ? [
                'active' => true,
                'type' => $promoType,
                'value' => (int)$promoValue
            ] : ['active' => false]
        ];
    }
}

// Urutkan produk berdasarkan field 'order' (urutan) agar sesuai dengan tampilan admin
usort($products, function($a, $b) {
    return $a['order'] - $b['order'];
});

// Mengembalikan array produk sebagai respons JSON
echo json_encode($products);
?>
