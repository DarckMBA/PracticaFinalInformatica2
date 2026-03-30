import { initMap } from './modules/mapa/mapa.js';

document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('mapa');
    if (!mapEl) return;

    if (!navigator.geolocation) {
        initMap(40.4168, -3.7038); // Se elije Madrid por defecto
        return;
    }

    navigator.geolocation.getCurrentPosition(
        ({ coords }) => initMap(coords.latitude, coords.longitude),
        () => initMap(40.4168, -3.7038) // Se elije Madrid si falla
    );
});