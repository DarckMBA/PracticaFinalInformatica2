document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("Email").value;
  const password = document.getElementById("password").value;
  const mensaje = document.getElementById("mensaje");

  //CONTRASEÑA Y EMAIL DE ADMIN
  const emailadmin = "admin@gmail.com";
  const passwordadmin = "1234";
  //CONTRASEÑA Y EMAIL DE TÉCNICO
  const emailtecnico = "tecnico@gmail.com";
  const passwordtecnico = "1234";
  //CONTRASEÑA Y EMAIL DE USUARIO
  const emailusuario = "usuario@gmail.com";
  const passwordusuario = "1234";

  //LOGIN DE ADMIN
  if (email === emailadmin && password === passwordadmin) {
    localStorage.setItem("usuarioLogueado", JSON.stringify({
      email: emailadmin,
      rol: "admin"
    }));

    mensaje.style.color = "green";
    mensaje.textContent = "Login correcto";

    setTimeout(() => {
      window.location.href = "admin.html";
    }, 1000);

  //LOGIN DE TÉCNICO
  } else if (email === emailtecnico && password === passwordtecnico) {
    localStorage.setItem("usuarioLogueado", JSON.stringify({
      email: emailtecnico,
      rol: "tecnico"
    }));

    mensaje.style.color = "green";
    mensaje.textContent = "Login correcto";

    setTimeout(() => {
      window.location.href = "tecnico.html";
    }, 1000);

  //LOGIN DE USUARIO
  } else if (email === emailusuario && password === passwordusuario) {
    localStorage.setItem("usuarioLogueado", JSON.stringify({
      email: emailusuario,
      rol: "usuario"
    }));

    mensaje.style.color = "green";
    mensaje.textContent = "Login correcto";

    setTimeout(() => {
      window.location.href = "usuario.html";
    }, 1000);

  //LOGIN FALLIDO
  } else {
    mensaje.style.color = "red";
    mensaje.textContent = "Correo o contraseña incorrectos";
  }
});