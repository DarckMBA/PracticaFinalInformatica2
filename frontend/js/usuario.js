import { getCargadores, getCargadorSeleccionadoId } from './main.js';
import { pintarCargadores } from './mapa.js';

document.addEventListener('DOMContentLoaded', () => {
	actualizarHistorialUI();
	setInterval(actualizarHistorialUI, 60000);

	const btnReservar = document.getElementById('btnReservarModal');
	if (btnReservar) {
		btnReservar.onclick = reservarCargador;
	}
});

async function reservarCargador() {
	const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
	const cargador = getCargadores().find(c => c.id === getCargadorSeleccionadoId());

	if (!usuario) {
		alert('Debes iniciar sesión.');
		return;
	}

	if (!cargador || cargador.estado !== 'Libre') {
		alert('No disponible.');
		return;
	}

	try {
		const respuesta = await fetch('http://localhost:3000/reservas', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id_usuario: usuario.id_usuario,
				id_cargador: cargador.id
			})
		});

		const data = await respuesta.json();

		if (!respuesta.ok) {
			alert(data.error || 'No se pudo guardar la reserva.');
			return;
		}

		cargador.estado = 'Ocupado';
		pintarCargadores(getCargadores());
		actualizarHistorialUI();

		const modal = document.getElementById('modalDetalles');
		if (modal) {
			modal.style.display = 'none';
		}

		alert('Reserva guardada correctamente.');
	} catch (error) {
		alert('No se pudo conectar con el servidor.');
	}
}

window.cancelarReserva = async function(idCargador) {
	if (!confirm('¿Cancelar reserva?')) return;

	try {
		const res = await fetch(`http://localhost:3000/reservas/${idCargador}`, {
			method: 'DELETE'
		});

		const data = await res.json();

		if (!res.ok) {
			alert(data.error || 'Error al cancelar');
			return;
		}

		const cargador = getCargadores().find(c => c.id === idCargador);
		if (cargador) cargador.estado = 'Libre';

		pintarCargadores(getCargadores());
		actualizarHistorialUI();

		alert('Reserva cancelada correctamente.');
	} catch (error) {
		alert('Error al cancelar la reserva.');
	}
};

async function actualizarHistorialUI() {
	const lista = document.getElementById('listaHistorial');
	const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));

	if (!usuario || !lista) return;

	try {
		const res = await fetch(`http://localhost:3000/reservas/usuario/${usuario.id_usuario}`);
		const historial = await res.json();

		if (!Array.isArray(historial) || historial.length === 0) {
			lista.innerHTML = "<li style='border-left: 5px solid #ccc;'>Sin historial de reservas.</li>";
			return;
		}

		lista.innerHTML = historial.map((reserva) => {
			const fechaInicio = new Date(reserva.fecha_inicio).toLocaleString();
			const fechaFin = new Date(reserva.fecha_fin).toLocaleString();

			let colorEstado = '#666';
			if (reserva.estado === 'Activa') colorEstado = 'green';
			if (reserva.estado === 'Cancelada') colorEstado = 'red';
			if (reserva.estado === 'Finalizada') colorEstado = 'blue';

			const botonCancelar = reserva.estado === 'Activa'
				? `<button class="btn-cancelar" onclick="cancelarReserva(${reserva.id_cargador})">Cancelar</button>`
				: '';

			return `
				<li>
					<div>
						<strong>Cargador #${reserva.id_cargador}</strong> (${reserva.tipo})<br>
						<small>Inicio: ${fechaInicio}</small><br>
						<small>Fin: ${fechaFin}</small><br>
						<small>Estado: <span style="color:${colorEstado}; font-weight:bold;">${reserva.estado}</span></small>
					</div>
					${botonCancelar}
				</li>
			`;
		}).join('');
	} catch (error) {
		lista.innerHTML = '<li>Error al cargar el historial.</li>';
	}
}

