document.addEventListener('DOMContentLoaded', function () {
    // Pastikan kode ini hanya berjalan jika elemennya ada (khususnya jika digabung di script.js global)
    const tabTitlesContainer = document.querySelector('.tab-titles');
    const tabContentsContainer = document.querySelector('.tab-contents');

    if (tabTitlesContainer && tabContentsContainer) {
        const tabTitles = tabTitlesContainer.querySelectorAll('.tab-title');
        const tabContents = tabContentsContainer.querySelectorAll('.tab-content');

        tabTitles.forEach(titleButton => {
            titleButton.addEventListener('click', function () {
                // 1. Hapus class 'active' dari semua judul dan konten
                tabTitles.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // 2. Tambahkan class 'active' ke judul yang diklik
                this.classList.add('active');

                // 3. Dapatkan target konten dari atribut data-tab
                const targetTabId = this.dataset.tab;
                const targetContent = document.getElementById(targetTabId);

                // 4. Tambahkan class 'active' ke konten yang sesuai
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });

        // Opsional: Inisialisasi tab pertama agar aktif saat halaman dimuat
        // Jika sudah ada class 'active' di HTML, baris ini tidak wajib,
        // tapi bisa berguna jika Anda ingin mengontrolnya sepenuhnya via JS.
        // if (tabTitles.length > 0) {
        //     tabTitles[0].click(); // Simulasikan klik pada judul pertama
        // }
    }
});