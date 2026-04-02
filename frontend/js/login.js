document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const mensaje = document.getElementById("mensaje");

  try {
    const respuesta = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      mensaje.style.color = "red";
      mensaje.textContent = data.error;
      return;
    }

    localStorage.setItem("usuarioLogueado", JSON.stringify(data.usuario));

    mensaje.style.color = "green";
    mensaje.textContent = "Login correcto";

    setTimeout(() => {
      if (data.usuario.rol === "admin") {
        window.location.href = "/html/admin.html";
      } else if (data.usuario.rol === "tecnico") {
        window.location.href = "/html/tecnico.html";
      } else {
        window.location.href = "/html/usuario.html";
      }
    }, 1000);

  } catch (error) {
    console.log(error);
    mensaje.style.color = "red";
    mensaje.textContent = "No se pudo conectar con el servidor";
  }
});