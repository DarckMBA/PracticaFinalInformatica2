function comprobarAcceso(rolPermitido) {
const usuarioGuardado = localStorage.getItem("usuarioLogueado");

if (!usuarioGuardado) {
    window.location.href = "login.html";
    return;
}

const usuario = JSON.parse(usuarioGuardado);

if (usuario.rol !== rolPermitido) {
    window.location.href = "login.html";
    return;
}
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "login.html";
}