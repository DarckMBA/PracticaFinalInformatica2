# Encuentra tu Cargador
### Práctica Final — Informática II

**Autores:** Marc Baleiron · Leo Seguín · Juan Ignacio González · Carlos García · Alejandro Abanades

---

## Descripción

Aplicación web para localizar y reservar plazas de aparcamiento con cargadores de coches eléctricos.
Permite a los usuarios buscar cargadores cercanos en un mapa interactivo, ver su disponibilidad en
tiempo real, realizar reservas y recibir notificaciones cuando la carga finaliza.

El sistema cuenta con tres roles diferenciados: **usuario final**, **técnico** y **administrador**.

---

## Tecnologías utilizadas

| Capa | Tecnología |
|------|------------|
| Frontend | HTML, CSS, JavaScript (ES Modules) |
| Mapas | Leaflet.js + OpenStreetMap |
| Backend | Node.js + Express |
| Base de datos | MySQL (MariaDB vía XAMPP) |

---

## ⚙️ Requisitos previos

- [XAMPP](https://www.apachefriends.org/) con el servicio **MySQL** activo
- [Node.js](https://nodejs.org/) v18 o superior

---

## Instalación paso a paso

### 1. Base de datos

1. Iniciar **XAMPP** y arrancar el servicio **MySQL**
2. Abrir **phpMyAdmin** en `http://localhost/phpmyadmin`
3. Crear una base de datos llamada exactamente: `encuentra_tu_cargador`
4. Seleccionar esa base de datos → pestaña **Importar**
5. Seleccionar el archivo `database/encuentra_tu_cargador.sql` y pulsar **Continuar**

---

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
npm install mysql2
npm install bcrypt
```

> `mysql2` es el conector de MySQL para Node.js.
> `bcrypt` se usa para el hasheo seguro de contraseñas.

---

### 3. Arrancar el servidor

```bash
node server.js
```

El servidor quedará escuchando en: `http://localhost:3000`

---

### 4. Migración de contraseñas ⚠️ (solo la primera vez)

Si la base de datos contiene contraseñas en texto plano, ejecuta este script **una única vez** para hashearlas con bcrypt:

```bash
node backend/seguridad/middleware/migrate-passwords.js
```

> **Importante:** Ejecutar una sola vez tras el primer arranque. Una vez completado, este archivo puede eliminarse.

---

### 5. Abrir la aplicación

Abre el navegador en:

```
http://localhost:3000
```

---

## Usuarios de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Usuario | usuario@gmail.com | 1234 |
| Administrador | admin@gmail.com | 1234 |
| Técnico | tecnico@gmail.com | 1234 |

---

## Estructura del proyecto

```
proyecto/
├── backend/
│   ├── seguridad/
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── roles.js
│   │   │   └── migrate-passwords.js
│   │   └── routes/
│   │       ├── auth.routes.js
│   │       ├── cargadores.routes.js
│   │       ├── incidencias.routes.js
│   │       └── usuarios.routes.js
│   ├── db.js
│   └── server.js
├── frontend/
│   ├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── html/
│   │   ├── index.html
│   │   ├── usuario.html
│   │   ├── admin.html
│   │   └── tecnico.html
│   └── js/
│       ├── login.js
│       ├── usuario.js
│       ├── admin.js
│       ├── tecnico.js
│       └── mapa.js
├── database/
│   └── encuentra_tu_cargador.sql
└── README.md
```

---

## Funcionalidades principales

### Panel de Usuario
- Geolocalización del usuario y visualización de cargadores en mapa interactivo
- Filtrado de cargadores por tipo (Rápido, Estándar, Compatible)
- Reserva de plaza con tiempo estimado según tipo de cargador (15 / 30 / 45 min)
- Barra de carga en tiempo real con notificación push al completarse
- Historial de reservas desplegable con opción de cancelación
- Formulario para reportar incidencias en cargadores

### Panel de Técnico
- Listado paginado de incidencias pendientes con tiempo relativo
- Botón para abrir la ubicación del cargador en Google Maps
- Formulario inline para escribir comentario técnico y resolver incidencias
- Historial de incidencias resueltas

### Panel de Administrador
- Gestión completa de usuarios: crear, editar, dar de baja y reactivar
- Gestión de cargadores: crear, cambiar estado y activar/desactivar
- Mapa de cargadores con filtro por tipo
- Historial global de reservas paginado
- Visualización de todas las incidencias con estado y comentario técnico

---

## Seguridad

- Contraseñas almacenadas con hash **bcrypt** (salt rounds: 12)
- Redirección automática según rol al iniciar sesión
- Protección de rutas por rol en frontend y backend

---

## Notas técnicas

- **Puerto del servidor:** 3000 (configurable en `backend/server.js`)
- **Base de datos:** MySQL local vía XAMPP, credenciales en `backend/db.js`
- **Mapas:** Leaflet.js con tiles de OpenStreetMap (sin API key necesaria)
- **Módulos JS:** El frontend usa ES Modules (`type="module"`), requiere servidor HTTP — no funciona abriendo los archivos directamente con `file://`

---

*Marc Baleiron · Leo Seguín · Juan Ignacio González · Carlos García · Alejandro Abanades*