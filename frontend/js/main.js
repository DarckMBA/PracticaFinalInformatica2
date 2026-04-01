import { initMap, pintarCargadores, getMap } from '../js/mapa.js';

let cargadores = [
    { id: 1, lat: 40.4368, lng: -3.7038, tipo: 'Rápido', estado: 'Libre', nivelCarga: 100 },
    { id: 2, lat: 40.4230, lng: -3.7120, tipo: 'Estándar', estado: 'Ocupado', nivelCarga: 45 },
    { id: 3, lat: 40.4050, lng: -3.7010, tipo: 'Compatible', estado: 'En reparación', nivelCarga: 0 },
    { id: 4, lat: 40.4120, lng: -3.6920, tipo: 'Rápido', estado: 'Libre', nivelCarga: 90 },
    { id: 5, lat: 40.4300, lng: -3.7050, tipo: 'Estándar', estado: 'Libre', nivelCarga: 100 },
    { id: 6, lat: 40.4190, lng: -3.6850, tipo: 'Compatible', estado: 'Ocupado', nivelCarga: 20 },
    { id: 7, lat: 40.4000, lng: -3.7150, tipo: 'Rápido', estado: 'Libre', nivelCarga: 100 },
    { id: 8, lat: 40.4250, lng: -3.6900, tipo: 'Estándar', estado: 'Libre', nivelCarga: 75 },
    { id: 9, lat: 40.4100, lng: -3.7200, tipo: 'Rápido', estado: 'Ocupado', nivelCarga: 60 },
    { id: 10, lat: 40.4350, lng: -3.7180, tipo: 'Compatible', estado: 'Libre', nivelCarga: 100 }
];

let cargadorSeleccionadoId = null;
let marcadorBusqueda = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarCargadores();

    setInterval(cargarCargadores, 60000);

    const filtroSelect = document.getElementById('filtroTipo');
    if (filtroSelect) {
        filtroSelect.addEventListener('change', aplicarFiltroTipo);
    }

    const barraBusqueda = document.getElementById('barraDeBusqueda');
    const inputBusqueda = document.getElementById('inputBusqueda');
    if (barraBusqueda && inputBusqueda) {
        barraBusqueda.addEventListener('submit', async (e) => {
            e.preventDefault();

            const consulta = inputBusqueda.value.trim();
            if (!consulta) return;

            const encontrado = await buscarUbicacion(consulta);
            if (!encontrado) {
                alert('No se ha encontrado la ubicacion. Pruebe con una dirección mas específica.');
            }
        });
    }

    const cerrarModal = document.getElementById("cerrarModal");
    if (cerrarModal) {
        cerrarModal.onclick = () => {
            document.getElementById("modalDetalles").style.display = "none";
        };
    }

    window.onclick = (e) => {
        if (e.target === document.getElementById("modalDetalles")) {
            document.getElementById("modalDetalles").style.display = "none";
        }
    };
});

export function cargarCargadores() {
    fetch("http://localhost:3000/cargadores")
        .then(res => res.json())
        .then(data => {
            cargadores = data.map(c => ({
                id: c.id_cargador,
                lat: Number(c.latitud),
                lng: Number(c.longitud),
                tipo: c.tipo,
                estado: c.estado,
                nivelCarga: c.nivel_carga
            }));

            if (getMap()) {
                aplicarFiltroTipo();
                return;
            }

            navigator.geolocation.getCurrentPosition(
                ({ coords }) => {
                    initMap(coords.latitude, coords.longitude);
                    aplicarFiltroTipo();
                },
                () => {
                    initMap(40.4168, -3.7038);
                    aplicarFiltroTipo();
                }
            );
        })
        .catch(() => {
            if (!getMap()) {
                initMap(40.4168, -3.7038);
            }
            aplicarFiltroTipo();
        });
}

export function getCargadores() {
    return cargadores;
}

export function getCargadorSeleccionadoId() {
    return cargadorSeleccionadoId;
}

function aplicarFiltroTipo() {
    const filtroSelect = document.getElementById('filtroTipo');
    const tipo = filtroSelect ? filtroSelect.value : '';
    const filtrados = tipo ? cargadores.filter(c => c.tipo === tipo) : cargadores;
    pintarCargadores(filtrados);
}

async function buscarUbicacion(consulta) {
    const mapa = getMap();
    if (!mapa) {
        return false;
    }

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(consulta)}`;
        const res = await fetch(url, {
            headers: {
                'Accept-Language': 'es'
            }
        });

        if (!res.ok) {
            return false;
        }

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            return false;
        }

        const { lat, lon, display_name: nombre } = data[0];
        const latNum = Number(lat);
        const lonNum = Number(lon);

        if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
            return false;
        }

        mapa.setView([latNum, lonNum], 15);
        if (marcadorBusqueda) {
            mapa.removeLayer(marcadorBusqueda);
        }

        marcadorBusqueda = L.marker([latNum, lonNum]).addTo(mapa)
            .bindPopup(`Resultado: ${nombre}`);
        marcadorBusqueda.openPopup();

        aplicarFiltroTipo();

        return true;
    } catch {
        return false;
    }
}

window.seleccionarCargador = function(id) {
    cargadorSeleccionadoId = id;
    const c = cargadores.find(item => item.id === id);
    const modal = document.getElementById("modalDetalles");
    const btnReservar = document.getElementById("btnReservarModal");

    if (c && modal) {
        if (btnReservar) {
            btnReservar.style.backgroundColor = c.estado !== 'Libre' ? "grey" : "#28a745";
            btnReservar.disabled = c.estado !== 'Libre';
            btnReservar.innerText = c.estado !== 'Libre' ? "No disponible" : "Reservar Ahora";
        }

        let tiempo = c.tipo === 'Rápido' ? "15 min" : (c.tipo === 'Estándar' ? "30 min" : "45 min");
        let coste = c.tipo === 'Rápido' ? "20€" : (c.tipo === 'Estándar' ? "10€" : "8€");

        document.getElementById("modalContenido").innerHTML = `
            <p><strong>ID:</strong> #${c.id}</p>
            <p><strong>Tipo:</strong> ${c.tipo}</p>
            <p><strong>Estado:</strong> <span style="color:${c.estado === 'Libre' ? 'green' : 'red'}">${c.estado}</span></p>
            <p><strong>Carga:</strong> ${c.nivelCarga}%</p>
            <p>⏱ <strong>Tiempo:</strong> ${tiempo}</p>
            <p>💰 <strong>Precio:</strong> ${coste}</p>
        `;
        modal.style.display = "flex";
    }
};
