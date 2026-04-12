// ─── ESTADO ───────────────────────────────────────────────────────────────────

const state = {
    FILAS_POR_PAGINA: 8,
    paginaPendientes: 1,
    paginaResueltas: 1
};

// ─── CAPA API ─────────────────────────────────────────────────────────────────

const API = {
    async getIncidencias() {
        const r = await fetch("http://localhost:3000/incidencias");
        if (!r.ok) throw new Error("Error al obtener incidencias");
        return r.json();
    },

    async resolverIncidencia(id, comentario) {
        const r = await fetch(`http://localhost:3000/incidencias/${id}/resolver`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comentario_tecnico: comentario })
        });
        return r.json();
    }
};

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

function tiempoRelativo(fecha) {
    const diff = Date.now() - new Date(fecha).getTime();
    const min  = Math.floor(diff / 60000);
    const h    = Math.floor(diff / 3600000);
    const d    = Math.floor(diff / 86400000);
    if (min < 1)  return "Ahora mismo";
    if (min < 60) return `hace ${min} min`;
    if (h < 24)   return `hace ${h} h`;
    if (d === 1)  return "hace 1 día";
    return `hace ${d} días`;
}

function urlGoogleMaps(lat, lng) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

function paginar(datos, pagina) {
    const inicio = (pagina - 1) * state.FILAS_POR_PAGINA;
    return datos.slice(inicio, inicio + state.FILAS_POR_PAGINA);
}

function renderPaginacion(contenedorId, total, pagina, callback) {
    const totalPaginas = Math.ceil(total / state.FILAS_POR_PAGINA);
    const el = document.getElementById(contenedorId);
    if (!el) return;
    if (totalPaginas <= 1) { el.innerHTML = ""; return; }

    el.innerHTML = `
        <div class="paginacion">
            <button ${pagina === 1 ? "disabled" : ""} id="${contenedorId}-prev">‹ Anterior</button>
            <span>Página ${pagina} de ${totalPaginas}</span>
            <button ${pagina === totalPaginas ? "disabled" : ""} id="${contenedorId}-next">Siguiente ›</button>
        </div>
    `;

    const prev = document.getElementById(`${contenedorId}-prev`);
    const next = document.getElementById(`${contenedorId}-next`);
    if (prev) prev.addEventListener("click", () => window[callback](pagina - 1));
    if (next) next.addEventListener("click", () => window[callback](pagina + 1));
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

/**
 * Renderiza la tabla de incidencias pendientes (o en revisión).
 */
function renderPendientes(incidencias, pagina) {
    state.paginaPendientes = pagina;
    window._pendientesCache = incidencias;

    const lista = document.getElementById("listaPendientes");
    const paginados = paginar(incidencias, pagina);

    if (incidencias.length === 0) {
        lista.innerHTML = `<div class="empty-state">✅ No hay incidencias pendientes.</div>`;
        return;
    }

    lista.innerHTML = `
        <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Cargador</th>
                    <th>Descripción</th>
                    <th>Reportada</th>
                    <th>Estado</th>
                    <th>Ubicación</th>
                    <th>Resolver</th>
                </tr>
            </thead>
            <tbody>
                ${paginados.map(i => `
                    <tr id="fila-${i.id_incidencia}">
                        <td>${i.id_incidencia}</td>
                        <td>#${i.id_cargador} <small>(${i.tipo_cargador || "—"})</small></td>
                        <td>${i.descripcion}</td>
                        <td title="${new Date(i.fecha_reporte).toLocaleString()}">${tiempoRelativo(i.fecha_reporte)}</td>
                        <td><span class="estado-ocupado">${i.estado}</span></td>
                        <td>
                            <a href="${urlGoogleMaps(i.latitud, i.longitud)}"
                               target="_blank"
                               class="btn btn-azul btn-sm mapa-link">
                               📍 Ver mapa
                            </a>
                        </td>
                        <td>
                            <div class="resolver-inline">
                                <input type="text" id="comentario-${i.id_incidencia}"
                                       placeholder="Comentario técnico…"
                                       class="input-comentario">
                                <button class="btn btn-verde btn-sm"
                                        onclick="resolverIncidencia(${i.id_incidencia})">
                                    ✓ Resolver
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
        </div>
        <div id="pagPendientes"></div>
    `;

    const pagDiv = document.createElement("div");
    pagDiv.id = "pagPendientes";
    lista.appendChild(pagDiv);
    renderPaginacion("pagPendientes", incidencias.length, pagina, "cambiarPaginaPendientes");
}

/**
 * Renderiza la tabla de incidencias resueltas.
 */
function renderResueltas(incidencias, pagina) {
    state.paginaResueltas = pagina;
    window._resueltasCache = incidencias;

    const lista = document.getElementById("listaResueltas");
    const paginados = paginar(incidencias, pagina);

    if (incidencias.length === 0) {
        lista.innerHTML = `<div class="empty-state">Sin incidencias resueltas aún.</div>`;
        return;
    }

    lista.innerHTML = `
        <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Cargador</th>
                    <th>Descripción</th>
                    <th>Resuelta</th>
                    <th>Comentario técnico</th>
                    <th>Ubicación</th>
                </tr>
            </thead>
            <tbody>
                ${paginados.map(i => `
                    <tr>
                        <td>${i.id_incidencia}</td>
                        <td>#${i.id_cargador} <small>(${i.tipo_cargador || "—"})</small></td>
                        <td>${i.descripcion}</td>
                        <td title="${new Date(i.fecha_reporte).toLocaleString()}">${tiempoRelativo(i.fecha_reporte)}</td>
                        <td>${i.comentario_tecnico || '<em style="color:#aaa">—</em>'}</td>
                        <td>
                            <a href="${urlGoogleMaps(i.latitud, i.longitud)}"
                               target="_blank"
                               class="btn btn-azul btn-sm mapa-link">
                               📍 Ver mapa
                            </a>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
        </div>
        <div id="pagResueltas"></div>
    `;

    const pagDiv = document.createElement("div");
    pagDiv.id = "pagResueltas";
    lista.appendChild(pagDiv);
    renderPaginacion("pagResueltas", incidencias.length, pagina, "cambiarPaginaResueltas");
}

// ─── CALLBACKS PAGINACIÓN ─────────────────────────────────────────────────────

window.cambiarPaginaPendientes = (p) => renderPendientes(window._pendientesCache || [], p);
window.cambiarPaginaResueltas  = (p) => renderResueltas(window._resueltasCache  || [], p);

// ─── ACCIÓN: RESOLVER INCIDENCIA ─────────────────────────────────────────────

window.resolverIncidencia = async function(idIncidencia) {
    const input = document.getElementById(`comentario-${idIncidencia}`);
    const comentario = input ? input.value.trim() : "";

    if (!comentario) {
        toast("Escribe un comentario técnico antes de resolver la incidencia.", "error");
        input && input.focus();
        return;
    }

    try {
        const data = await API.resolverIncidencia(idIncidencia, comentario);
        if (data.error) { toast(data.error, "error"); return; }
        toast("✅ Incidencia resuelta correctamente.");
        await cargarIncidencias(); // Recargar ambas tablas
    } catch {
        toast("Error de conexión al resolver la incidencia.", "error");
    }
};

// ─── CARGA PRINCIPAL ─────────────────────────────────────────────────────────

async function cargarIncidencias() {
    try {
        const todas = await API.getIncidencias();

        const pendientes = todas.filter(i => i.estado !== "Resuelta");
        const resueltas  = todas.filter(i => i.estado === "Resuelta");

        renderPendientes(pendientes, state.paginaPendientes);
        renderResueltas(resueltas,  state.paginaResueltas);

        // Actualizar contadores en los títulos
        const elPend = document.getElementById("contadorPendientes");
        const elRes  = document.getElementById("contadorResueltas");
        if (elPend) elPend.textContent = `(${pendientes.length})`;
        if (elRes)  elRes.textContent  = `(${resueltas.length})`;

    } catch (err) {
        console.error(err);
        document.getElementById("listaPendientes").innerHTML = "<p>Error al cargar incidencias.</p>";
        document.getElementById("listaResueltas").innerHTML  = "<p>Error al cargar incidencias.</p>";
    }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    cargarIncidencias();
});


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