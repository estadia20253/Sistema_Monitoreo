#!/usr/bin/env node

/**
 * Script para crear el usuario administrador por defecto
 * Ejecutar con: node create-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./config/database');

async function createAdminUser() {
    try {
        console.log('🔧 Creando usuario administrador...');

        // Verificar si ya existe un administrador
        const existingAdmin = await query(
            'SELECT id, email FROM users WHERE role = $1 LIMIT 1',
            ['admin']
        );

        if (existingAdmin.rows.length > 0) {
            console.log(`✅ Ya existe un usuario administrador: ${existingAdmin.rows[0].email}`);
            return;
        }

        // Datos del administrador por defecto
        const adminData = {
            email: 'admin@sistema.com',
            password: 'admin123',
            nombres: 'Administrador',
            apellidoPaterno: 'Sistema',
            apellidoMaterno: 'EcoMonitor',
            preguntaSecreta: '¿Cuál es tu color favorito?',
            respuestaSecreta: 'azul',
            role: 'admin'
        };

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(adminData.password, 12);

        // Insertar usuario administrador
        const result = await query(`
            INSERT INTO users (
                email, password, nombres, apellido_paterno, apellido_materno,
                pregunta_secreta, respuesta_secreta, role, is_active, 
                password_reset_attempts, profile_completeness
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, email, role
        `, [
            adminData.email.toLowerCase(),
            hashedPassword,
            adminData.nombres,
            adminData.apellidoPaterno,
            adminData.apellidoMaterno,
            adminData.preguntaSecreta,
            adminData.respuestaSecreta.toLowerCase(),
            adminData.role,
            true, // is_active
            0,    // password_reset_attempts
            100   // profile_completeness
        ]);

        const newAdmin = result.rows[0];
        
        console.log('🎉 Usuario administrador creado exitosamente:');
        console.log(`   📧 Email: ${newAdmin.email}`);
        console.log(`   🔐 Contraseña: ${adminData.password}`);
        console.log(`   👤 Rol: ${newAdmin.role}`);
        console.log(`   🆔 ID: ${newAdmin.id}`);
        console.log('');
        console.log('💡 Puedes usar estas credenciales para acceder al panel de administrador.');

    } catch (error) {
        console.error('❌ Error creando usuario administrador:', error.message);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createAdminUser()
        .then(() => {
            console.log('✅ Proceso completado');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = { createAdminUser };
