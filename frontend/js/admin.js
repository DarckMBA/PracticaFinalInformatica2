import { getCargadores, getCargadorSeleccionadoId, cargarCargadores } from './main.js';
import { getMap } from './mapa.js';

const estadosDisponibles = ['Libre', 'Ocupado', 'En reparación'];
let manejadorDobleClickCrearCargador = null;

document.addEventListener('DOMContentLoaded', () => {
	cargarUsuarios();
	setInterval(cargarUsuarios, 60000);

	const btnCrearUsuario = document.querySelector('.btnCrearUsuario');
	if (btnCrearUsuario) {
		btnCrearUsuario.addEventListener('click', crearUsuarioDesdeUI);
	}

	const btnCrearCargador = document.querySelector('.btnCrearCargador');
	if (btnCrearCargador) {
		btnCrearCargador.addEventListener('click', crearCargadorDesdeUI);
	}

	const btnDarDeBaja = document.querySelector('.btnDarDeBaja');
	if (btnDarDeBaja) {
		btnDarDeBaja.addEventListener('click', darDeBajaPorIdDesdeUI);
	}

	const listaUsuarios = document.getElementById('listaUsuarios');
	if (listaUsuarios) {
		listaUsuarios.addEventListener('click', async (e) => {
			const boton = e.target.closest('.btn-baja-usuario');
			if (!boton) return;

			const id = Number(boton.dataset.id);
			if (!Number.isFinite(id)) return;

			await darDeBajaUsuario(id);
		});
	}

	const btnCambiarEstado = document.getElementById('btnCambiarEstado');
	if (!btnCambiarEstado) return;

	btnCambiarEstado.addEventListener('click', () => {
		const estadoUI = asegurarSelectorEstado();
		const cargador = getCargadores().find(c => c.id === getCargadorSeleccionadoId());

		if (!cargador) {
			alert('Seleccione un cargador para cambiar su estado.');
			return;
		}

		estadoUI.select.value = cargador.estado;
		const visible = estadoUI.wrapper.style.display === 'block';
		estadoUI.wrapper.style.display = visible ? 'none' : 'block';
	});
});

function asegurarSelectorEstado() {
	let wrapper = document.getElementById('estadoSelectorWrap');
	let select = document.getElementById('estadoSelector');

	if (wrapper && select) {
		return { wrapper, select };
	}

	const btnCambiarEstado = document.getElementById('btnCambiarEstado');
	wrapper = document.createElement('div');
	wrapper.id = 'estadoSelectorWrap';
	wrapper.style.display = 'none';
	wrapper.style.marginTop = '10px';

	const label = document.createElement('label');
	label.htmlFor = 'estadoSelector';
	label.textContent = 'Nuevo estado:';
	label.style.display = 'block';
	label.style.marginBottom = '6px';

	select = document.createElement('select');
	select.id = 'estadoSelector';
	select.style.width = '100%';
	select.style.padding = '8px';
	select.style.borderRadius = '8px';
	select.style.border = '1px solid #dcdde1';

	estadosDisponibles.forEach((estado) => {
		const option = document.createElement('option');
		option.value = estado;
		option.textContent = estado;
		select.appendChild(option);
	});

	select.addEventListener('change', () => {
		const idSeleccionado = getCargadorSeleccionadoId();
		const cargador = getCargadores().find(c => c.id === idSeleccionado);
		if (!cargador) return;

		actualizarEstadoCargador(idSeleccionado, select.value);
	});

	wrapper.appendChild(label);
	wrapper.appendChild(select);

	if (btnCambiarEstado && btnCambiarEstado.parentNode) {
		btnCambiarEstado.insertAdjacentElement('afterend', wrapper);
	}

	return { wrapper, select };
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
			lista.innerHTML = "<li style='border-left: 5px solid #ccc;'>No hay usuarios registrados.</li>";
			return;
		}

		lista.innerHTML = usuarios.map((usuario) => {
			const activo = Number(usuario.activo) === 1;
			const color = activo ? 'green' : 'red';
			const estado = activo ? 'Activo' : 'Inactivo';
			const botonBaja = activo
				? `<button class="btn-cancelar btn-baja-usuario" data-id="${usuario.id_usuario}">Dar de baja</button>`
				: '';

			return `
				<li>
					<div>
						<strong>#${usuario.id_usuario} - ${usuario.nombre}</strong><br>
						<small>Email: ${usuario.email}</small><br>
						<small>Rol: ${usuario.rol}</small><br>
						<small>Estado: <span style="color:${color}; font-weight:bold;">${estado}</span></small>
					</div>
					${botonBaja}
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
	const rolesPermitidos = ['usuario', 'tecnico', 'admin'];
	if (!rolesPermitidos.includes(rol)) {
		alert('Rol no válido. Use: usuario, tecnico o admin.');
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
		await cargarUsuarios();
	} catch {
		alert('Error de conexión al crear usuario.');
	}
}

async function crearCargadorDesdeUI() {
	const tipo = await seleccionarOpcionDesdeLista('Seleccionar tipo de cargador', ['Rápido', 'Estándar', 'Compatible']);
	if (!tipo) return;

	const estado = await seleccionarOpcionDesdeLista('Seleccionar disponibilidad inicial', estadosDisponibles);
	if (!estado) return;

	const mapa = getMap();
	if (!mapa) {
		alert('El mapa aún no está listo. Espere unos segundos e inténtelo de nuevo.');
		return;
	}

	activarModoCreacionEnMapa(mapa, { tipo, estado });
}

function activarModoCreacionEnMapa(mapa, { tipo, estado }) {
	desactivarModoCreacionEnMapa(mapa);
	if (mapa.doubleClickZoom) {
		mapa.doubleClickZoom.disable();
	}

	mostrarMensajeModal(
		'Seleccionar ubicación',
		'Doble clic en el mapa para crear el cargador en esa ubicación.'
	);

	manejadorDobleClickCrearCargador = async (e) => {
		const latitud = Number(e.latlng.lat.toFixed(6));
		const longitud = Number(e.latlng.lng.toFixed(6));

		try {
			const res = await fetch('http://localhost:3000/cargadores', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tipo,
					latitud,
					longitud,
					estado
				})
			});

			const data = await res.json();
			if (!res.ok) {
				alert(data.error || 'No se pudo crear el cargador.');
				return;
			}

			alert('Cargador creado correctamente.');
			cargarCargadores();
		} catch {
			alert('Error de conexión al crear cargador.');
		} finally {
			desactivarModoCreacionEnMapa(mapa);
		}
	};

	mapa.on('dblclick', manejadorDobleClickCrearCargador);
}

function desactivarModoCreacionEnMapa(mapa) {
	if (manejadorDobleClickCrearCargador) {
		mapa.off('dblclick', manejadorDobleClickCrearCargador);
		manejadorDobleClickCrearCargador = null;
	}

	if (mapa.doubleClickZoom) {
		mapa.doubleClickZoom.enable();
	}
}

function seleccionarOpcionDesdeLista(titulo, opciones) {
	return new Promise((resolve) => {
		const overlay = document.createElement('div');
		overlay.className = 'admin-dialog-overlay';

		const box = document.createElement('div');
		box.className = 'admin-dialog';

		const title = document.createElement('h3');
		title.textContent = titulo;
		title.className = 'admin-dialog-title';

		const select = document.createElement('select');
		select.className = 'admin-dialog-select';

		opciones.forEach((valor) => {
			const option = document.createElement('option');
			option.value = valor;
			option.textContent = valor;
			select.appendChild(option);
		});

		const actions = document.createElement('div');
		actions.className = 'admin-dialog-actions';

		const btnCancelar = document.createElement('button');
		btnCancelar.type = 'button';
		btnCancelar.textContent = 'Cancelar';
		btnCancelar.className = 'admin-dialog-btn admin-dialog-btn-cancel';

		const btnAceptar = document.createElement('button');
		btnAceptar.type = 'button';
		btnAceptar.textContent = 'Aceptar';
		btnAceptar.className = 'admin-dialog-btn';

		const limpiar = (valor) => {
			overlay.remove();
			resolve(valor);
		};

		btnCancelar.addEventListener('click', () => limpiar(null));
		btnAceptar.addEventListener('click', () => limpiar(select.value));
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) limpiar(null);
		});

		actions.appendChild(btnCancelar);
		actions.appendChild(btnAceptar);
		box.appendChild(title);
		box.appendChild(select);
		box.appendChild(actions);
		overlay.appendChild(box);
		document.body.appendChild(overlay);
	});
}

async function actualizarEstadoCargador(idCargador, estado) {
	try {
		const res = await fetch(`http://localhost:3000/cargadores/${idCargador}/estado`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ estado })
		});

		const data = await res.json();
		if (!res.ok) {
			alert(data.error || 'No se pudo actualizar el estado del cargador.');
			return;
		}

		const cargador = getCargadores().find(c => c.id === idCargador);
		if (cargador) {
			cargador.estado = estado;
		}

		cargarCargadores();
		if (typeof window.seleccionarCargador === 'function') {
			window.seleccionarCargador(idCargador);
		}
	} catch {
		alert('Error de conexión al actualizar el estado del cargador.');
	}
}

function mostrarMensajeModal(titulo, mensaje) {
	return new Promise((resolve) => {
		const overlay = document.createElement('div');
		overlay.className = 'admin-dialog-overlay';

		const box = document.createElement('div');
		box.className = 'admin-dialog';

		const title = document.createElement('h3');
		title.textContent = titulo;
		title.className = 'admin-dialog-title';

		const text = document.createElement('p');
		text.textContent = mensaje;
		text.className = 'admin-dialog-text';

		const actions = document.createElement('div');
		actions.className = 'admin-dialog-actions';

		const btnEntendido = document.createElement('button');
		btnEntendido.type = 'button';
		btnEntendido.textContent = 'Entendido';
		btnEntendido.className = 'admin-dialog-btn';

		const cerrar = () => {
			overlay.remove();
			resolve();
		};

		btnEntendido.addEventListener('click', cerrar);
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) cerrar();
		});

		actions.appendChild(btnEntendido);
		box.appendChild(title);
		box.appendChild(text);
		box.appendChild(actions);
		overlay.appendChild(box);
		document.body.appendChild(overlay);
	});
}

async function darDeBajaPorIdDesdeUI() {
	const idInput = prompt('ID del usuario a dar de baja:');
	if (!idInput) return;

	const id = Number(idInput);
	if (!Number.isFinite(id)) {
		alert('ID inválido.');
		return;
	}

	await darDeBajaUsuario(id);
}

async function darDeBajaUsuario(idUsuario) {
	if (!confirm(`¿Seguro que desea dar de baja al usuario #${idUsuario}?`)) {
		return;
	}

	try {
		const res = await fetch(`http://localhost:3000/usuarios/${idUsuario}/baja`, {
			method: 'PATCH'
		});

		const data = await res.json();
		if (!res.ok) {
			alert(data.error || 'No se pudo dar de baja al usuario.');
			return;
		}

		alert('Usuario dado de baja correctamente.');
		await cargarUsuarios();
	} catch {
		alert('Error de conexión al dar de baja usuario.');
	}
}