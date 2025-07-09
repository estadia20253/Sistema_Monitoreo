const { query, testConnection } = require('../config/database');

// SQL para crear la tabla de usuarios
const CREATE_USERS_TABLE = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombres VARCHAR(100) NOT NULL,
        apellido_paterno VARCHAR(50) NOT NULL,
        apellido_materno VARCHAR(50) NOT NULL,
        pregunta_secreta VARCHAR(255) NOT NULL,
        respuesta_secreta VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        password_reset_attempts INTEGER DEFAULT 0,
        profile_completeness INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    );
`;

// SQL para crear índices
const CREATE_INDEXES = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
`;

// SQL para insertar usuario administrador por defecto
const INSERT_ADMIN_USER = `
    INSERT INTO users (
        email, password, nombres, apellido_paterno, apellido_materno, 
        pregunta_secreta, respuesta_secreta, role
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
    ) ON CONFLICT (email) DO NOTHING;
`;

// Función para inicializar la base de datos
async function initializeDatabase() {
    try {
        console.log('🔄 Inicializando base de datos...');

        // Probar conexión
        const connected = await testConnection();
        if (!connected) {
            throw new Error('No se pudo conectar a la base de datos');
        }

        // Crear tabla de usuarios
        await query(CREATE_USERS_TABLE);
        console.log('✅ Tabla users creada o ya existe');

        // Crear índices
        await query(CREATE_INDEXES);
        console.log('✅ Índices creados');

        // Insertar usuario administrador por defecto
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        await query(INSERT_ADMIN_USER, [
            'admin@sistema.com',
            hashedPassword,
            'Administrador',
            'Sistema',
            'EcoMonitor',
            '¿Cuál es tu color favorito?',
            'azul',
            'admin'
        ]);
        console.log('✅ Usuario administrador creado o ya existe');

        console.log('🎉 Base de datos inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error.message);
        throw error;
    }
}

// Función para limpiar y reinicializar la base de datos (solo desarrollo)
async function resetDatabase() {
    try {
        console.log('🔄 Reiniciando base de datos...');
        
        await query('DROP TABLE IF EXISTS users CASCADE;');
        console.log('✅ Tabla users eliminada');
        
        await initializeDatabase();
        console.log('🎉 Base de datos reiniciada correctamente');
        
    } catch (error) {
        console.error('❌ Error reiniciando base de datos:', error.message);
        throw error;
    }
}

module.exports = {
    initializeDatabase,
    resetDatabase
};
