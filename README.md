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

1. Iniciar **XAMPP** y arrancar el servicio **MySQL**
2. Abrir **phpMyAdmin** en `http://localhost/phpmyadmin`
3. Crear una base de datos llamada exactamente: `encuentra_tu_cargador`
4. Seleccionar esa base de datos → pestaña **Importar**
5. Seleccionar el archivo `database/encuentra_tu_cargador.sql` y pulsar **Continuar**

### 2. Backend

```bash
cd backend
npm install
node server.js
```

El servidor arrancará en `http://localhost:3000`

### 3. Abrir la aplicación

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

- Geolocalización del usuario y visualización de cargadores en mapa interactivo
- Filtrado de cargadores por tipo (Rápido, Estándar, Compatible)
- Reserva de plaza con tiempo limitado según tipo de cargador (15/30/45 min)
- Barra de carga en tiempo real con notificación al completarse
- Historial de reservas por usuario
- Panel de administrador: gestión de usuarios, cargadores, incidencias y reservas
- Panel de técnico: actualización de estados y resolución de incidencias
- Sistema de roles con redirección automática según perfil