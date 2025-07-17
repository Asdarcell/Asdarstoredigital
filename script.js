const section = document.getElementById('Box-Pembungkus');
const linkDaftar = document.getElementById('linkDaftar');
const linkLogin = document.getElementById('linkLogin');

// --- Logika untuk Desktop & Mobile ---
const cardLogin = document.querySelector('.card-login');
const cardRegis = document.querySelector('.card-regis');

linkDaftar.onclick = (e) => {
    e.preventDefault();
    // Jika di mobile, gunakan show/hide. Jika di desktop, gunakan class 'active'.
    if (window.innerWidth <= 820) {
        cardLogin.style.display = 'none';
        cardRegis.style.display = 'flex';
    } else {
        section.classList.add('active');
    }
};

linkLogin.onclick = (e) => {
    e.preventDefault();
    if (window.innerWidth <= 820) {
        cardRegis.style.display = 'none';
        cardLogin.style.display = 'flex';
    } else {
        section.classList.remove('active');
    }
};
