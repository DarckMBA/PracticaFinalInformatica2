import { initMap, pintarCargadores } from './mapa.js';

let cargadores = [];
let cargadorSeleccionadoId = null;
let mapaInicializado = false;

document.addEventListener('DOMContentLoaded', () => {
    cargarCargadores();
    cargarReportes();

    const filtroSelect = document.getElementById('filtroTipo');
    if (filtroSelect) {
        filtroSelect.addEventListener('change', (e) => {
            const tipo = e.target.value;
            const filtrados = tipo ? cargadores.filter(c => c.tipo === tipo) : cargadores;
            pintarCargadoresTecnico(filtrados);
        });
    }

    document.getElementById("cerrarModal").onclick = () => {
        document.getElementById("modalDetalles").style.display = "none";
    };

    document.getElementById("btnCambiarEstado").onclick = async () => {
        const select = document.getElementById("estadoSelector");
        let nuevoEstado = select.value;

        if (!cargadorSeleccionadoId) {
            alert("Selecciona un cargador.");
            return;
        }

        if (nuevoEstado === "Operativo") {
            nuevoEstado = "Libre";
        }

        try {
            const res = await fetch(`http://localhost:3000/cargadores/${cargadorSeleccionadoId}/estado`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "No se pudo actualizar el estado.");
                return;
            }

            const cargador = cargadores.find(c => c.id === cargadorSeleccionadoId);
            if (cargador) cargador.estado = nuevoEstado;

            pintarCargadoresTecnico(cargadores);
            seleccionarCargador(cargadorSeleccionadoId);
            cargarReportes();

            alert("Estado actualizado correctamente.");
        } catch (error) {
            alert("Error de conexión.");
        }
    };
});

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

            if (!mapaInicializado) {
                navigator.geolocation.getCurrentPosition(
                    ({ coords }) => {
                        initMap(coords.latitude, coords.longitude);
                        pintarCargadoresTecnico(cargadores);
                        mapaInicializado = true;
                    },
                    () => {
                        initMap(40.4168, -3.7038);
                        pintarCargadoresTecnico(cargadores);
                        mapaInicializado = true;
                    }
                );
            } else {
                pintarCargadoresTecnico(cargadores);
            }
        })
        .catch(() => {
            alert("Error al cargar cargadores.");
        });
}

function pintarCargadoresTecnico(lista) {
    pintarCargadores(lista);
    window.seleccionarCargador = seleccionarCargador;
}

function seleccionarCargador(id) {
    cargadorSeleccionadoId = id;
    const c = cargadores.find(item => item.id === id);

    if (!c) return;

    document.getElementById("modalContenido").innerHTML = `
        <p><strong>ID:</strong> #${c.id}</p>
        <p><strong>Tipo:</strong> ${c.tipo}</p>
        <p><strong>Estado actual:</strong> ${c.estado}</p>
        <p><strong>Carga:</strong> ${c.nivelCarga}%</p>
    `;

    document.getElementById("estadoSelector").value = c.estado;
    document.getElementById("modalDetalles").style.display = "flex";
}

function cargarReportes() {
    fetch("http://localhost:3000/incidencias")
        .then(res => res.json())
        .then(data => {
            const lista = document.getElementById("listaReportes");

            if (!Array.isArray(data) || data.length === 0) {
                lista.innerHTML = "<li>Sin reportes registrados.</li>";
                return;
            }

            lista.innerHTML = data.map(rep => `
                <li style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:10px;">
                    <strong>Cargador #${rep.id_cargador}</strong><br>
                    <small>Descripción: ${rep.descripcion}</small><br>
                    <small>Estado: <b>${rep.estado}</b></small><br>
                    <small>Fecha: ${new Date(rep.fecha_reporte).toLocaleString()}</small><br>
                    ${rep.comentario_tecnico ? `<small><b>Comentario técnico:</b> ${rep.comentario_tecnico}</small><br>` : ""}

                    ${
                        rep.estado !== "Resuelta"
                            ? `
                            <textarea id="comentario-${rep.id_incidencia}" placeholder="Escribe qué se hizo..." style="width:100%; margin-top:10px; padding:8px;"></textarea>
                            <button onclick="resolverIncidencia(${rep.id_incidencia})" style="margin-top:10px;">
                                Marcar resuelta
                            </button>
                            `
                            : ""
                    }
                </li>
            `).join("");
        })
        .catch(() => {
            document.getElementById("listaReportes").innerHTML = "<li>Error al cargar reportes.</li>";
        });
}

window.resolverIncidencia = async function(idIncidencia) {
    const textarea = document.getElementById(`comentario-${idIncidencia}`);
    const comentario = textarea ? textarea.value.trim() : "";

    if (comentario === "") {
        alert("Escribe un comentario técnico antes de resolver la incidencia.");
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/incidencias/${idIncidencia}/resolver`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                comentario_tecnico: comentario
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "No se pudo resolver la incidencia");
            return;
        }

        alert("Incidencia resuelta correctamente");
        cargarReportes();
        cargarCargadores();
    } catch (error) {
        alert("Error de conexión");
    }
};