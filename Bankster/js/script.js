// --- Konfigurasi Supabase ---
const supabaseUrl = window.BANKSTER_CONFIG?.SUPABASE_URL;
const supabaseKey = window.BANKSTER_CONFIG?.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Create js/config.js from js/config.example.js.');
}
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- Konfigurasi Mapbox ---
mapboxgl.accessToken = window.BANKSTER_CONFIG?.MAPBOX_ACCESS_TOKEN;
if (!mapboxgl.accessToken) {
    throw new Error('Missing Mapbox configuration. Create js/config.js from js/config.example.js.');
}
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [107.6191, -6.9175], // Koordinat Bandung
    zoom: 12
});
map.addControl(new mapboxgl.NavigationControl());

let userLocationMarker = null; 
let activeMarkers = []; 

// --- Fungsi Helper untuk Menghitung Jarak ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius bumi dalam km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Jarak dalam km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// --- Fungsi untuk menampilkan satu lokasi (di list dan di map) ---
function displayLocation(location, listElement) {
    const listItem = document.createElement('div');
    listItem.className = 'location-item';
    listItem.innerHTML = `
        <h4>${location.name || 'Nama tidak tersedia'}</h4>
        <p>${location.type || 'Tipe tidak diketahui'} - ${location.Bank || 'Bank tidak diketahui'}</p> 
        ${location.address ? `<p style="font-size: 0.8em; color: #555;">${location.address}</p>` : ''}
        ${!(location.latitude && location.longitude) ? `<p style="color: red; font-size: 0.8em;">Koordinat tidak ditemukan</p>` : `
            <button class="get-route-btn" data-lon="${location.longitude}" data-lat="${location.latitude}">
                Dapatkan Rute
            </button>
        `}
    `;
    listElement.appendChild(listItem);

    const routeButton = listItem.querySelector('.get-route-btn');
    if (routeButton) {
        routeButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const destinationCoords = [
                parseFloat(e.target.dataset.lon),
                parseFloat(e.target.dataset.lat)
            ];
            getRoute(destinationCoords, e.target); 
        });
    }

    if (location.latitude && location.longitude) {
        const popupHTML = `<h3>${location.name || 'Location'}</h3>
                           <p>${location.type || 'Type'} - ${location.Bank || 'Bank'}</p>
                           ${location.address ? `<p>${location.address}</p>` : ''}
                           <button class="get-route-btn-marker" data-lon="${location.longitude}" data-lat="${location.latitude}">Dapatkan Rute</button>`;
        
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHTML); // Offset mungkin perlu disesuaikan dengan ukuran ikon

        // --- MEMBUAT ELEMEN MARKER KUSTOM ---
        const el = document.createElement('div');
        el.className = 'custom-marker'; // Beri kelas untuk styling CSS

        let iconPath = 'images/default-marker.png'; // Path ke ikon default jika bank tidak dikenali
                                                 // Anda perlu menyediakan gambar default ini.

        if (location.Bank) {
            switch (location.Bank.toUpperCase()) {
                case 'BCA':
                    iconPath = 'images/bca.png'; // Path ke ikon BCA
                    break;
                case 'BSI':
                    iconPath = 'images/bsi.png'; // Path ke ikon BSI
                    break;
                case 'BJB':
                    iconPath = 'images/bjb.png'; // Path ke ikon BJB (perhatikan kapitalisasi nama file)
                    break;
                // Tambahkan case lain jika ada bank lain
            }
        }
        el.style.backgroundImage = `url(${iconPath})`;
        // Style dasar untuk ukuran marker, bisa juga diatur di CSS
        el.style.width = '30px';  // Sesuaikan ukuran
        el.style.height = '30px'; // Sesuaikan ukuran
        el.style.backgroundSize = 'contain'; // atau 'cover', tergantung preferensi
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundPosition = 'center';
        el.style.cursor = 'pointer';
        // --- AKHIR MEMBUAT ELEMEN MARKER KUSTOM ---

        const marker = new mapboxgl.Marker(el) // Gunakan elemen kustom 'el' sebagai marker
            .setLngLat([location.longitude, location.latitude])
            .setPopup(popup)
            .addTo(map);
        
        activeMarkers.push(marker); 

        popup.on('open', () => {
            const routeButtonMarker = popup.getElement().querySelector('.get-route-btn-marker');
            if (routeButtonMarker) {
                const newRouteButtonMarker = routeButtonMarker.cloneNode(true);
                routeButtonMarker.parentNode.replaceChild(newRouteButtonMarker, routeButtonMarker);
                
                newRouteButtonMarker.addEventListener('click', (ePop) => {
                    ePop.stopPropagation();
                    const destinationCoords = [
                        parseFloat(ePop.target.dataset.lon),
                        parseFloat(ePop.target.dataset.lat)
                    ];
                    getRoute(destinationCoords, ePop.target); 
                });
            }
        });

        listItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('get-route-btn')) {
                map.flyTo({
                    center: [location.longitude, location.latitude],
                    zoom: 15,
                    essential: true 
                });
                if (!popup.isOpen()) {
                   popup.addTo(map); 
                }
            }
        });
    } else {
        console.warn(`Location "${location.name || 'Unknown'}" missing coordinates.`);
    }
}

function removeAllLocationMarkers() {
    activeMarkers.forEach(marker => marker.remove());
    activeMarkers = []; 
}

function removeRouteAndUserMarker() {
    if (map.getLayer('route-layer')) {
        map.removeLayer('route-layer');
    }
    if (map.getSource('route')) {
        map.removeSource('route');
    }
    if (userLocationMarker) {
        userLocationMarker.remove();
        userLocationMarker = null;
    }
    console.log('Previous route and user marker removed.');
    resetRouteButtonsState(); 
    const statusElement = document.getElementById('route-status');
    if (statusElement) statusElement.textContent = '';
}

async function getRoute(destinationCoords, clickedButtonElement) { 
    console.log('Getting route to:', destinationCoords);
    removeRouteAndUserMarker(); 

    if (clickedButtonElement) {
        clickedButtonElement.textContent = 'Mencari...';
        clickedButtonElement.disabled = true;
    }

    const geoOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    const statusElement = document.getElementById('route-status');
    if (statusElement) statusElement.textContent = 'Mencari lokasi Anda...';

    if (!navigator.geolocation) {
        alert('Geolocation tidak didukung oleh browser Anda.');
        if (statusElement) statusElement.textContent = 'Geolocation tidak didukung.';
        resetRouteButtonsState(); 
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const userCoords = [position.coords.longitude, position.coords.latitude];
        const accuracy = position.coords.accuracy;

        if (statusElement) statusElement.textContent = `Lokasi ditemukan (Akurasi: ${accuracy.toFixed(0)}m). Mencari rute...`;
        if (accuracy > 2000) alert(`Akurasi lokasi Anda mungkin kurang (${accuracy.toFixed(0)}m). Rute bisa jadi tidak presisi.`);

        userLocationMarker = new mapboxgl.Marker({ color: '#28a745' }) 
            .setLngLat(userCoords)
            .setPopup(new mapboxgl.Popup().setHTML(`<h4>Lokasi Anda</h4><p>Akurasi: ${accuracy.toFixed(0)}m</p>`))
            .addTo(map);

        const profile = 'driving'; 
        const queryUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${userCoords[0]},${userCoords[1]};${destinationCoords[0]},${destinationCoords[1]}?steps=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;
        
        try {
            const response = await fetch(queryUrl);
            if (!response.ok) {
                const errorData = await response.json();
                alert(`Gagal mendapatkan rute: ${errorData.message || response.statusText}`);
                if (statusElement) statusElement.textContent = `Gagal mendapatkan rute: ${errorData.message || response.statusText}`;
                removeRouteAndUserMarker(); return; 
            }
            const json = await response.json();
            if (!json.routes || json.routes.length === 0) {
                alert('Tidak dapat menemukan rute ke tujuan.');
                if (statusElement) statusElement.textContent = 'Rute tidak ditemukan.';
                removeRouteAndUserMarker(); return;
            }

            const route = json.routes[0].geometry;
            const duration = json.routes[0].duration; 
            const distance = json.routes[0].distance; 
            if (statusElement) statusElement.textContent = `Rute ditemukan: ${Math.round(duration / 60)} menit (${(distance / 1000).toFixed(1)} km)`;

            if (map.getSource('route')) { map.removeLayer('route-layer'); map.removeSource('route'); }
            map.addSource('route', { 'type': 'geojson', 'data': route });
            map.addLayer({
                'id': 'route-layer', 'type': 'line', 'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 'line-color': '#007bff', 'line-width': 6, 'line-opacity': 0.75 }
            });

            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend(userCoords); bounds.extend(destinationCoords);
            if (route.coordinates && route.coordinates.length > 2) bounds.extend(route.coordinates[Math.floor(route.coordinates.length / 2)]);
            map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 60, right: 60 }, maxZoom: 16, essential: true });
        } catch (error) {
            alert("Terjadi kesalahan saat mengambil atau menampilkan rute.");
            if (statusElement) statusElement.textContent = 'Error saat proses rute.';
            removeRouteAndUserMarker(); 
        } 
    }, (error) => {
        let message = 'Gagal mendapatkan lokasi Anda.';
        if (error.code === error.PERMISSION_DENIED) message = 'Akses lokasi ditolak.';
        else if (error.code === error.POSITION_UNAVAILABLE) message = 'Informasi lokasi tidak tersedia.';
        else if (error.code === error.TIMEOUT) message = 'Waktu pencarian lokasi habis.';
        alert(message);
        if (statusElement) statusElement.textContent = message;
        removeRouteAndUserMarker(); 
    }, geoOptions);
}

function resetRouteButtonsState() {
    document.querySelectorAll('.get-route-btn, .get-route-btn-marker').forEach(btn => {
        btn.textContent = 'Dapatkan Rute';
        btn.disabled = false;
    });
}

const searchInput = document.getElementById('search-location');
const searchButton = document.querySelector('.search-icon');
const applyFiltersBtn = document.getElementById('apply-filters-btn'); 

// Di dalam file js/script.js

// ... (fungsi getDistanceFromLatLonInKm, deg2rad, displayLocation, dll. tetap sama) ...

async function applyFilters() {
    const locationListElement = document.querySelector('.location-list');
    if (!locationListElement) return;
    locationListElement.innerHTML = '<p>Mencari lokasi dan lokasi Anda...</p>'; 
    
    removeRouteAndUserMarker(); 
    removeAllLocationMarkers(); 

    const selectedBanks = Array.from(document.querySelectorAll('input[name="bank"]:checked')).map(cb => cb.value);
    const selectedFacilities = Array.from(document.querySelectorAll('input[name="facility"]:checked')).map(cb => cb.value);
    const searchTerm = searchInput.value.trim().toLowerCase();

    console.log('Applying filters - Banks:', selectedBanks, 'Facilities:', selectedFacilities, 'Search:', searchTerm);

    try {
        let query = supabaseClient.from('locations').select('*');
        const andFilters = [];

        if (selectedBanks.length > 0) andFilters.push(`or(${selectedBanks.map(b => `Bank.eq.${b}`).join(',')})`);
        
        let typeConditions = [];
        if (selectedFacilities.includes('Kantor Cabang')) typeConditions.push(`type.eq.Kantor Cabang`); 
        if (selectedFacilities.includes('Tarik Tunai') && !typeConditions.includes('type.eq.Tarik Tunai')) typeConditions.push(`type.eq.Tarik Tunai`);
        if (selectedFacilities.includes('Setor Tunai') && !typeConditions.includes('type.eq.Setor Tunai')) typeConditions.push(`type.eq.Setor Tunai`);
        if (typeConditions.length > 0) andFilters.push(`or(${typeConditions.join(',')})`);
        
        if (searchTerm) andFilters.push(`or(name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%)`);

        if (andFilters.length > 0) {
            const combinedFilterString = `and(${andFilters.join(',')})`;
            console.log("DEBUG: Supabase Combined Filter String:", combinedFilterString);
            query = query.or(combinedFilterString);
        } else {
            console.log("DEBUG: No filters applied, fetching all.");
        }

        const { data: fetchedLocations, error } = await query; // Ganti nama variabel agar tidak bentrok

        if (error) {
            locationListElement.innerHTML = `<p>Gagal memuat lokasi. Error: ${error.message}</p>`; return;
        }
        if (!fetchedLocations || fetchedLocations.length === 0) {
            locationListElement.innerHTML = '<p>Tidak ada lokasi yang cocok dengan kriteria Anda.</p>';
            map.flyTo({ center: [107.6191, -6.9175], zoom: 11.5, essential: true }); return;
        }

        // Kosongkan list SEBELUM mendapatkan lokasi pengguna, agar pesan loading terlihat
        locationListElement.innerHTML = '<p>Mendapatkan lokasi Anda untuk pengurutan...</p>'; 
        
        const statusElement = document.getElementById('route-status');
        if (statusElement) statusElement.textContent = 'Mendapatkan lokasi Anda untuk pengurutan dan zoom...';

        if (!navigator.geolocation) {
            if (statusElement) statusElement.textContent = 'Geolocation tidak didukung. Daftar tidak diurutkan berdasarkan jarak.';
            // Tampilkan daftar tanpa pengurutan jarak jika geolocation gagal di awal
            locationListElement.innerHTML = ''; // Kosongkan pesan loading
            fetchedLocations.forEach(location => displayLocation(location, locationListElement));
            // Fallback zoom ke bounds
            const bounds = new mapboxgl.LngLatBounds();
            fetchedLocations.forEach(loc => { if (loc.latitude && loc.longitude) bounds.extend([loc.longitude, loc.latitude]); });
            if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 80, maxZoom: 15, essential: true });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude; 
                const userLon = position.coords.longitude;
                if (statusElement) statusElement.textContent = 'Lokasi Anda ditemukan. Mengurutkan dan mencari hasil terdekat...';
                console.log(`User location for sorting & zoom: [${userLon}, ${userLat}]`);

                // Tambahkan properti jarak ke setiap lokasi dan filter yang tidak punya koordinat
                let locationsWithDistance = fetchedLocations
                    .map(loc => {
                        if (loc.latitude && loc.longitude) {
                            const distance = getDistanceFromLatLonInKm(userLat, userLon, loc.latitude, loc.longitude);
                            return { ...loc, distance: distance }; // Tambahkan properti jarak
                        }
                        return { ...loc, distance: Infinity }; // Jika tidak ada koordinat, anggap jarak tak hingga
                    })
                    .sort((a, b) => a.distance - b.distance); // Urutkan berdasarkan jarak (terkecil ke terbesar)

                locationListElement.innerHTML = ''; // Kosongkan pesan loading/error sebelumnya
                if (locationsWithDistance.length === 0) { // Cek lagi setelah filter koordinat (meskipun jarang)
                     locationListElement.innerHTML = '<p>Tidak ada lokasi dengan koordinat yang valid ditemukan.</p>';
                } else {
                    locationsWithDistance.forEach(location => {
                        displayLocation(location, locationListElement); // Tampilkan daftar yang sudah diurutkan
                    });
                }
                
                // Zoom ke lokasi terdekat (hasil pertama dari array yang sudah diurutkan)
                const closestLocation = locationsWithDistance.find(loc => loc.distance !== Infinity);

                if (closestLocation) {
                    console.log("Zooming to closest location:", closestLocation.name, `Distance: ${closestLocation.distance.toFixed(2)} km`);
                    map.flyTo({
                        center: [closestLocation.longitude, closestLocation.latitude],
                        zoom: 16, 
                        essential: true,
                        duration: 1200
                    });
                    if (statusElement) statusElement.textContent = `Menampilkan hasil terdekat: ${closestLocation.name}`;
                } else {
                    console.log("Could not find a closest location with coordinates. Fitting bounds to all results.");
                    if (statusElement) statusElement.textContent = 'Tidak ada hasil terdekat dengan koordinat. Menampilkan semua.';
                    const bounds = new mapboxgl.LngLatBounds();
                    // Gunakan fetchedLocations karena locationsWithDistance mungkin sudah disaring
                    fetchedLocations.forEach(loc => { 
                        if (loc.latitude && loc.longitude) bounds.extend([loc.longitude, loc.latitude]); 
                    });
                    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 80, maxZoom: 15, essential: true });
                }
            },
            (geoError) => {
                console.error("Geolocation error for sorting/zoom:", geoError);
                if (statusElement) statusElement.textContent = `Gagal mendapatkan lokasi: ${geoError.message}. Daftar tidak diurutkan.`;
                // Tampilkan daftar tanpa pengurutan jarak jika geolocation gagal
                locationListElement.innerHTML = ''; // Kosongkan pesan loading
                fetchedLocations.forEach(location => displayLocation(location, locationListElement));
                // Fallback zoom ke bounds
                const bounds = new mapboxgl.LngLatBounds();
                fetchedLocations.forEach(loc => { if (loc.latitude && loc.longitude) bounds.extend([loc.longitude, loc.latitude]); });
                if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 80, maxZoom: 15, essential: true });
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    } catch (err) {
        console.error('An error occurred during filtering:', err);
        locationListElement.innerHTML = '<p>Terjadi kesalahan saat memfilter. Coba lagi.</p>';
    }
}

if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
if (searchButton) searchButton.addEventListener('click', applyFilters);
if (searchInput) {
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFilters(); });
    searchInput.addEventListener('search', () => { if (searchInput.value.trim() === '') applyFilters(); });
}

document.addEventListener('DOMContentLoaded', () => { /* Tidak ada load otomatis */ });
