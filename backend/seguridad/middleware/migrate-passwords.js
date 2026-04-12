/**
 * migrate-passwords.js
 * Script de migración ONE-TIME para hashear contraseñas en texto plano.
 *
 * Uso:
 *   node migrate-passwords.js
 *
 * IMPORTANTE: Ejecutar UNA sola vez tras desplegar el nuevo server.js.
 * Tras la migración, este archivo puede eliminarse.
 */

const bcrypt = require("bcrypt");
const db     = require("../../db");

const SALT_ROUNDS = 12;

async function migrar() {
    // Obtener usuarios con contraseñas aún en texto plano
    // (identificables porque los hashes bcrypt siempre empiezan con "$2b$")
    db.query("SELECT id_usuario, password FROM usuarios", async (err, rows) => {
        if (err) { console.error("Error al leer usuarios:", err); process.exit(1); }

        for (const row of rows) {
            // Si ya es un hash bcrypt, no tocar
            if (row.password.startsWith("$2b$") || row.password.startsWith("$2a$")) {
                console.log(`Usuario ${row.id_usuario}: ya tiene hash, se omite.`);
                continue;
            }

            const hash = await bcrypt.hash(row.password, SALT_ROUNDS);
            await new Promise((resolve, reject) => {
                db.query(
                    "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
                    [hash, row.id_usuario],
                    (err2) => {
                        if (err2) { console.error(`Error actualizando usuario ${row.id_usuario}:`, err2); reject(err2); }
                        else { console.log(`Usuario ${row.id_usuario}: contraseña migrada correctamente.`); resolve(); }
                    }
                );
            });
        }

        console.log("\n✅ Migración completada. Recuerda eliminar este archivo.");
        process.exit(0);
    });
}

migrar();