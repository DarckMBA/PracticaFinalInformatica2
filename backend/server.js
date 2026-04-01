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

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT id_usuario, nombre, email, rol, activo FROM usuarios WHERE email = ? AND password = ? AND activo = 1`;
    db.query(sql, [email, password], (error, results) => {
        if (error) return res.status(500).json({ error: "Error en el servidor" });
        if (results.length === 0) return res.status(401).json({ error: "Correo o contraseña incorrectos" });
        res.json({ mensaje: "Login correcto", usuario: results[0] });
    });
});

app.get("/cargadores", (req, res) => {
    db.query("SELECT * FROM cargadores", (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener cargadores" });
        res.json(results);
    });
});

app.post("/reservas", (req, res) => {
    const { id_usuario, id_cargador } = req.body;
    const fechaInicio = new Date();
    // Definimos 1 hora de duración (3600000 ms)
    const fechaFin = new Date(Date.now() + 3600000); 

    const sqlReserva = `INSERT INTO reservas (id_usuario, id_cargador, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, 'Activa')`;

    db.query(sqlReserva, [id_usuario, id_cargador, fechaInicio, fechaFin], (error, result) => {
        if (error) return res.status(500).json({ error: "Error al crear la reserva" });

        const sqlActualizar = `UPDATE cargadores SET estado = 'Ocupado' WHERE id_cargador = ?`;
        db.query(sqlActualizar, [id_cargador], (error2) => {
            if (error2) return res.status(500).json({ error: "Error al actualizar cargador" });

            // ENVIAMOS LA FECHA_FIN REAL AL FRONTEND
            res.json({
                mensaje: "Reserva guardada correctamente",
                id_reserva: result.insertId,
                fecha_fin: fechaFin 
            });
        });
    });
});

app.delete('/reservas/:id_cargador', (req, res) => {
    const id = req.params.id_cargador;
    const sqlReserva = "UPDATE reservas SET estado = 'Cancelada' WHERE id_cargador = ? AND estado = 'Activa'";
    db.query(sqlReserva, [id], (err) => {
        if (err) return res.status(500).send(err);
        db.query("UPDATE cargadores SET estado = 'Libre' WHERE id_cargador = ?", [id], (err2) => {
            if (err2) return res.status(500).send(err2);
            res.json({ mensaje: "Reserva cancelada" });
        });
    });
});
app.get("/reservas/usuario/:id_usuario", (req, res) => {
    const { id_usuario } = req.params;

    const sqlFinalizar = `
        UPDATE reservas
        SET estado = 'Finalizada'
        WHERE estado = 'Activa' AND fecha_fin < NOW()
    `;

    db.query(sqlFinalizar, (error1) => {
        if (error1) {
            return res.status(500).json({ error: "Error al finalizar reservas expiradas" });
        }

        const sqlLiberar = `
            UPDATE cargadores c
            SET c.estado = 'Libre'
            WHERE c.id_cargador IN (
                SELECT r.id_cargador
                FROM reservas r
                WHERE r.estado = 'Finalizada'
            )
            AND c.id_cargador NOT IN (
                SELECT r2.id_cargador
                FROM reservas r2
                WHERE r2.estado = 'Activa'
            )
        `;

        db.query(sqlLiberar, (error2) => {
            if (error2) {
                return res.status(500).json({ error: "Error al liberar cargadores" });
            }

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
                if (error3) {
                    return res.status(500).json({ error: "Error al obtener el historial" });
                }

                res.json(results);
            });
        });
    });
});
app.listen(3000, () => {
    console.log("Servidor en http://localhost:3000");
});