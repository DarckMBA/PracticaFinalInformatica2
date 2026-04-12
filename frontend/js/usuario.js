import { initMap, pintarCargadores } from '../js/mapa.js';

let cargadores = [];
let cargadorSeleccionadoId = null;
let intervaloBateria = null;

document.addEventListener('DOMContentLoaded', () => {
    // Pedimos permiso para notificaciones al arrancar
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    actualizarHistorialUI();
    cargarCargadores();

    // Refresca cargadores e historial cada minuto
    setInterval(() => {
        actualizarHistorialUI();
        cargarCargadores();
    }, 60000);

    // Filtro por tipo de cargador
    const filtroSelect = document.getElementById('filtroTipo');
    if (filtroSelect) {
        filtroSelect.addEventListener('change', (e) => {
            const tipo = e.target.value;
            const filtrados = tipo ? cargadores.filter(c => c.tipo === tipo) : cargadores;
            pintarCargadores(filtrados);
        });
    }

    // Botón reservar del modal
    document.getElementById("btnReservarModal").onclick = async () => {
        const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const cargador = cargadores.find(c => c.id === cargadorSeleccionadoId);

        if (!usuario) { toast("Debes iniciar sesión.", "error"); return; }
        if (!cargador || cargador.estado !== "Libre") { toast("No disponible.", "error"); return; }

        try {
            const respuesta = await fetch("http://localhost:3000/reservas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_usuario: usuario.id_usuario,
                    id_cargador: cargador.id
                })
            });

            const data = await respuesta.json();
            if (!respuesta.ok) { toast(data.error, "error"); return; }

            // Guardamos la batería inicial aleatoria (10–40%) vinculada a la reserva
            const bateriaInicial = Math.floor(Math.random() * 31) + 10;
            localStorage.setItem(`bateria_${data.id_reserva}`, bateriaInicial);

            cargador.estado = "Ocupado";
            pintarCargadores(cargadores);
            actualizarHistorialUI();
            document.getElementById("modalDetalles").style.display = "none";
            toast("Reserva guardada correctamente.");
        } catch {
            toast("No se pudo conectar con el servidor.", "error");
        }
    };

    document.getElementById("cerrarModal").onclick = () => {
        document.getElementById("modalDetalles").style.display = "none";
    };

    // Reportar incidencia
    const btnCrearIncidencia = document.getElementById("btnCrearIncidencia");
    if (btnCrearIncidencia) {
        btnCrearIncidencia.onclick = async () => {
            const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
            const idCargador = document.getElementById("incidenciaCargador").value;
            const descripcion = document.getElementById("incidenciaDescripcion").value.trim();

            if (!usuario) { toast("Debes iniciar sesión.", "error"); return; }
            if (!idCargador || descripcion === "") { toast("Completa todos los campos.", "error"); return; }

            try {
                const res = await fetch("http://localhost:3000/incidencias", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id_usuario: usuario.id_usuario,
                        id_cargador: Number(idCargador),
                        descripcion
                    })
                });

                const data = await res.json();
                if (!res.ok) { toast(data.error, "error"); return; }

                toast("Incidencia enviada correctamente.");
                document.getElementById("incidenciaCargador").value = "";
                document.getElementById("incidenciaDescripcion").value = "";
            } catch {
                toast("No se pudo enviar la incidencia.", "error");
            }
        };
    }

    window.onclick = (e) => {
        if (e.target === document.getElementById("modalDetalles")) {
            document.getElementById("modalDetalles").style.display = "none";
        }
    };
});

// ─── MAPA ─────────────────────────────────────────────────────────────────────

function cargarCargadores() {
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

            navigator.geolocation.getCurrentPosition(
                ({ coords }) => {
                    initMap(coords.latitude, coords.longitude);
                    pintarCargadores(cargadores);
                },
                () => {
                    initMap(40.4168, -3.7038);
                    pintarCargadores(cargadores);
                }
            );
        })
        .catch(() => {
            initMap(40.4168, -3.7038);
            pintarCargadores(cargadores);
        });
}

window.seleccionarCargador = function (id) {
    cargadorSeleccionadoId = id;
    const c = cargadores.find(item => item.id === id);
    const modal = document.getElementById("modalDetalles");
    const btnReservar = document.getElementById("btnReservarModal");

    if (!c || !modal) return;

    const tiempos = { 'Rápido': '15 min', 'Estándar': '30 min', 'Compatible': '45 min' };
    const costes  = { 'Rápido': '20€',    'Estándar': '10€',    'Compatible': '8€'    };

    btnReservar.style.backgroundColor = c.estado !== 'Libre' ? "grey" : "#28a745";
    btnReservar.disabled = c.estado !== 'Libre';
    btnReservar.innerText = c.estado !== 'Libre' ? "No disponible" : "Reservar Ahora";

    document.getElementById("modalContenido").innerHTML = `
    <p><strong>ID:</strong> #${c.id}</p>
    <p><strong>Tipo:</strong> ${c.tipo}</p>
    <p><strong>Estado:</strong> <span style="color:${c.estado === 'Libre' ? 'green' : 'red'}">${c.estado}</span></p>
    <p>⏱ <strong>Tiempo de carga:</strong> ${tiempos[c.tipo] || '30 min'}</p>
    <p>💰 <strong>Precio:</strong> ${costes[c.tipo] || '10€'}</p>
    <a href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}"
    target="_blank"
    style="display:inline-block; margin-top:10px; padding:10px 15px; background:#4285F4; color:white; border-radius:8px; text-decoration:none; font-weight:bold;">
    Cómo llegar
    </a>
`;

    modal.style.display = "flex";
};

// ─── CANCELAR RESERVA ─────────────────────────────────────────────────────────

window.cancelarReserva = async function (idCargador) {
    if (!confirm("¿Cancelar reserva?")) return;

    try {
        const res = await fetch(`http://localhost:3000/reservas/${idCargador}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) { toast(data.error || "Error al cancelar", "error"); return; }

        const cargador = cargadores.find(c => c.id === idCargador);
        if (cargador) cargador.estado = "Libre";

        pintarCargadores(cargadores);
        actualizarHistorialUI();
        toast("Reserva cancelada correctamente.");
    } catch {
        toast("Error al cancelar la reserva.", "error");
    }
};

// ─── HISTORIAL CON BATERÍA EN VIVO ───────────────────────────────────────────

/**
 * Calcula el % de batería actual del coche en función del tiempo transcurrido.
 * La batería inicial se guarda en localStorage al hacer la reserva.
 * Si no existe (reserva antigua), se usa un valor derivado del id_reserva.
 */
function calcularBateria(reserva) {
    const inicio = new Date(reserva.fecha_inicio).getTime();
    const fin    = new Date(reserva.fecha_fin).getTime();
    const ahora  = Date.now();

    // Batería inicial: de localStorage si existe, si no pseudo-aleatoria pero estable
    const guardada = localStorage.getItem(`bateria_${reserva.id_reserva}`);
    const bateriaInicial = guardada !== null
        ? Number(guardada)
        : 10 + (reserva.id_reserva * 7 % 31); // 10–40 %, estable por id

    if (ahora >= fin) return 100;
    if (ahora <= inicio) return bateriaInicial;

    const progreso = (ahora - inicio) / (fin - inicio);
    return Math.round(bateriaInicial + progreso * (100 - bateriaInicial));
}

function colorBateria(pct) {
    if (pct < 30) return "#e74c3c";  // rojo
    if (pct < 60) return "#f39c12";  // naranja
    return "#27ae60";                 // verde
}

function renderizarHistorial(historial) {
    const lista = document.getElementById("listaHistorial");
    if (!lista) return;

    if (!Array.isArray(historial) || historial.length === 0) {
        lista.innerHTML = "<li style='border-left: 5px solid #ccc;'>Sin historial de reservas.</li>";
        return;
    }

    lista.innerHTML = historial.map((reserva) => {
        const fechaInicio = new Date(reserva.fecha_inicio).toLocaleString();
        const fechaFin    = new Date(reserva.fecha_fin).toLocaleString();

        const colores = { "Activa": "green", "Cancelada": "red", "Finalizada": "blue" };
        const colorEstado = colores[reserva.estado] || "#666";

        const botonCancelar = reserva.estado === "Activa"
            ? `<button class="btn-cancelar" onclick="cancelarReserva(${reserva.id_cargador})">Cancelar</button>`
            : "";

        // Barra de batería solo para reservas activas
        let barraBateria = "";
        if (reserva.estado === "Activa") {
            const pct   = calcularBateria(reserva);
            const color = colorBateria(pct);
            barraBateria = `
                <div style="margin-top: 8px;">
                    <small>🔋 Cargando: <strong id="pct-${reserva.id_reserva}">${pct}%</strong></small>
                    <div style="background:#e0e0e0; border-radius:6px; height:10px; margin-top:4px; overflow:hidden;">
                        <div id="barra-${reserva.id_reserva}"
                             style="height:100%; width:${pct}%; background:${color}; border-radius:6px; transition: width 1s ease;">
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <li data-reserva-id="${reserva.id_reserva}"
                data-inicio="${reserva.fecha_inicio}"
                data-fin="${reserva.fecha_fin}"
                data-estado="${reserva.estado}">
                <div>
                    <strong>Cargador #${reserva.id_cargador}</strong> (${reserva.tipo})<br>
                    <small>Inicio: ${fechaInicio}</small><br>
                    <small>Fin: ${fechaFin}</small><br>
                    <small>Estado: <span style="color:${colorEstado}; font-weight:bold;">${reserva.estado}</span></small>
                    ${barraBateria}
                </div>
                ${botonCancelar}
            </li>
        `;
    }).join("");
}

async function actualizarHistorialUI() {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
    if (!usuario) return;

    try {
        const res = await fetch(`http://localhost:3000/reservas/usuario/${usuario.id_usuario}`);
        const historial = await res.json();

        renderizarHistorial(historial);
        arrancarTickerBateria(historial);
    } catch {
        const lista = document.getElementById("listaHistorial");
        if (lista) lista.innerHTML = "<li>Error al cargar el historial.</li>";
    }
}

/**
 * Lanza una notificación del navegador cuando la carga del coche llega al 100%.
 * Si el usuario denegó los permisos, muestra un alert como fallback.
 */
function notificarCargaCompleta(reserva) {
    const titulo  = "⚡ ¡Carga completa!";
    const mensaje = `Tu coche en el cargador #${reserva.id_cargador} (${reserva.tipo}) ya está al 100%. Puedes retirarlo.`;

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(titulo, {
            body: mensaje,
            icon: "../assets/logo_usuarios.png"
        });
    } else {
        // Fallback si el usuario denegó los permisos
        toast(`${titulo}\n${mensaje}`, "error");
    }
}

function arrancarTickerBateria(historial) {
    if (intervaloBateria) clearInterval(intervaloBateria);

    const activas = historial.filter(r => r.estado === "Activa");
    if (activas.length === 0) return;

    // Guardamos qué reservas ya notificamos para no repetir
    const yaNotificadas = new Set();

    intervaloBateria = setInterval(() => {
        activas.forEach(reserva => {
            const pct   = calcularBateria(reserva);
            const color = colorBateria(pct);

            const elPct   = document.getElementById(`pct-${reserva.id_reserva}`);
            const elBarra = document.getElementById(`barra-${reserva.id_reserva}`);

            if (elPct)   elPct.textContent   = `${pct}%`;
            if (elBarra) {
                elBarra.style.width      = `${pct}%`;
                elBarra.style.background = color;
            }

            // Notificación cuando llega al 100% (una sola vez por reserva)
            if (pct >= 100 && !yaNotificadas.has(reserva.id_reserva)) {
                yaNotificadas.add(reserva.id_reserva);
                notificarCargaCompleta(reserva);
                // Actualizamos el historial para reflejar el estado Finalizada
                actualizarHistorialUI();
            }
        });
    }, 1000);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function toast(mensaje, tipo = "ok", duracion = 3000) {
    let el = document.getElementById("toast");
    if (!el) {
        el = document.createElement("div");
        el.id = "toast";
        document.body.appendChild(el);
    }
    el.textContent = mensaje;
    el.className = `show toast-${tipo}`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.className = ""; }, duracion);
}