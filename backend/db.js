const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "encuentra_tu_cargador"
});

connection.connect((error) => {
    if (error) {
        console.log("Error de conexión:", error);
    } else {
        console.log("Conectado a MySQL");
    }
});

module.exports = connection;