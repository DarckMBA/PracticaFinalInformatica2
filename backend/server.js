const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/html/index.html"));
});

// ─── AUTH ────────────────────────────────────────────────────────────────────

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT id_usuario, nombre, email, rol, activo
                 FROM usuarios
                 WHERE email = ? AND password = ? AND activo = 1`;
    db.query(sql, [email, password], (error, results) => {
        if (error) return res.status(500).json({ error: "Error en el servidor" });
        if (results.length === 0) return res.status(401).json({ error: "Correo o contraseña incorrectos" });
        res.json({ mensaje: "Login correcto", usuario: results[0] });
    });
});

// ─── CARGADORES ───────────────────────────────────────────────────────────────

// Cargadores activos (vista usuario y técnico)
app.get("/cargadores", (req, res) => {
    const sql = "SELECT * FROM cargadores WHERE activo = 1";
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener cargadores" });
        res.json(results);
    });
});

// Todos los cargadores (vista admin)
app.get("/admin/cargadores", (req, res) => {
    const sql = "SELECT * FROM cargadores ORDER BY id_cargador ASC";
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener cargadores del admin" });
        res.json(results);
    });
});

app.post("/cargadores", (req, res) => {
    const { tipo, latitud, longitud, estado } = req.body;
    const sql = `
        INSERT INTO cargadores (tipo, latitud, longitud, estado, nivel_carga, coste, tiempo_estimado, activo)
        VALUES (?, ?, ?, ?, 100, 0, '30 min', 1)
    `;
    db.query(sql, [tipo, latitud, longitud, estado], (error, result) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: "Error al crear cargador" });
        }
        res.json({ mensaje: "Cargador creado correctamente", id_cargador: result.insertId });
    });
});

app.patch("/cargadores/:id/desactivar", (req, res) => {
    const { id } = req.params;
    db.query("UPDATE cargadores SET activo = 0 WHERE id_cargador = ?", [id], (error) => {
        if (error) return res.status(500).json({ error: "Error al desactivar cargador" });
        res.json({ mensaje: "Cargador desactivado correctamente" });
    });
});

app.patch("/cargadores/:id/reactivar", (req, res) => {
    const { id } = req.params;
    db.query("UPDATE cargadores SET activo = 1 WHERE id_cargador = ?", [id], (error) => {
        if (error) return res.status(500).json({ error: "Error al reactivar cargador" });
        res.json({ mensaje: "Cargador reactivado correctamente" });
    });
});

app.patch("/cargadores/:id/estado", (req, res) => {
    const { id } = req.params;
    let { estado } = req.body;

    if (estado === "Operativo") estado = "Libre";

    db.query("UPDATE cargadores SET estado = ? WHERE id_cargador = ?", [estado, id], (error) => {
        if (error) return res.status(500).json({ error: "Error al actualizar estado del cargador" });

        if (estado === "En reparación") {
            const sqlCancelar = `UPDATE reservas SET estado = 'Cancelada' WHERE id_cargador = ? AND estado = 'Activa'`;
            db.query(sqlCancelar, [id], (error2) => {
                if (error2) return res.status(500).json({ error: "Estado actualizado, pero no se pudo cancelar la reserva activa" });
                return res.json({ mensaje: "Cargador puesto en reparación y reservas activas canceladas" });
            });
        } else {
            return res.json({ mensaje: "Estado actualizado correctamente" });
        }
    });
});

// ─── RESERVAS ─────────────────────────────────────────────────────────────────

// Todas las reservas con datos de usuario y cargador (vista admin)
app.get("/reservas", (req, res) => {
    const sql = `
        SELECT
            r.id_reserva,
            r.id_cargador,
            r.id_usuario,
            r.fecha_inicio,
            r.fecha_fin,
            r.estado,
            u.nombre  AS nombre_usuario,
            u.email   AS email_usuario,
            c.tipo
        FROM reservas r
        INNER JOIN usuarios  u ON r.id_usuario  = u.id_usuario
        INNER JOIN cargadores c ON r.id_cargador = c.id_cargador
        ORDER BY r.fecha_inicio DESC
    `;
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener reservas" });
        res.json(results);
    });
});

app.post("/reservas", (req, res) => {
    const { id_usuario, id_cargador } = req.body;
 
    
    db.query("SELECT tipo FROM cargadores WHERE id_cargador = ?", [id_cargador], (errTipo, resTipo) => {
        if (errTipo || resTipo.length === 0) {
            return res.status(500).json({ error: "Cargador no encontrado" });
        }
 
        const tipo = resTipo[0].tipo;
 
        // Duración en minutos según tipo de cargador
        const duraciones = { 'Rápido': 15, 'Estándar': 30, 'Compatible': 45 };
        const minutos = duraciones[tipo] || 30;
 
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
 
                        res.json({
                            mensaje:    "Reserva guardada correctamente",
                            id_reserva: result.insertId,
                            fecha_fin:  fechaFin,
                            tipo,
                            minutos
                        });
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

// Historial de reservas de un usuario + auto-finalizar expiradas
app.get("/reservas/usuario/:id_usuario", (req, res) => {
    const { id_usuario } = req.params;

    db.query(`UPDATE reservas SET estado = 'Finalizada' WHERE estado = 'Activa' AND fecha_fin < NOW()`, (error1) => {
        if (error1) return res.status(500).json({ error: "Error al finalizar reservas expiradas" });

        const sqlLiberar = `
            UPDATE cargadores c
            SET c.estado = 'Libre'
            WHERE c.id_cargador IN (
                SELECT r.id_cargador FROM reservas r WHERE r.estado = 'Finalizada'
            )
            AND c.id_cargador NOT IN (
                SELECT r2.id_cargador FROM reservas r2 WHERE r2.estado = 'Activa'
            )
        `;

        db.query(sqlLiberar, (error2) => {
            if (error2) return res.status(500).json({ error: "Error al liberar cargadores" });

            const sqlHistorial = `
                SELECT
                    r.id_reserva,
                    r.id_cargador,
                    r.fecha_inicio,
                    r.fecha_fin,
                    r.estado,
                    c.tipo
                FROM reservas r
                INNER JOIN cargadores c ON r.id_cargador = c.id_cargador
                WHERE r.id_usuario = ?
                ORDER BY r.fecha_inicio DESC
            `;

            db.query(sqlHistorial, [id_usuario], (error3, results) => {
                if (error3) return res.status(500).json({ error: "Error al obtener el historial" });
                res.json(results);
            });
        });
    });
});

// ─── INCIDENCIAS ──────────────────────────────────────────────────────────────

app.get("/incidencias", (req, res) => {
    const sql = `
        SELECT i.id_incidencia, i.id_usuario, i.id_cargador,
               i.descripcion, i.estado, i.fecha_reporte, i.comentario_tecnico
        FROM incidencias i
        ORDER BY i.fecha_reporte DESC
    `;
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener incidencias" });
        res.json(results);
    });
});

app.post("/incidencias", (req, res) => {
    const { id_usuario, id_cargador, descripcion } = req.body;

    db.query(
        `INSERT INTO incidencias (id_usuario, id_cargador, descripcion, estado, fecha_reporte) VALUES (?, ?, ?, 'Pendiente', NOW())`,
        [id_usuario, id_cargador, descripcion],
        (error, result) => {
            if (error) return res.status(500).json({ error: "Error al crear la incidencia" });

            db.query("UPDATE cargadores SET estado = 'En reparación' WHERE id_cargador = ?", [id_cargador], (error2) => {
                if (error2) return res.status(500).json({ error: "Incidencia creada, pero no se pudo actualizar el cargador" });

                db.query(
                    `UPDATE reservas SET estado = 'Cancelada' WHERE id_cargador = ? AND estado = 'Activa'`,
                    [id_cargador],
                    (error3) => {
                        if (error3) return res.status(500).json({ error: "Incidencia creada, pero no se pudo cancelar la reserva activa" });
                        res.json({ mensaje: "Incidencia creada correctamente y cargador puesto en reparación", id_incidencia: result.insertId });
                    }
                );
            });
        }
    );
});

app.patch("/incidencias/:id/resolver", (req, res) => {
    const { id } = req.params;
    const { comentario_tecnico } = req.body;

    db.query("SELECT id_cargador FROM incidencias WHERE id_incidencia = ?", [id], (error, results) => {
        if (error) return res.status(500).json({ error: "Error al buscar la incidencia" });
        if (results.length === 0) return res.status(404).json({ error: "Incidencia no encontrada" });

        const idCargador = results[0].id_cargador;

        db.query(
            `UPDATE incidencias SET estado = 'Resuelta', comentario_tecnico = ? WHERE id_incidencia = ?`,
            [comentario_tecnico || "", id],
            (error2) => {
                if (error2) return res.status(500).json({ error: "Error al resolver la incidencia" });

                db.query("UPDATE cargadores SET estado = 'Libre' WHERE id_cargador = ?", [idCargador], (error3) => {
                    if (error3) return res.status(500).json({ error: "Incidencia resuelta, pero no se pudo actualizar el cargador" });
                    res.json({ mensaje: "Incidencia resuelta y cargador actualizado" });
                });
            }
        );
    });
});

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

app.get("/usuarios", (req, res) => {
    db.query(
        "SELECT id_usuario, nombre, email, rol, activo FROM usuarios ORDER BY id_usuario ASC",
        (error, results) => {
            if (error) return res.status(500).json({ error: "Error al obtener usuarios" });
            res.json(results);
        }
    );
});

app.post("/usuarios", (req, res) => {
    const { nombre, email, password, rol } = req.body;
    db.query(
        "INSERT INTO usuarios (nombre, email, password, rol, activo) VALUES (?, ?, ?, ?, 1)",
        [nombre, email, password, rol],
        (error, result) => {
            if (error) return res.status(500).json({ error: "Error al crear usuario" });
            res.json({ mensaje: "Usuario creado correctamente", id_usuario: result.insertId });
        }
    );
});

app.patch("/usuarios/:id", (req, res) => {
    const { id } = req.params;
    const { nombre, email, rol, password } = req.body;

    if (!nombre || !email || !rol) {
        return res.status(400).json({ error: "Nombre, email y rol son obligatorios" });
    }

    if (password && password.trim() !== "") {
        db.query(
            "UPDATE usuarios SET nombre = ?, email = ?, rol = ?, password = ? WHERE id_usuario = ?",
            [nombre, email, rol, password, id],
            (error) => {
                if (error) return res.status(500).json({ error: "Error al actualizar usuario" });
                res.json({ mensaje: "Usuario actualizado correctamente" });
            }
        );
    } else {
        db.query(
            "UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id_usuario = ?",
            [nombre, email, rol, id],
            (error) => {
                if (error) return res.status(500).json({ error: "Error al actualizar usuario" });
                res.json({ mensaje: "Usuario actualizado correctamente" });
            }
        );
    }
});

app.patch("/usuarios/:id/baja", (req, res) => {
    const { id } = req.params;
    db.query("UPDATE usuarios SET activo = 0 WHERE id_usuario = ?", [id], (error) => {
        if (error) return res.status(500).json({ error: "Error al desactivar usuario" });
        res.json({ mensaje: "Usuario desactivado correctamente" });
    });
});

app.patch("/usuarios/:id/reactivar", (req, res) => {
    const { id } = req.params;
    db.query("UPDATE usuarios SET activo = 1 WHERE id_usuario = ?", [id], (error) => {
        if (error) return res.status(500).json({ error: "Error al reactivar usuario" });
        res.json({ mensaje: "Usuario reactivado correctamente" });
    });
});

// ─────────────────────────────────────────────────────────────────────────────

app.listen(3000, () => {
    console.log("Servidor en http://localhost:3000");
});