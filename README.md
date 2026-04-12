# Encuentra tu Cargador
### Práctica Final — Informática II
**Autores:** Marc Baleiron, Leo Seguín, Juan Ignacio González, Carlos García, Alejandro Abanades

---

## Descripción

Aplicación web para localizar y reservar plazas de aparcamiento con cargadores de coches eléctricos.
Permite a los usuarios buscar cargadores cercanos en un mapa, ver su disponibilidad en tiempo real,
realizar reservas y recibir notificaciones cuando la carga finaliza.

---

## Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Frontend | HTML, CSS, JavaScript (ES Modules) |
| Mapas | Leaflet.js + OpenStreetMap |
| Backend | Node.js + Express |
| Base de datos | MySQL (MariaDB via XAMPP) |

---

## Requisitos previos

- [XAMPP](https://www.apachefriends.org/) con MySQL activo
- [Node.js](https://nodejs.org/) v18 o superior

---

## Instalación paso a paso

### 1. Base de datos

1. Iniciar **XAMPP** y arrancar el servicio **MySQL** y **Apache**
2. Abrir **phpMyAdmin** en `http://localhost/phpmyadmin`
3. Crear una base de datos llamada exactamente: `encuentra_tu_cargador`
4. Seleccionar esa base de datos → pestaña **Importar**
5. Seleccionar el archivo `encuentra_tu_cargador.sql` y pulsar **Continuar**

### 2. Backend

```bash
cd backend
npm install
node server.js
```

El servidor arrancará en `http://localhost:3000`

### 3. Contraseñas (primera vez)

Si es la primera vez que se ejecuta el proyecto, hay que cifrar las contraseñas de los usuarios de prueba:

```bash
npm install bcrypt
node backend/seguridad/middleware/migrate-passwords.js
```

Este paso solo es necesario una vez. Una vez ejecutado, las contraseñas quedan almacenadas cifradas en la base de datos y no debe repetirse.

### 4. Abrir la aplicación

Abrir el navegador en:
```
http://localhost:3000
```

---

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
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
│   │   │   └── roles.js
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
- Reserva de plaza con tiempo limitado según tipo de cargador (15 / 30 / 45 min)
- Barra de carga en tiempo real con notificación del navegador al completarse
- Historial de reservas desplegable con estado de cada reserva (Activa, Finalizada, Cancelada)
- Cancelación de reservas activas
- Reporte de incidencias en cargadores

### Panel de Administrador
- Gestión de usuarios: crear, activar/desactivar y cambiar rol
- Gestión de cargadores: visualización en mapa, cambio de estado y activación/desactivación
- Filtrado de cargadores por tipo en el mapa
- Consulta de incidencias abiertas y resueltas
- Historial completo de reservas de todos los usuarios

### Panel de Técnico
- Visualización de incidencias pendientes con enlace a Google Maps
- Resolución de incidencias con comentario técnico
- Visualización de incidencias ya resueltas

### Sistema general
- Sistema de autenticación con roles (usuario, administrador, técnico)
- Redirección automática al panel correspondiente según el rol
- Contraseñas cifradas con bcrypt
- Refresco automático de datos cada 60 segundos