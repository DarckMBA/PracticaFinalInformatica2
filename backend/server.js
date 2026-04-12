/**
 * server.js — Backend Express para "Encuentra tu Cargador"
 * Mejoras aplicadas:
 *  - Contraseñas almacenadas con bcrypt (hash seguro, SALT_ROUNDS=12)
 *  - Rutas bien separadas y comentadas
 *  - Validaciones básicas de entrada
 *  - GET /incidencias ahora devuelve latitud/longitud del cargador
 */
 
const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const bcrypt   = require("bcrypt");
const db       = require("./db");
 
const SALT_ROUNDS = 12;
 
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
 
app.get("/", (_req, res) =>
    res.sendFile(path.join(__dirname, "../frontend/html/index.html"))
);
 
// ─── AUTH ─────────────────────────────────────────────────────────────────────
 
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "Email y contraseña son obligatorios" });
 
    const sql = `SELECT id_usuario, nombre, email, rol, password, activo
                 FROM usuarios WHERE email = ? AND activo = 1`;
 
    db.query(sql, [email], async (error, results) => {
        if (error) return res.status(500).json({ error: "Error en el servidor" });
        if (results.length === 0)
            return res.status(401).json({ error: "Correo o contraseña incorrectos" });
 
        const usuario = results[0];
        const coincide = await bcrypt.compare(password, usuario.password);
        if (!coincide)
            return res.status(401).json({ error: "Correo o contraseña incorrectos" });
 
        const { password: _pwd, ...usuarioSafe } = usuario;
        res.json({ mensaje: "Login correcto", usuario: usuarioSafe });
    });
});
 
// ─── CARGADORES ───────────────────────────────────────────────────────────────
 
app.get("/cargadores", (_req, res) => {
    db.query("SELECT * FROM cargadores WHERE activo = 1", (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener cargadores" });
        res.json(results);
    });
});
 
app.get("/admin/cargadores", (_req, res) => {
    db.query("SELECT * FROM cargadores ORDER BY id_cargador ASC", (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener cargadores del admin" });
        res.json(results);
    });
});
 
app.post("/cargadores", (req, res) => {
    const { tipo, latitud, longitud, estado } = req.body;
    if (!tipo || !latitud || !longitud || !estado)
        return res.status(400).json({ error: "Faltan datos del cargador" });
 
    db.query(
        `INSERT INTO cargadores (tipo, latitud, longitud, estado, nivel_carga, coste, tiempo_estimado, activo)
         VALUES (?, ?, ?, ?, 100, 0, '30 min', 1)`,
        [tipo, latitud, longitud, estado],
        (error, result) => {
            if (error) return res.status(500).json({ error: "Error al crear cargador" });
            res.json({ mensaje: "Cargador creado correctamente", id_cargador: result.insertId });
        }
    );
});
 
app.patch("/cargadores/:id/desactivar", (req, res) => {
    db.query("UPDATE cargadores SET activo = 0 WHERE id_cargador = ?", [req.params.id], (error) => {
        if (error) return res.status(500).json({ error: "Error al desactivar cargador" });
        res.json({ mensaje: "Cargador desactivado correctamente" });
    });
});
 
app.patch("/cargadores/:id/reactivar", (req, res) => {
    db.query("UPDATE cargadores SET activo = 1 WHERE id_cargador = ?", [req.params.id], (error) => {
        if (error) return res.status(500).json({ error: "Error al reactivar cargador" });
        res.json({ mensaje: "Cargador reactivado correctamente" });
    });
});
 
app.patch("/cargadores/:id/estado", (req, res) => {
    let { estado } = req.body;
    if (!estado) return res.status(400).json({ error: "Estado requerido" });
    if (estado === "Operativo") estado = "Libre";
 
    db.query("UPDATE cargadores SET estado = ? WHERE id_cargador = ?", [estado, req.params.id], (error) => {
        if (error) return res.status(500).json({ error: "Error al actualizar estado" });
 
        if (estado === "En reparación") {
            db.query(
                `UPDATE reservas SET estado = 'Cancelada' WHERE id_cargador = ? AND estado = 'Activa'`,
                [req.params.id],
                (error2) => {
                    if (error2) return res.status(500).json({ error: "Estado actualizado, error al cancelar reservas" });
                    return res.json({ mensaje: "Cargador en reparación y reservas canceladas" });
                }
            );
        } else {
            return res.json({ mensaje: "Estado actualizado correctamente" });
        }
    });
});
 
// ─── RESERVAS ─────────────────────────────────────────────────────────────────
 
app.get("/reservas", (_req, res) => {
    const sql = `
        SELECT r.id_reserva, r.id_cargador, r.id_usuario,
               r.fecha_inicio, r.fecha_fin, r.estado,
               u.nombre AS nombre_usuario, u.email AS email_usuario, c.tipo
        FROM reservas r
        INNER JOIN usuarios   u ON r.id_usuario  = u.id_usuario
        INNER JOIN cargadores c ON r.id_cargador = c.id_cargador
        ORDER BY r.fecha_inicio DESC`;
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener reservas" });
        res.json(results);
    });
});
 
app.post("/reservas", (req, res) => {
    const { id_usuario, id_cargador } = req.body;
    if (!id_usuario || !id_cargador)
        return res.status(400).json({ error: "id_usuario e id_cargador son requeridos" });
 
    db.query("SELECT tipo, estado FROM cargadores WHERE id_cargador = ?", [id_cargador], (errTipo, resTipo) => {
        if (errTipo || resTipo.length === 0)
            return res.status(500).json({ error: "Cargador no encontrado" });
 
        const { tipo, estado } = resTipo[0];
        if (estado !== "Libre")
            return res.status(409).json({ error: "El cargador no está libre" });
 
        const duraciones  = { 'Rápido': 15, 'Estándar': 30, 'Compatible': 45 };
        const minutos     = duraciones[tipo] || 30;
        const fechaInicio = new Date();
        const fechaFin    = new Date(Date.now() + minutos * 60 * 1000);
 
        db.query(
            `INSERT INTO reservas (id_usuario, id_cargador, fecha_inicio, fecha_fin, estado)
             VALUES (?, ?, ?, ?, 'Activa')`,
            [id_usuario, id_cargador, fechaInicio, fechaFin],
            (error, result) => {
                if (error) return res.status(500).json({ error: "Error al crear la reserva" });
                db.query(
                    "UPDATE cargadores SET estado = 'Ocupado' WHERE id_cargador = ?",
                    [id_cargador],
                    (error2) => {
                        if (error2) return res.status(500).json({ error: "Error al actualizar cargador" });
                        res.json({ mensaje: "Reserva guardada", id_reserva: result.insertId, fecha_fin: fechaFin, tipo, minutos });
                    }
                );
            }
        );
    });
});
 
app.delete("/reservas/:id_cargador", (req, res) => {
    const id = req.params.id_cargador;
    db.query("UPDATE reservas SET estado = 'Cancelada' WHERE id_cargador = ? AND estado = 'Activa'", [id], (err) => {
        if (err) return res.status(500).send(err);
        db.query("UPDATE cargadores SET estado = 'Libre' WHERE id_cargador = ?", [id], (err2) => {
            if (err2) return res.status(500).send(err2);
            res.json({ mensaje: "Reserva cancelada" });
        });
    });
});
 
app.get("/reservas/usuario/:id_usuario", (req, res) => {
    const { id_usuario } = req.params;
 
    db.query(`UPDATE reservas SET estado = 'Finalizada' WHERE estado = 'Activa' AND fecha_fin < NOW()`, (error1) => {
        if (error1) return res.status(500).json({ error: "Error al finalizar reservas expiradas" });
 
        db.query(`
            UPDATE cargadores c SET c.estado = 'Libre'
            WHERE c.id_cargador IN (SELECT r.id_cargador FROM reservas r WHERE r.estado = 'Finalizada')
            AND c.id_cargador NOT IN (SELECT r2.id_cargador FROM reservas r2 WHERE r2.estado = 'Activa')`,
        (error2) => {
            if (error2) return res.status(500).json({ error: "Error al liberar cargadores" });
            db.query(`
                SELECT r.id_reserva, r.id_cargador, r.fecha_inicio, r.fecha_fin, r.estado, c.tipo
                FROM reservas r
                INNER JOIN cargadores c ON r.id_cargador = c.id_cargador
                WHERE r.id_usuario = ?
                ORDER BY r.fecha_inicio DESC`,
            [id_usuario], (error3, results) => {
                if (error3) return res.status(500).json({ error: "Error al obtener el historial" });
                res.json(results);
            });
        });
    });
});
 
// ─── INCIDENCIAS ──────────────────────────────────────────────────────────────
 
app.get("/incidencias", (_req, res) => {
    // Incluimos latitud/longitud y tipo del cargador para el panel técnico
    const sql = `
        SELECT i.id_incidencia, i.id_usuario, i.id_cargador,
               i.descripcion, i.estado, i.fecha_reporte, i.comentario_tecnico,
               c.latitud, c.longitud, c.tipo AS tipo_cargador
        FROM incidencias i
        INNER JOIN cargadores c ON i.id_cargador = c.id_cargador
        ORDER BY i.fecha_reporte DESC`;
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener incidencias" });
        res.json(results);
    });
});
 
app.post("/incidencias", (req, res) => {
    const { id_usuario, id_cargador, descripcion } = req.body;
    if (!id_usuario || !id_cargador || !descripcion)
        return res.status(400).json({ error: "Faltan datos de la incidencia" });
 
    db.query(
        `INSERT INTO incidencias (id_usuario, id_cargador, descripcion, estado, fecha_reporte)
         VALUES (?, ?, ?, 'Pendiente', NOW())`,
        [id_usuario, id_cargador, descripcion],
        (error, result) => {
            if (error) return res.status(500).json({ error: "Error al crear la incidencia" });
            db.query("UPDATE cargadores SET estado = 'En reparación' WHERE id_cargador = ?", [id_cargador], (error2) => {
                if (error2) return res.status(500).json({ error: "Incidencia creada pero error al actualizar cargador" });
                db.query(
                    `UPDATE reservas SET estado = 'Cancelada' WHERE id_cargador = ? AND estado = 'Activa'`,
                    [id_cargador],
                    (error3) => {
                        if (error3) return res.status(500).json({ error: "Incidencia creada pero error al cancelar reservas" });
                        res.json({ mensaje: "Incidencia creada correctamente", id_incidencia: result.insertId });
                    }
                );
            });
        }
    );
});
 
app.patch("/incidencias/:id/resolver", (req, res) => {
    const { comentario_tecnico } = req.body;
    if (!comentario_tecnico || comentario_tecnico.trim() === "")
        return res.status(400).json({ error: "El comentario técnico es obligatorio" });
 
    db.query("SELECT id_cargador FROM incidencias WHERE id_incidencia = ?", [req.params.id], (error, results) => {
        if (error) return res.status(500).json({ error: "Error al buscar la incidencia" });
        if (results.length === 0) return res.status(404).json({ error: "Incidencia no encontrada" });
 
        const idCargador = results[0].id_cargador;
 
        db.query(
            `UPDATE incidencias SET estado = 'Resuelta', comentario_tecnico = ? WHERE id_incidencia = ?`,
            [comentario_tecnico, req.params.id],
            (error2) => {
                if (error2) return res.status(500).json({ error: "Error al resolver la incidencia" });
                db.query("UPDATE cargadores SET estado = 'Libre' WHERE id_cargador = ?", [idCargador], (error3) => {
                    if (error3) return res.status(500).json({ error: "Incidencia resuelta pero error al actualizar cargador" });
                    res.json({ mensaje: "Incidencia resuelta y cargador liberado" });
                });
            }
        );
    });
});
 
// ─── USUARIOS ─────────────────────────────────────────────────────────────────
 
app.get("/usuarios", (_req, res) => {
    db.query(
        "SELECT id_usuario, nombre, email, rol, activo FROM usuarios ORDER BY id_usuario ASC",
        (error, results) => {
            if (error) return res.status(500).json({ error: "Error al obtener usuarios" });
            res.json(results);
        }
    );
});
 
app.post("/usuarios", async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol)
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
 
    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        db.query(
            "INSERT INTO usuarios (nombre, email, password, rol, activo) VALUES (?, ?, ?, ?, 1)",
            [nombre, email, hash, rol],
            (error, result) => {
                if (error) return res.status(500).json({ error: "Error al crear usuario" });
                res.json({ mensaje: "Usuario creado correctamente", id_usuario: result.insertId });
            }
        );
    } catch {
        res.status(500).json({ error: "Error al generar hash" });
    }
});
 
app.patch("/usuarios/:id", async (req, res) => {
    const { nombre, email, rol, password } = req.body;
    if (!nombre || !email || !rol)
        return res.status(400).json({ error: "Nombre, email y rol son obligatorios" });
 
    try {
        if (password && password.trim() !== "") {
            const hash = await bcrypt.hash(password.trim(), SALT_ROUNDS);
            db.query(
                "UPDATE usuarios SET nombre = ?, email = ?, rol = ?, password = ? WHERE id_usuario = ?",
                [nombre, email, rol, hash, req.params.id],
                (error) => {
                    if (error) return res.status(500).json({ error: "Error al actualizar usuario" });
                    res.json({ mensaje: "Usuario actualizado correctamente" });
                }
            );
        } else {
            db.query(
                "UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id_usuario = ?",
                [nombre, email, rol, req.params.id],
                (error) => {
                    if (error) return res.status(500).json({ error: "Error al actualizar usuario" });
                    res.json({ mensaje: "Usuario actualizado correctamente" });
                }
            );
        }
    } catch {
        res.status(500).json({ error: "Error al generar hash" });
    }
});
 
app.patch("/usuarios/:id/baja", (req, res) => {
    db.query("UPDATE usuarios SET activo = 0 WHERE id_usuario = ?", [req.params.id], (error) => {
        if (error) return res.status(500).json({ error: "Error al desactivar usuario" });
        res.json({ mensaje: "Usuario desactivado correctamente" });
    });
});
 
app.patch("/usuarios/:id/reactivar", (req, res) => {
    db.query("UPDATE usuarios SET activo = 1 WHERE id_usuario = ?", [req.params.id], (error) => {
        if (error) return res.status(500).json({ error: "Error al reactivar usuario" });
        res.json({ mensaje: "Usuario reactivado correctamente" });
    });
});
 
// ─────────────────────────────────────────────────────────────────────────────
app.listen(3000, () => console.log("Servidor en http://localhost:3000"));