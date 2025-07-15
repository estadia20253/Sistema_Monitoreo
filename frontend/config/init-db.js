const { query, testConnection } = require('../config/database');
const fs = require('fs');
const path = require('path');

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

// SQL para crear la tabla de pines
const CREATE_PINES_TABLE = `
    CREATE TABLE IF NOT EXISTS pines (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        estado VARCHAR(50) DEFAULT 'activo',
        descripcion TEXT,
        latitud DECIMAL(10,6),
        longitud DECIMAL(10,6),
        usuario_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_eliminacion TIMESTAMP
    );
`;

// SQL para crear índices de pines
const CREATE_PINES_INDEXES = `
    CREATE INDEX IF NOT EXISTS idx_pines_usuario_id ON pines(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_pines_activo ON pines(activo);
    CREATE INDEX IF NOT EXISTS idx_pines_tipo ON pines(tipo);
    CREATE INDEX IF NOT EXISTS idx_pines_estado ON pines(estado);
    CREATE INDEX IF NOT EXISTS idx_pines_fecha_creacion ON pines(fecha_creacion);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pines_nombre_tipo ON pines(nombre, tipo) WHERE activo = true;
`;

// SQL para agregar columnas de coordenadas geográficas si no existen
const ADD_COORDINATES_COLUMNS = `
    DO $$ 
    BEGIN 
        -- Agregar columnas de coordenadas geográficas
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pines' AND column_name='latitud') THEN
            ALTER TABLE pines ADD COLUMN latitud DECIMAL(10,6);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pines' AND column_name='longitud') THEN
            ALTER TABLE pines ADD COLUMN longitud DECIMAL(10,6);
        END IF;
        
        -- Eliminar columnas antiguas x, y si existen (migración)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pines' AND column_name='x') THEN
            ALTER TABLE pines DROP COLUMN x;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pines' AND column_name='y') THEN
            ALTER TABLE pines DROP COLUMN y;
        END IF;
    END $$;
`;

// Función para insertar pines desde el archivo JSON
async function insertPinesFromJson() {
    try {
        console.log('📁 Insertando pines desde archivo JSON...');

        // Obtener el usuario admin para asignar como creador
        const adminResult = await query(
            'SELECT id FROM users WHERE email = $1',
            ['admin@sistema.com']
        );

        if (adminResult.rows.length === 0) {
            console.log('⚠️ Usuario administrador no encontrado, omitiendo inserción de pines');
            return;
        }

        const adminId = adminResult.rows[0].id;

        // Verificar si ya hay pines en la base de datos
        const existingPinesResult = await query('SELECT COUNT(*) as count FROM pines WHERE activo = true');
        const existingCount = parseInt(existingPinesResult.rows[0].count);
        
        if (existingCount > 0) {
            console.log(`⚠️ Ya existen ${existingCount} pines en la base de datos, omitiendo inserción masiva`);
            return;
        }

        // Datos de pines del estado de Hidalgo con coordenadas geográficas reales
        const pinesHidalgo = [
            { nombre: "Rio Moctezuma", tipo: "rio", descripcion: "Río principal del estado de Hidalgo", lat: 20.5, lng: -98.8 },
            { nombre: "Rio Tancuilin", tipo: "rio", descripcion: "Río ubicado en la región norte", lat: 20.9, lng: -98.85 },
            { nombre: "Rio San Pedro", tipo: "rio", descripcion: "Río de la región noreste", lat: 20.85, lng: -98.25 },
            { nombre: "Rio Candelaria", tipo: "rio", descripcion: "Río de la región este", lat: 20.65, lng: -98.05 },
            { nombre: "Rio Atlapexco", tipo: "rio", descripcion: "Río de la región este", lat: 20.7, lng: -98.1 },
            { nombre: "Rio Calabozo", tipo: "rio", descripcion: "Río de la región este", lat: 20.35, lng: -97.9 },
            { nombre: "Rio Garces", tipo: "rio", descripcion: "Río de la región este", lat: 20.05, lng: -97.95 },
            { nombre: "Rio Malila", tipo: "rio", descripcion: "Río de la región central-este", lat: 19.95, lng: -98.15 },
            { nombre: "Rio Huazalingo", tipo: "rio", descripcion: "Río de la región este", lat: 20.25, lng: -98.2 },
            { nombre: "Rio Claro", tipo: "rio", descripcion: "Río de la región central", lat: 20.25, lng: -98.6 },
            { nombre: "Rio Amalac", tipo: "rio", descripcion: "Río de la región central", lat: 20.15, lng: -99.0 },
            { nombre: "Rio San Juan", tipo: "rio", descripcion: "Río de la región oeste", lat: 19.9, lng: -99.3 },
            { nombre: "Rio San Francisco", tipo: "rio", descripcion: "Río de la región oeste", lat: 19.75, lng: -99.35 },
            { nombre: "Rio Tula", tipo: "rio", descripcion: "Río principal de la región central", lat: 19.7, lng: -99.05 },
            { nombre: "Rio Grande", tipo: "rio", descripcion: "Río de la región sureste", lat: 19.6, lng: -98.05 },
            { nombre: "Rio Venados", tipo: "rio", descripcion: "Río de la región central", lat: 19.8, lng: -98.45 },
            { nombre: "Rio Amajac", tipo: "rio", descripcion: "Río de la región central", lat: 19.7, lng: -98.55 },
            { nombre: "Rio Beltran", tipo: "rio", descripcion: "Río de la región este", lat: 19.95, lng: -97.85 },
            { nombre: "Rio Pantepec", tipo: "rio", descripcion: "Río de la región este", lat: 19.85, lng: -97.8 },
            { nombre: "Rio Blanco", tipo: "rio", descripcion: "Río de la región este", lat: 20.411389, lng: -98.088611 },
            { nombre: "Lago Azteca", tipo: "lago", descripcion: "Lago importante de la región central", lat: 20.4, lng: -98.4 },
            { nombre: "Lago Tecocomulco", tipo: "lago", descripcion: "Lago ubicado en la región sur", lat: 19.65, lng: -98.3 },
            { nombre: "Lago Metztitlan", tipo: "lago", descripcion: "Lago de la región central", lat: 19.85, lng: -98.35 },
            { nombre: "Presa Omiltémmetl", tipo: "presa", descripcion: "Presa ubicada en la región este", lat: 19.7, lng: -98.1 },
            { nombre: "Presa El Tejocotal", tipo: "presa", descripcion: "Presa de la región sureste", lat: 19.6, lng: -98.25 },
            { nombre: "Presa Requena", tipo: "presa", descripcion: "Presa de la región sur", lat: 19.65, lng: -99.15 },
            { nombre: "Presa Endhó", tipo: "presa", descripcion: "Presa de la región suroeste", lat: 19.7, lng: -99.2 },
            { nombre: "Presa Fernando Hiriart", tipo: "presa", descripcion: "Presa de la región oeste", lat: 20.05, lng: -99.25 }
        ];

        // Crear consulta masiva de inserción
        const valores = [];
        const placeholders = [];
        
        pinesHidalgo.forEach((pin, index) => {
            const base = index * 6;
            placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
            valores.push(pin.nombre, pin.tipo, pin.descripcion, pin.lat, pin.lng, adminId);
        });

        const insertSQL = `
            INSERT INTO pines (nombre, tipo, descripcion, latitud, longitud, usuario_id) 
            VALUES ${placeholders.join(', ')}
        `;

        const result = await query(insertSQL, valores);
        console.log(`✅ ${pinesHidalgo.length} pines insertados en la base de datos`);

    } catch (error) {
        console.error('❌ Error insertando pines:', error);
    }
}

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

        // Crear tabla de pines
        await query(CREATE_PINES_TABLE);
        console.log('✅ Tabla pines creada o ya existe');

        // Agregar columnas de coordenadas si no existen
        await query(ADD_COORDINATES_COLUMNS);
        console.log('✅ Columnas de coordenadas agregadas o ya existen');

        // Crear índices
        await query(CREATE_INDEXES);
        console.log('✅ Índices de users creados');

        // Crear índices de pines
        await query(CREATE_PINES_INDEXES);
        console.log('✅ Índices de pines creados');

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

        // Insertar pines desde archivo JSON
        await insertPinesFromJson();

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
        
        await query('DROP TABLE IF EXISTS pines CASCADE;');
        console.log('✅ Tabla pines eliminada');
        
        await query('DROP TABLE IF EXISTS users CASCADE;');
        console.log('✅ Tabla users eliminada');
        
        await query('DROP TABLE IF EXISTS pines CASCADE;');
        console.log('✅ Tabla pines eliminada');
        
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