const { Pool } = require('pg');

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ecomonitor_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'alan010605',
    max: 20, // Máximo número de conexiones en el pool
    idleTimeoutMillis: 30000, // Tiempo de espera antes de cerrar conexiones inactivas
    connectionTimeoutMillis: 2000, // Tiempo de espera para nuevas conexiones
});

// Función para probar la conexión
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión exitosa a PostgreSQL');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Error conectando a PostgreSQL:', error.message);
        return false;
    }
}

// Función para ejecutar consultas
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Consulta ejecutada', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Error en consulta:', error.message);
        throw error;
    }
}

// Función para obtener un cliente del pool para transacciones
async function getClient() {
    return await pool.connect();
}

module.exports = {
    pool,
    query,
    getClient,
    testConnection
};
