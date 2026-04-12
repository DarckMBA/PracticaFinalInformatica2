/**
 * admin.js — Panel de Administrador
 * Mejoras:
 *  - Paginación en tablas (10 filas/página)
 *  - Tiempo relativo en reservas ("hace 2 días", "En proceso")
 *  - Separación clara entre lógica de datos (API) y lógica de UI (render)
 *  - Sin lógica de negocio en la capa de vista
 */

import { initMap, pintarCargadores } from './mapa.js';

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────

const state = {
    cargadores: [],
    cargadorSeleccionadoId: null,
    mapaInicializado: false,
    paginaReservas: 1,
    paginaUsuarios: 1,
    paginaIncidencias: 1,
    FILAS_POR_PAGINA: 8
};

// ─── UTILIDADES DE TIEMPO ─────────────────────────────────────────────────────

/**
 * Devuelve una cadena en formato relativo.
 * Ej: "hace 2 días", "hace 3 horas", "hace 5 min"
 */
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

/**
 * Determina el estado visual de una reserva.
 */
function estadoReservaVisual(reserva) {
    const ahora = Date.now();
    const fin   = new Date(reserva.fecha_fin).getTime();

    if (reserva.estado === "Cancelada")  return { texto: "Cancelada",  color: "#e74c3c", icono: "✗" };
    if (reserva.estado === "Finalizada") return { texto: `Completada ${tiempoRelativo(reserva.fecha_fin)}`, color: "#27ae60", icono: "✓" };
    if (ahora < fin)                     return { texto: "En proceso",  color: "#3498db", icono: "⚡" };
    return { texto: "Expirada", color: "#e67e22", icono: "⚠" };
}

// ─── CAPA DE API (sin lógica de UI) ──────────────────────────────────────────

const API = {
    async getUsuarios()    { const r = await fetch("http://localhost:3000/usuarios");         return r.json(); },
    async getCargadores()  { const r = await fetch("http://localhost:3000/admin/cargadores"); return r.json(); },
    async getReservas()    { const r = await fetch("http://localhost:3000/reservas");          return r.json(); },
    async getIncidencias() { const r = await fetch("http://localhost:3000/incidencias");       return r.json(); },

    async crearUsuario(datos) {
        const r = await fetch("http://localhost:3000/usuarios", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos)
        });
        return r.json();
    },

    async actualizarUsuario(id, datos) {
        const r = await fetch(`http://localhost:3000/usuarios/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos)
        });
        return r.json();
    },

    async darDeBajaUsuario(id) {
        const r = await fetch(`http://localhost:3000/usuarios/${id}/baja`, { method: "PATCH" });
        return r.json();
    },

    async reactivarUsuario(id) {
        const r = await fetch(`http://localhost:3000/usuarios/${id}/reactivar`, { method: "PATCH" });
        return r.json();
    },

    async crearCargador(datos) {
        const r = await fetch("http://localhost:3000/cargadores", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos)
        });
        return r.json();
    },

    async cambiarEstadoCargador(id, estado) {
        const r = await fetch(`http://localhost:3000/cargadores/${id}/estado`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado })
        });
        return r.json();
    },

    async desactivarCargador(id) {
        const r = await fetch(`http://localhost:3000/cargadores/${id}/desactivar`, { method: "PATCH" });
        return r.json();
    },

    async reactivarCargador(id) {
        const r = await fetch(`http://localhost:3000/cargadores/${id}/reactivar`, { method: "PATCH" });
        return r.json();
    }
};

// ─── PAGINACIÓN ───────────────────────────────────────────────────────────────

function paginar(datos, pagina) {
    const inicio = (pagina - 1) * state.FILAS_POR_PAGINA;
    return datos.slice(inicio, inicio + state.FILAS_POR_PAGINA);
}

function renderPaginacion(contenedorId, total, paginaActual, onCambio) {
    const totalPaginas = Math.ceil(total / state.FILAS_POR_PAGINA);
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    if (totalPaginas <= 1) { contenedor.innerHTML = ""; return; }

    contenedor.innerHTML = `
        <div class="paginacion">
            <button ${paginaActual === 1 ? "disabled" : ""} id="${contenedorId}-prev">‹ Anterior</button>
            <span>Página ${paginaActual} de ${totalPaginas}</span>
            <button ${paginaActual === totalPaginas ? "disabled" : ""} id="${contenedorId}-next">Siguiente ›</button>
        </div>
    `;

    const prev = document.getElementById(`${contenedorId}-prev`);
    const next = document.getElementById(`${contenedorId}-next`);
    if (prev) prev.addEventListener("click", () => onCambio(paginaActual - 1));
    if (next) next.addEventListener("click", () => onCambio(paginaActual + 1));
}

// ─── RENDER USUARIOS ──────────────────────────────────────────────────────────

async function cargarUsuarios() {
    const usuarios = await API.getUsuarios();
    renderTablaUsuarios(usuarios, state.paginaUsuarios);
}

function renderTablaUsuarios(usuarios, pagina) {
    state.paginaUsuarios = pagina;
    const lista = document.getElementById("listaUsuarios");
    const paginados = paginar(usuarios, pagina);

    if (paginados.length === 0) { lista.innerHTML = "<p>Sin usuarios.</p>"; return; }

    lista.innerHTML = `
        <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${paginados.map(u => `
                    <tr>
                        <td>${u.id_usuario}</td>
                        <td>${u.nombre}</td>
                        <td>${u.email}</td>
                        <td><span class="badge badge-rol">${u.rol}</span></td>
                        <td><span class="badge ${u.activo ? 'badge-activo' : 'badge-inactivo'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td class="acciones-td">
                            <button class="btn btn-azul btn-sm" onclick="abrirDialogoEditar(${u.id_usuario})">Editar</button>
                            ${u.activo
                                ? `<button class="btn btn-rojo btn-sm" onclick="confirmarBaja(${u.id_usuario})">Baja</button>`
                                : `<button class="btn btn-verde btn-sm" onclick="reactivarUsuario(${u.id_usuario})">Activar</button>`
                            }
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
        </div>
        <div id="paginacionUsuarios"></div>
    `;

    renderPaginacion("paginacionUsuarios", usuarios.length, pagina,
        (p) => renderTablaUsuarios(window._usuariosCache || [], p)
    );

    // Guardar caché para paginación
    window._usuariosCache = usuarios;
}

// ─── RENDER RESERVAS ──────────────────────────────────────────────────────────

async function cargarReservas() {
    const reservas = await API.getReservas();
    renderTablaReservas(reservas, state.paginaReservas);
}

function renderTablaReservas(reservas, pagina) {
    state.paginaReservas = pagina;
    const lista = document.getElementById("listaReservas");
    const paginados = paginar(reservas, pagina);

    if (paginados.length === 0) { lista.innerHTML = "<p>Sin reservas.</p>"; return; }

    lista.innerHTML = `
        <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Usuario</th>
                    <th>Cargador</th>
                    <th>Tipo</th>
                    <th>Iniciada</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${paginados.map(r => {
                    const visual = estadoReservaVisual(r);
                    return `
                        <tr>
                            <td>${r.id_reserva}</td>
                            <td>
                                <strong>${r.nombre_usuario}</strong><br>
                                <small style="color:#888">${r.email_usuario}</small>
                            </td>
                            <td>#${r.id_cargador}</td>
                            <td>${r.tipo}</td>
                            <td title="${new Date(r.fecha_inicio).toLocaleString()}">${tiempoRelativo(r.fecha_inicio)}</td>
                            <td>
                                <span class="badge-estado" style="color:${visual.color}; font-weight:bold;">
                                    ${visual.icono} ${visual.texto}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
        </div>
        <div id="paginacionReservas"></div>
    `;

    renderPaginacion("paginacionReservas", reservas.length, pagina,
        (p) => renderTablaReservas(window._reservasCache || [], p)
    );

    window._reservasCache = reservas;
}

// ─── RENDER INCIDENCIAS ───────────────────────────────────────────────────────

async function cargarIncidencias() {
    const incidencias = await API.getIncidencias();
    renderTablaIncidencias(incidencias, state.paginaIncidencias);
}

function renderTablaIncidencias(incidencias, pagina) {
    state.paginaIncidencias = pagina;
    const lista = document.getElementById("listaIncidencias");
    const paginados = paginar(incidencias, pagina);

    if (paginados.length === 0) { lista.innerHTML = "<p>Sin incidencias.</p>"; return; }

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
                    <th>Comentario técnico</th>
                </tr>
            </thead>
            <tbody>
                ${paginados.map(i => `
                    <tr>
                        <td>${i.id_incidencia}</td>
                        <td>#${i.id_cargador} <small>(${i.tipo_cargador || ""})</small></td>
                        <td>${i.descripcion}</td>
                        <td title="${new Date(i.fecha_reporte).toLocaleString()}">${tiempoRelativo(i.fecha_reporte)}</td>
                        <td>
                            <span class="${i.estado === 'Resuelta' ? 'estado-resuelta' :
                                          i.estado === 'Pendiente' ? 'estado-ocupado' : 'estado-reparacion'}">
                                ${i.estado}
                            </span>
                        </td>
                        <td>${i.comentario_tecnico || '<em style="color:#aaa">—</em>'}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
        </div>
        <div id="paginacionIncidencias"></div>
    `;

    renderPaginacion("paginacionIncidencias", incidencias.length, pagina,
        (p) => renderTablaIncidencias(window._incidenciasCache || [], p)
    );

    window._incidenciasCache = incidencias;
}

// ─── RENDER CARGADORES (MAPA) ─────────────────────────────────────────────────

async function cargarCargadoresAdmin() {
    try {
        const data = await API.getCargadores();
        state.cargadores = data.map(c => ({
            id: c.id_cargador, lat: Number(c.latitud), lng: Number(c.longitud),
            tipo: c.tipo, estado: c.estado, nivelCarga: c.nivel_carga, activo: c.activo
        }));

        if (!state.mapaInicializado) {
            navigator.geolocation.getCurrentPosition(
                ({ coords }) => { initMap(coords.latitude, coords.longitude); pintarCargadores(state.cargadores); state.mapaInicializado = true; },
                ()           => { initMap(40.4168, -3.7038);                  pintarCargadores(state.cargadores); state.mapaInicializado = true; }
            );
        } else {
            pintarCargadores(state.cargadores);
        }
    } catch {
        alert("Error al cargar cargadores.");
    }
}

// ─── ACCIONES USUARIOS ────────────────────────────────────────────────────────

window.abrirDialogoEditar = function(idUsuario) {
    // Buscar en caché o re-cargar
    const usuarios = window._usuariosCache || [];
    const u = usuarios.find(x => x.id_usuario === idUsuario);
    if (!u) return;

    // Crear diálogo de edición
    const overlay = document.createElement("div");
    overlay.className = "admin-dialog-overlay";
    overlay.innerHTML = `
        <div class="admin-dialog">
            <h3 class="admin-dialog-title">Editar usuario #${u.id_usuario}</h3>
            <div class="form-group"><label>Nombre</label><input id="dNombre" value="${u.nombre}"></div>
            <div class="form-group"><label>Email</label><input id="dEmail" value="${u.email}"></div>
            <div class="form-group">
                <label>Rol</label>
                <select id="dRol" class="admin-dialog-select">
                    <option ${u.rol==='usuario'  ? 'selected':''} value="usuario">Usuario</option>
                    <option ${u.rol==='tecnico'  ? 'selected':''} value="tecnico">Técnico</option>
                    <option ${u.rol==='admin'    ? 'selected':''} value="admin">Admin</option>
                </select>
            </div>
            <div class="form-group"><label>Nueva contraseña (dejar vacío para no cambiar)</label><input type="password" id="dPassword" placeholder="••••••"></div>
            <div class="admin-dialog-actions">
                <button class="btn btn-azul admin-dialog-btn" id="dGuardar">Guardar</button>
                <button class="btn admin-dialog-btn admin-dialog-btn-cancel" id="dCancelar">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector("#dCancelar").onclick = () => overlay.remove();
    overlay.querySelector("#dGuardar").onclick = async () => {
        const datos = {
            nombre:   overlay.querySelector("#dNombre").value.trim(),
            email:    overlay.querySelector("#dEmail").value.trim(),
            rol:      overlay.querySelector("#dRol").value,
            password: overlay.querySelector("#dPassword").value
        };
        const res = await API.actualizarUsuario(u.id_usuario, datos);
        if (res.error) { alert(res.error); return; }
        alert("Usuario actualizado correctamente.");
        overlay.remove();
        cargarUsuarios();
    };
};

window.confirmarBaja = function(idUsuario) {
    const overlay = document.createElement("div");
    overlay.className = "admin-dialog-overlay";
    overlay.innerHTML = `
        <div class="admin-dialog">
            <h3 class="admin-dialog-title">¿Dar de baja usuario #${idUsuario}?</h3>
            <p class="admin-dialog-text">El usuario no podrá iniciar sesión hasta que sea reactivado.</p>
            <div class="admin-dialog-actions">
                <button class="btn btn-rojo admin-dialog-btn" id="dConfirmar">Dar de baja</button>
                <button class="btn admin-dialog-btn admin-dialog-btn-cancel" id="dCancelar">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#dCancelar").onclick = () => overlay.remove();
    overlay.querySelector("#dConfirmar").onclick = async () => {
        const res = await API.darDeBajaUsuario(idUsuario);
        if (res.error) { alert(res.error); return; }
        overlay.remove();
        cargarUsuarios();
    };
};

window.reactivarUsuario = async function(idUsuario) {
    const res = await API.reactivarUsuario(idUsuario);
    if (res.error) { alert(res.error); return; }
    cargarUsuarios();
};

// ─── ACCIONES CARGADORES ──────────────────────────────────────────────────────

function seleccionarCargador(id) {
    state.cargadorSeleccionadoId = id;
    const c = state.cargadores.find(x => x.id === id);
    if (!c) return;

    document.getElementById("modalContenido").innerHTML = `
        <p><strong>ID:</strong> #${c.id}</p>
        <p><strong>Tipo:</strong> ${c.tipo}</p>
        <p><strong>Estado actual:</strong> ${c.estado}</p>
        <p><strong>Carga:</strong> ${c.nivelCarga}%</p>
        <p><strong>Visibilidad:</strong> ${c.activo ? "Activo" : "Inactivo"}</p>
    `;

    document.getElementById("estadoSelector").value = c.estado;
    const btnToggle = document.getElementById("btnToggleActivoCargador");
    btnToggle.textContent = c.activo ? "Desactivar cargador" : "Activar cargador";
    btnToggle.style.backgroundColor = c.activo ? "#e67e22" : "#27ae60";

    document.getElementById("modalDetalles").style.display = "flex";
}

// ─── SECCIÓN ACTIVA (NAVEGACIÓN) ──────────────────────────────────────────────

function mostrarSeccion(nombre) {
    const secciones = { usuarios: "seccionUsuarios", cargadores: "seccionCargadores", incidencias: "seccionIncidencias", reservas: "seccionReservas" };
    Object.values(secciones).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    const activa = document.getElementById(secciones[nombre]);
    if (activa) activa.style.display = "block";

    // Cargar datos de la sección
    if (nombre === "usuarios")    cargarUsuarios();
    if (nombre === "cargadores")  cargarCargadoresAdmin();
    if (nombre === "incidencias") cargarIncidencias();
    if (nombre === "reservas")    cargarReservas();
}

// ─── CREAR CARGADOR ───────────────────────────────────────────────────────────

function abrirDialogoCrearCargador() {
    const overlay = document.createElement("div");
    overlay.className = "admin-dialog-overlay";
    overlay.innerHTML = `
        <div class="admin-dialog">
            <h3 class="admin-dialog-title">Nuevo cargador</h3>
            <div class="form-group"><label>Tipo</label>
                <select id="cTipo" class="admin-dialog-select">
                    <option value="Rápido">Rápido</option>
                    <option value="Estándar">Estándar</option>
                    <option value="Compatible">Compatible</option>
                </select>
            </div>
            <div class="form-group"><label>Latitud</label><input id="cLat" type="number" step="0.0001" placeholder="40.4168"></div>
            <div class="form-group"><label>Longitud</label><input id="cLng" type="number" step="0.0001" placeholder="-3.7038"></div>
            <div class="admin-dialog-actions">
                <button class="btn btn-verde admin-dialog-btn" id="cGuardar">Crear</button>
                <button class="btn admin-dialog-btn admin-dialog-btn-cancel" id="cCancelar">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#cCancelar").onclick = () => overlay.remove();
    overlay.querySelector("#cGuardar").onclick = async () => {
        const datos = {
            tipo:     overlay.querySelector("#cTipo").value,
            latitud:  overlay.querySelector("#cLat").value,
            longitud: overlay.querySelector("#cLng").value,
            estado:   "Libre"
        };
        if (!datos.latitud || !datos.longitud) { alert("Introduce latitud y longitud."); return; }
        const res = await API.crearCargador(datos);
        if (res.error) { alert(res.error); return; }
        alert("Cargador creado correctamente.");
        overlay.remove();
        cargarCargadoresAdmin();
    };
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    // Navegación inferior
    document.querySelectorAll(".navAdminBtn").forEach(btn => {
        btn.addEventListener("click", () => mostrarSeccion(btn.dataset.seccion));
    });

    // Mostrar sección inicial
    mostrarSeccion("usuarios");

    // Crear usuario
    document.querySelector(".btnCrearUsuario").onclick = () => {
        const overlay = document.createElement("div");
        overlay.className = "admin-dialog-overlay";
        overlay.innerHTML = `
            <div class="admin-dialog">
                <h3 class="admin-dialog-title">Nuevo usuario</h3>
                <div class="form-group"><label>Nombre</label><input id="uNombre" placeholder="Nombre completo"></div>
                <div class="form-group"><label>Email</label><input id="uEmail" type="email" placeholder="correo@ejemplo.com"></div>
                <div class="form-group"><label>Contraseña</label><input type="password" id="uPassword" placeholder="Mínimo 6 caracteres"></div>
                <div class="form-group"><label>Rol</label>
                    <select id="uRol" class="admin-dialog-select">
                        <option value="usuario">Usuario</option>
                        <option value="tecnico">Técnico</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="admin-dialog-actions">
                    <button class="btn btn-verde admin-dialog-btn" id="uGuardar">Crear</button>
                    <button class="btn admin-dialog-btn admin-dialog-btn-cancel" id="uCancelar">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector("#uCancelar").onclick = () => overlay.remove();
        overlay.querySelector("#uGuardar").onclick = async () => {
            const datos = {
                nombre:   overlay.querySelector("#uNombre").value.trim(),
                email:    overlay.querySelector("#uEmail").value.trim(),
                password: overlay.querySelector("#uPassword").value,
                rol:      overlay.querySelector("#uRol").value
            };
            if (!datos.nombre || !datos.email || !datos.password) { alert("Rellena todos los campos."); return; }
            const res = await API.crearUsuario(datos);
            if (res.error) { alert(res.error); return; }
            alert("Usuario creado correctamente.");
            overlay.remove();
            cargarUsuarios();
        };
    };

    // Crear cargador
    document.querySelector(".btnCrearCargador").onclick = abrirDialogoCrearCargador;

    // Modal cargador — cerrar
    document.getElementById("cerrarModal").onclick = () => {
        document.getElementById("modalDetalles").style.display = "none";
    };

    // Modal cargador — guardar estado
    document.getElementById("btnCambiarEstado").onclick = async () => {
        const nuevoEstado = document.getElementById("estadoSelector").value;
        if (!state.cargadorSeleccionadoId) { alert("Selecciona un cargador."); return; }

        const res = await API.cambiarEstadoCargador(state.cargadorSeleccionadoId, nuevoEstado);
        if (res.error) { alert(res.error); return; }

        const c = state.cargadores.find(x => x.id === state.cargadorSeleccionadoId);
        if (c) c.estado = nuevoEstado === "Operativo" ? "Libre" : nuevoEstado;

        pintarCargadores(state.cargadores);
        seleccionarCargador(state.cargadorSeleccionadoId);
        alert("Estado actualizado correctamente.");
    };

    // Modal cargador — toggle activo
    document.getElementById("btnToggleActivoCargador").onclick = async () => {
        const c = state.cargadores.find(x => x.id === state.cargadorSeleccionadoId);
        if (!c) return;

        const res = c.activo
            ? await API.desactivarCargador(c.id)
            : await API.reactivarCargador(c.id);

        if (res.error) { alert(res.error); return; }
        c.activo = !c.activo;
        seleccionarCargador(c.id);
        pintarCargadores(state.cargadores);
        alert(`Cargador ${c.activo ? "reactivado" : "desactivado"} correctamente.`);
    };

    // Filtro cargadores
    document.getElementById("filtroTipo").addEventListener("change", (e) => {
        const tipo = e.target.value;
        const filtrados = tipo ? state.cargadores.filter(c => c.tipo === tipo) : state.cargadores;
        pintarCargadores(filtrados);
    });

    // Exponer selección de cargador al popup del mapa
    window.seleccionarCargador = seleccionarCargador;
});