let mapa;

export function initMap(lat, lng) {
    mapa = L.map('mapa').setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapa);

    L.marker([lat, lng]).addTo(mapa).bindPopup('Tu ubicación');
}

export function getMap() {
    return mapa;
}