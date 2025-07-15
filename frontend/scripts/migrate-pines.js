const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Función para migrar pines desde el archivo JSON al PostgreSQL
async function migratePinesFromJson() {
    try {
        console.log('🔄 Iniciando migración de pines desde JSON a PostgreSQL...');

        // Leer el archivo pines.json del backend
        const pinesJsonPath = path.join(__dirname, '../../backend/data/pines.json');
        
        if (!fs.existsSync(pinesJsonPath)) {
            console.log('❌ No se encontró el archivo pines.json');
            return;
        }

        const pinesData = JSON.parse(fs.readFileSync(pinesJsonPath, 'utf8'));
        console.log(`📁 Archivo JSON leído: ${pinesData.length} pines encontrados`);

        // Obtener el usuario admin para asignar como creador
        const adminResult = await query(
            'SELECT id FROM users WHERE email = $1',
            ['admin@sistema.com']
        );

        if (adminResult.rows.length === 0) {
            console.log('❌ Usuario administrador no encontrado');
            return;
        }

        const adminId = adminResult.rows[0].id;
        console.log(`👤 Usuario admin encontrado con ID: ${adminId}`);

        let pinesGuardados = 0;
        let pinesOmitidos = 0;

        for (const pin of pinesData) {
            try {
                // Verificar si el pin ya existe (por nombre y tipo)
                const existingPin = await query(
                    'SELECT id FROM pines WHERE nombre = $1 AND tipo = $2 AND activo = true',
                    [pin.nombre, pin.tipo]
                );

                if (existingPin.rows.length > 0) {
                    console.log(`⏭️  Pin "${pin.nombre}" ya existe, omitiendo...`);
                    pinesOmitidos++;
                    continue;
                }

                // Preparar datos del pin
                const pinData = {
                    nombre: pin.nombre?.trim() || '',
                    tipo: pin.tipo?.trim() || 'rio',
                    descripcion: pin.descripcion?.trim() || '',
                    x: pin.x !== null && pin.x !== undefined ? parseFloat(pin.x) : null,
                    y: pin.y !== null && pin.y !== undefined ? parseFloat(pin.y) : null,
                    usuario_id: adminId
                };

                // Validar datos requeridos
                if (!pinData.nombre || !pinData.tipo) {
                    console.log(`⚠️  Pin con datos incompletos omitido:`, pin);
                    pinesOmitidos++;
                    continue;
                }

                // Insertar pin en la base de datos
                const insertResult = await query(`
                    INSERT INTO pines (nombre, tipo, descripcion, x, y, usuario_id, activo, fecha_creacion)
                    VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
                    RETURNING id, nombre, x, y
                `, [
                    pinData.nombre,
                    pinData.tipo,
                    pinData.descripcion,
                    pinData.x,
                    pinData.y,
                    pinData.usuario_id
                ]);

                const savedPin = insertResult.rows[0];
                console.log(`✅ Pin guardado: ID ${savedPin.id}, "${savedPin.nombre}" (x:${savedPin.x}, y:${savedPin.y})`);
                pinesGuardados++;

            } catch (error) {
                console.error(`❌ Error guardando pin "${pin.nombre}":`, error.message);
                pinesOmitidos++;
            }
        }

        console.log('\n📊 Resumen de migración:');
        console.log(`✅ Pines guardados: ${pinesGuardados}`);
        console.log(`⏭️  Pines omitidos: ${pinesOmitidos}`);
        console.log(`📁 Total en JSON: ${pinesData.length}`);
        console.log('🎉 Migración completada');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    }
}

// Función para limpiar todos los pines (solo para desarrollo)
async function clearAllPines() {
    try {
        console.log('🗑️  Limpiando todos los pines...');
        const result = await query('DELETE FROM pines');
        console.log(`✅ ${result.rowCount} pines eliminados`);
    } catch (error) {
        console.error('❌ Error limpiando pines:', error);
        throw error;
    }
}

// Función para mostrar estadísticas
async function showPinesStats() {
    try {
        console.log('\n📊 Estadísticas de pines en PostgreSQL:');
        
        const totalResult = await query('SELECT COUNT(*) as total FROM pines WHERE activo = true');
        console.log(`📍 Total de pines activos: ${totalResult.rows[0].total}`);

        const withCoordsResult = await query('SELECT COUNT(*) as total FROM pines WHERE activo = true AND x IS NOT NULL AND y IS NOT NULL');
        console.log(`🗺️  Pines con coordenadas: ${withCoordsResult.rows[0].total}`);

        const withoutCoordsResult = await query('SELECT COUNT(*) as total FROM pines WHERE activo = true AND (x IS NULL OR y IS NULL)');
        console.log(`❓ Pines sin coordenadas: ${withoutCoordsResult.rows[0].total}`);

        const byTypeResult = await query(`
            SELECT tipo, COUNT(*) as cantidad 
            FROM pines 
            WHERE activo = true 
            GROUP BY tipo 
            ORDER BY cantidad DESC
        `);
        
        console.log('\n📋 Por tipo:');
        byTypeResult.rows.forEach(row => {
            console.log(`  ${row.tipo}: ${row.cantidad}`);
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
    }
}

module.exports = {
    migratePinesFromJson,
    clearAllPines,
    showPinesStats
};

// Si se ejecuta directamente
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--clear')) {
        clearAllPines()
            .then(() => migratePinesFromJson())
            .then(() => showPinesStats())
            .then(() => process.exit(0))
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });
    } else if (args.includes('--stats')) {
        showPinesStats()
            .then(() => process.exit(0))
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });
    } else {
        migratePinesFromJson()
            .then(() => showPinesStats())
            .then(() => process.exit(0))
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });
    }
}
