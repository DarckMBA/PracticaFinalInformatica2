import { initMap, pintarCargadores } from './mapa.js';

const cargadores = [
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

document.addEventListener('DOMContentLoaded', () => {
    actualizarHistorialUI();

    // Actualizamos la UI cada segundo para que el cronómetro se mueva
    setInterval(actualizarHistorialUI, 1000);

    navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
            initMap(coords.latitude, coords.longitude);
            pintarCargadores(cargadores);
        },
        () => {
            initMap(40.4168, -3.7038); // Se elije Madrid si falla
            pintarCargadores(cargadores);
        }
    );

    const filtroSelect = document.getElementById('filtroTipo');
    if (filtroSelect) {
        filtroSelect.addEventListener('change', (e) => {
            const tipo = e.target.value;
            const filtrados = tipo ? cargadores.filter(c => c.tipo === tipo) : cargadores;
            pintarCargadores(filtrados);
        });
    }

    const btnReservar = document.getElementById("btnReservarModal");
    btnReservar.onclick = () => {
        const cargador = cargadores.find(c => c.id === cargadorSeleccionadoId);
        
        if (cargador && cargador.estado === "Libre") {
            let historial = JSON.parse(localStorage.getItem("historialReservas")) || [];
            
            let precio = cargador.tipo === 'Rápido' ? "20€" : (cargador.tipo === 'Estándar' ? "10€" : "8€");

            const nuevaReserva = {
                id: cargador.id,
                tipo: cargador.tipo,
                precio: precio,
                fecha: new Date().toLocaleString(),
                expira: Date.now() + 3600000 // Guardamos el momento exacto de expiración (ahora + 1 hora)
            };

            historial.push(nuevaReserva);
            localStorage.setItem("historialReservas", JSON.stringify(historial));

            cargador.estado = "Ocupado";
            actualizarHistorialUI();
            pintarCargadores(cargadores); 
            document.getElementById("modalDetalles").style.display = "none";
            alert(`Reserva confirmada. El cargador #${cargador.id} queda bloqueado por 1 hora.`);
        } else {
            alert("No disponible.");
        }
    };

    const modal = document.getElementById("modalDetalles");
    document.getElementById("cerrarModal").onclick = () => modal.style.display = "none";
});

window.seleccionarCargador = function(id) {
    cargadorSeleccionadoId = id;
    const c = cargadores.find(item => item.id === id);
    const modal = document.getElementById("modalDetalles");
    const contenido = document.getElementById("modalContenido");

    if (c && modal && contenido) {
        let tiempo = c.tipo === 'Rápido' ? "15 min" : (c.tipo === 'Estándar' ? "30 min" : "45 min");
        let coste = c.tipo === 'Rápido' ? "20€" : (c.tipo === 'Estándar' ? "10€" : "8€");

        contenido.innerHTML = `
            <p><strong>ID:</strong> #${c.id}</p>
            <p><strong>Tipo:</strong> ${c.tipo}</p>
            <p><strong>Estado:</strong> <span style="color:${c.estado === 'Libre' ? 'green' : 'red'}">${c.estado}</span></p>
            <p><strong>Carga:</strong> ${c.nivelCarga}%</p>
            <hr style="margin:10px 0; border:0; border-top: 1px solid #eee;">
            <p>⏱ <strong>Tiempo de carga:</strong> ${tiempo}</p>
            <p>💰 <strong>Precio:</strong> ${coste}</p>
        `;
        modal.style.display = "flex";
    }
};

window.cancelarReserva = function(index) {
    if (confirm("¿Cancelar reserva?")) {
        let historial = JSON.parse(localStorage.getItem("historialReservas")) || [];
        const reserva = historial[index];
        const cargador = cargadores.find(c => c.id === reserva.id);
        if (cargador) cargador.estado = "Libre";

        historial.splice(index, 1);
        localStorage.setItem("historialReservas", JSON.stringify(historial));
        actualizarHistorialUI();
        pintarCargadores(cargadores);
    }
};

function actualizarHistorialUI() {
    const lista = document.getElementById("listaHistorial");
    let historial = JSON.parse(localStorage.getItem("historialReservas")) || [];
    const ahora = Date.now();
    let expirados = false;

    // Filtrar las que ya pasaron de la hora
    const historialActivo = historial.filter(res => {
        if (ahora >= res.expira) {
            const cargador = cargadores.find(c => c.id === res.id);
            if (cargador) cargador.estado = "Libre";
            expirados = true;
            return false;
        }
        return true;
    });

    if (expirados) {
        localStorage.setItem("historialReservas", JSON.stringify(historialActivo));
        pintarCargadores(cargadores);
        historial = historialActivo;
    }
    
    if (lista) {
        if (historial.length === 0) {
            lista.innerHTML = "<li style='border-left: 5px solid #ccc;'>Sin reservas activas.</li>";
        } else {
            lista.innerHTML = historial.map((res, index) => {
                const resto = res.expira - ahora;
                const m = Math.floor(resto / 60000);
                const s = Math.floor((resto % 60000) / 1000);

                return `
                <li>
                    <div>
                        <strong>Cargador #${res.id}</strong> (${res.tipo})<br>
                        <small style="color: #666;">${res.precio} • Expira en: <span class="timer">${m}:${s < 10 ? '0' : ''}${s}</span></small>
                    </div>
                    <button class="btn-cancelar" onclick="cancelarReserva(${index})">Cancelar</button>
                </li>
            `}).join("");
        }
    }
}