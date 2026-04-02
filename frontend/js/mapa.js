let mapa;
let capaMarcadores = L.layerGroup();

const iconoPersona = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

export function initMap(lat, lng) {
    if (!mapa) {
        mapa = L.map('mapa').setView([lat, lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapa);

        capaMarcadores.addTo(mapa);

        L.marker([lat, lng], { icon: iconoPersona })
            .addTo(mapa)
            .bindPopup('Estás aquí')
            .openPopup();
    }
}

export function pintarCargadores(lista) {
    capaMarcadores.clearLayers();

    lista.forEach(c => {
        const marker = L.marker([c.lat, c.lng]);
        marker.bindPopup(`
            <b>${c.tipo}</b><br>
            <button onclick="window.seleccionarCargador(${c.id})" style="cursor:pointer; margin-top:5px;">
                Ver Detalles
            </button>
        `);
        capaMarcadores.addLayer(marker);
    });
}

export function getMap() {
    return mapa;
}