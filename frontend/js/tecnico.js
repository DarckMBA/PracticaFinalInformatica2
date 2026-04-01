import { getCargadores, getCargadorSeleccionadoId } from './main.js';

const estadosDisponibles = ['Libre', 'Ocupado', 'En reparación'];

document.addEventListener('DOMContentLoaded', () => {
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

		cargador.estado = select.value;

		if (typeof window.seleccionarCargador === 'function') {
			window.seleccionarCargador(idSeleccionado);
		}
	});

	wrapper.appendChild(label);
	wrapper.appendChild(select);

	if (btnCambiarEstado && btnCambiarEstado.parentNode) {
		btnCambiarEstado.insertAdjacentElement('afterend', wrapper);
	}

	return { wrapper, select };
}