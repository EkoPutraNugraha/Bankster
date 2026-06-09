document.addEventListener('DOMContentLoaded', function() {
    const headerContainer = document.querySelector('.header-container');
    const images = [
        '../images/background_1.jpg',
        '../images/background_2.jpg',
        '../images/background_3.jpg',
        '../images/background_4.jpg'
    ];
    let currentImageIndex = 0;

    function changeBackground() {
        currentImageIndex = (currentImageIndex + 1) % images.length; // Loop kembali ke awal
        headerContainer.style.backgroundImage = `url('${images[currentImageIndex]}')`;
    }

    // Panggil fungsi changeBackground setiap 5 detik
    setInterval(changeBackground, 5000); // 5000 milidetik = 5 detik
});