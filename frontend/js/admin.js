import { initMap, pintarCargadores, getMap } from './mapa.js';

let cargadores = [];
let cargadorSeleccionadoId = null;
let mapaInicializado = false;

document.addEventListener('DOMContentLoaded', () => {
    configurarNavegacion();
    cargarUsuarios();
    cargarIncidencias();
    cargarCargadores();
    cargarReservas();

    setInterval(() => {
        cargarUsuarios();
        cargarIncidencias();
        cargarCargadores();
        cargarReservas();
    }, 60000);

    document.querySelector('.btnCrearUsuario')?.addEventListener('click', crearUsuarioDesdeUI);
    document.querySelector('.btnCrearCargador')?.addEventListener('click', crearCargadorDesdeUI);

    document.getElementById("cerrarModal").onclick = () => {
        document.getElementById("modalDetalles").style.display = "none";
    };

    document.getElementById("btnCambiarEstado").onclick = async () => {
        let estado = document.getElementById("estadoSelector").value;

        if (!cargadorSeleccionadoId) {
            alert("Selecciona un cargador.");
            return;
        }

        if (estado === "Operativo") {
            estado = "Libre";
        }

        try {
            const res = await fetch(`http://localhost:3000/cargadores/${cargadorSeleccionadoId}/estado`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "No se pudo actualizar el estado.");
                return;
            }

            const cargador = cargadores.find(c => c.id === cargadorSeleccionadoId);
            if (cargador) cargador.estado = estado;

            pintarCargadoresAdmin(cargadores);
            seleccionarCargador(cargadorSeleccionadoId);
            cargarIncidencias();

            alert("Estado actualizado correctamente.");
        } catch (error) {
            console.log(error);
            alert("Error de conexión.");
        }
    };

    const btnToggleActivoCargador = document.getElementById("btnToggleActivoCargador");
    if (btnToggleActivoCargador) {
        btnToggleActivoCargador.onclick = async () => {
            if (!cargadorSeleccionadoId) {
                alert("Selecciona un cargador.");
                return;
            }

            const cargador = cargadores.find(c => c.id === cargadorSeleccionadoId);
            if (!cargador) return;

            const url = cargador.activo === 1
                ? `http://localhost:3000/cargadores/${cargador.id}/desactivar`
                : `http://localhost:3000/cargadores/${cargador.id}/reactivar`;

            try {
                const res = await fetch(url, { method: "PATCH" });
                const data = await res.json();

                if (!res.ok) {
                    alert(data.error || "No se pudo cambiar la visibilidad del cargador.");
                    return;
                }

                cargador.activo = cargador.activo === 1 ? 0 : 1;
                alert(data.mensaje || "Visibilidad del cargador actualizada.");

                cargarCargadores();
                document.getElementById("modalDetalles").style.display = "none";
            } catch (error) {
                console.log(error);
                alert("Error de conexión.");
            }
        };
    }

    document.getElementById("listaUsuarios")?.addEventListener("click", async (e) => {
        const btnBaja = e.target.closest(".btn-baja-usuario");
        const btnReactivar = e.target.closest(".btn-reactivar-usuario");
        const btnEditar = e.target.closest(".btn-editar-usuario");

        if (btnBaja) {
            await darDeBajaUsuario(Number(btnBaja.dataset.id));
        }

        if (btnReactivar) {
            await reactivarUsuario(Number(btnReactivar.dataset.id));
        }

        if (btnEditar) {
            await editarUsuarioDesdeUI(
                Number(btnEditar.dataset.id),
                btnEditar.dataset.nombre,
                btnEditar.dataset.email,
                btnEditar.dataset.rol
            );
        }
    });

    const filtroSelect = document.getElementById('filtroTipo');
    if (filtroSelect) {
        filtroSelect.addEventListener('change', (e) => {
            const tipo = e.target.value;
            const filtrados = tipo ? cargadores.filter(c => c.tipo === tipo) : cargadores;
            pintarCargadoresAdmin(filtrados);
        });
    }
});

function configurarNavegacion() {
    const botones = document.querySelectorAll(".navAdminBtn");

    botones.forEach(btn => {
        btn.addEventListener("click", () => {
            const seccion = btn.dataset.seccion;

            document.getElementById("seccionUsuarios").style.display = seccion === "usuarios" ? "block" : "none";
            document.getElementById("seccionCargadores").style.display = seccion === "cargadores" ? "block" : "none";
            document.getElementById("seccionIncidencias").style.display = seccion === "incidencias" ? "block" : "none";
            document.getElementById("seccionReservas").style.display = seccion === "reservas" ? "block" : "none";

            if (seccion === "cargadores") {
                setTimeout(() => {
                    const mapa = getMap();
                    if (mapa) mapa.invalidateSize();
                }, 150);
            }
        });
    });
}

async function cargarUsuarios() {
    const lista = document.getElementById('listaUsuarios');
    if (!lista) return;

    try {
        const res = await fetch('http://localhost:3000/usuarios');
        const usuarios = await res.json();

        if (!res.ok) {
            lista.innerHTML = '<li>Error al cargar usuarios.</li>';
            return;
        }

        if (!Array.isArray(usuarios) || usuarios.length === 0) {
            lista.innerHTML = "<li>No hay usuarios registrados.</li>";
            return;
        }

        lista.innerHTML = usuarios.map((usuario) => {
            const activo = Number(usuario.activo) === 1;
            const color = activo ? 'green' : 'red';
            const estado = activo ? 'Activo' : 'Inactivo';

            return `
                <li style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:10px;">
                    <div>
                        <strong>#${usuario.id_usuario} - ${usuario.nombre}</strong><br>
                        <small>Email: ${usuario.email}</small><br>
                        <small>Rol: ${usuario.rol}</small><br>
                        <small>Estado: <span style="color:${color}; font-weight:bold;">${estado}</span></small>
                    </div>
                    <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
                        <button 
                            class="btn-editar-usuario btn-cancelar" 
                            data-id="${usuario.id_usuario}"
                            data-nombre="${usuario.nombre}"
                            data-email="${usuario.email}"
                            data-rol="${usuario.rol}"
                            style="background:#1f6feb;"
                        >
                            Editar
                        </button>

                        ${activo ? `<button class="btn-baja-usuario btn-cancelar" data-id="${usuario.id_usuario}">Desactivar</button>` : ""}
                        ${!activo ? `<button class="btn-reactivar-usuario btn-cancelar" data-id="${usuario.id_usuario}" style="background:#2e8b57;">Reactivar</button>` : ""}
                    </div>
                </li>
            `;
        }).join('');
    } catch {
        lista.innerHTML = '<li>Error de conexión al cargar los usuarios.</li>';
    }
}

async function crearUsuarioDesdeUI() {
    const nombre = prompt('Nombre del nuevo usuario:');
    if (!nombre) return;

    const email = prompt('Email del nuevo usuario:');
    if (!email) return;

    const password = prompt('Contraseña del nuevo usuario:');
    if (!password) return;

    const rolInput = prompt('Rol (usuario, tecnico, admin):', 'usuario');
    if (!rolInput) return;

    const rol = rolInput.trim().toLowerCase();
    if (!['usuario', 'tecnico', 'admin'].includes(rol)) {
        alert('Rol no válido.');
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), password, rol })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'No se pudo crear el usuario.');
            return;
        }

        alert('Usuario creado correctamente.');
        cargarUsuarios();
    } catch {
        alert('Error de conexión al crear usuario.');
    }
}

async function editarUsuarioDesdeUI(idUsuario, nombreActual, emailActual, rolActual) {
    const nombre = prompt('Nuevo nombre:', nombreActual);
    if (nombre === null) return;

    const email = prompt('Nuevo email:', emailActual);
    if (email === null) return;

    const rolInput = prompt('Nuevo rol (usuario, tecnico, admin):', rolActual);
    if (rolInput === null) return;

    const rol = rolInput.trim().toLowerCase();
    if (!['usuario', 'tecnico', 'admin'].includes(rol)) {
        alert('Rol no válido.');
        return;
    }

    const password = prompt('Nueva contraseña (deja vacío para no cambiarla):', '');

    try {
        const res = await fetch(`http://localhost:3000/usuarios/${idUsuario}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombre.trim(),
                email: email.trim(),
                rol,
                password: password === null ? "" : password
            })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'No se pudo actualizar el usuario.');
            return;
        }

        alert('Usuario actualizado correctamente.');
        cargarUsuarios();
    } catch {
        alert('Error de conexión al actualizar usuario.');
    }
}

async function darDeBajaUsuario(idUsuario) {
    if (!confirm(`¿Seguro que quieres desactivar al usuario #${idUsuario}?`)) return;

    try {
        const res = await fetch(`http://localhost:3000/usuarios/${idUsuario}/baja`, {
            method: 'PATCH'
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'No se pudo desactivar el usuario.');
            return;
        }

        alert('Usuario desactivado correctamente.');
        cargarUsuarios();
    } catch {
        alert('Error de conexión al desactivar usuario.');
    }
}

async function reactivarUsuario(idUsuario) {
    if (!confirm(`¿Seguro que quieres reactivar al usuario #${idUsuario}?`)) return;

    try {
        const res = await fetch(`http://localhost:3000/usuarios/${idUsuario}/reactivar`, {
            method: 'PATCH'
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'No se pudo reactivar el usuario.');
            return;
        }

        alert('Usuario reactivado correctamente.');
        cargarUsuarios();
    } catch {
        alert('Error de conexión al reactivar usuario.');
    }
}

function cargarCargadores() {
    fetch("http://localhost:3000/admin/cargadores")
        .then(res => res.json())
        .then(data => {
            cargadores = data.map(c => ({
                id: c.id_cargador,
                lat: Number(c.latitud),
                lng: Number(c.longitud),
                tipo: c.tipo,
                estado: c.estado,
                nivelCarga: c.nivel_carga,
                activo: Number(c.activo)
            }));

            if (!mapaInicializado) {
                navigator.geolocation.getCurrentPosition(
                    ({ coords }) => {
                        initMap(coords.latitude, coords.longitude);
                        pintarCargadoresAdmin(cargadores);
                        mapaInicializado = true;
                    },
                    () => {
                        initMap(40.4168, -3.7038);
                        pintarCargadoresAdmin(cargadores);
                        mapaInicializado = true;
                    }
                );
            } else {
                pintarCargadoresAdmin(cargadores);
            }
        })
        .catch(error => {
            console.log(error);
        });
}

function pintarCargadoresAdmin(lista) {
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
        <p><strong>Visible:</strong> ${c.activo === 1 ? "Sí" : "No"}</p>
    `;

    document.getElementById("estadoSelector").value = c.estado;

    const btnToggle = document.getElementById("btnToggleActivoCargador");
    if (btnToggle) {
        btnToggle.textContent = c.activo === 1 ? "Desactivar cargador" : "Reactivar cargador";
    }

    document.getElementById("modalDetalles").style.display = "flex";
}

async function crearCargadorDesdeUI() {
    const tipo = prompt("Tipo de cargador (Rápido, Estándar, Compatible):", "Rápido");
    if (!tipo) return;

    let estado = prompt("Estado inicial (Libre, Ocupado, En reparación):", "Libre");
    if (!estado) return;

    if (estado === "Operativo") estado = "Libre";

    const mapa = getMap();
    if (!mapa) {
        alert("El mapa aún no está listo.");
        return;
    }

    alert("Haz clic en el mapa para colocar el nuevo cargador.");

    const manejadorClick = async (e) => {
        const latitud = Number(e.latlng.lat.toFixed(6));
        const longitud = Number(e.latlng.lng.toFixed(6));

        try {
            const res = await fetch("http://localhost:3000/cargadores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo,
                    latitud,
                    longitud,
                    estado
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "No se pudo crear el cargador.");
                return;
            }

            alert("Cargador creado correctamente.");
            cargarCargadores();
        } catch (error) {
            console.log(error);
            alert("Error de conexión al crear cargador.");
        } finally {
            mapa.off("click", manejadorClick);
        }
    };

    mapa.on("click", manejadorClick);
}

async function cargarIncidencias() {
    const lista = document.getElementById("listaIncidencias");
    if (!lista) return;

    try {
        const res = await fetch("http://localhost:3000/incidencias");
        const data = await res.json();

        if (!res.ok) {
            lista.innerHTML = "<li>Error al cargar incidencias.</li>";
            return;
        }

        if (!Array.isArray(data) || data.length === 0) {
            lista.innerHTML = "<li>Sin incidencias registradas.</li>";
            return;
        }

        lista.innerHTML = data.map(inc => `
            <li style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:10px;">
                <strong>Incidencia #${inc.id_incidencia}</strong><br>
                <small>Cargador: #${inc.id_cargador}</small><br>
                <small>Descripción: ${inc.descripcion}</small><br>
                <small>Estado: <b>${inc.estado}</b></small><br>
                <small>Fecha: ${new Date(inc.fecha_reporte).toLocaleString()}</small><br>
                ${inc.comentario_tecnico ? `<small><b>Comentario técnico:</b> ${inc.comentario_tecnico}</small>` : ""}
            </li>
        `).join("");
    } catch {
        lista.innerHTML = "<li>Error de conexión al cargar incidencias.</li>";
    }
}

async function cargarReservas() {
    const lista = document.getElementById("listaReservas");
    if (!lista) return;

    try {
        const res = await fetch("http://localhost:3000/reservas");
        const data = await res.json();

        if (!res.ok) {
            lista.innerHTML = "<li>Error al cargar reservas.</li>";
            return;
        }

        if (!Array.isArray(data) || data.length === 0) {
            lista.innerHTML = "<li>Sin reservas registradas.</li>";
            return;
        }

        lista.innerHTML = data.map(reserva => {
            let colorEstado = "#666";
            if (reserva.estado === "Activa") colorEstado = "green";
            if (reserva.estado === "Cancelada") colorEstado = "red";
            if (reserva.estado === "Finalizada") colorEstado = "blue";

            return `
                <li style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:10px;">
                    <strong>Reserva #${reserva.id_reserva}</strong><br>
                    <small>Usuario: ${reserva.nombre_usuario} (${reserva.email_usuario})</small><br>
                    <small>Cargador: #${reserva.id_cargador} (${reserva.tipo})</small><br>
                    <small>Inicio: ${new Date(reserva.fecha_inicio).toLocaleString()}</small><br>
                    <small>Fin: ${new Date(reserva.fecha_fin).toLocaleString()}</small><br>
                    <small>Estado: <span style="color:${colorEstado}; font-weight:bold;">${reserva.estado}</span></small>
                </li>
            `;
        }).join("");
    } catch {
        lista.innerHTML = "<li>Error de conexión al cargar reservas.</li>";
    }
}