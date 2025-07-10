// Script de validación de configuración
// Ejecutar con: node validate-config.js

require('dotenv').config();

console.log('🔍 Validando configuración del sistema...\n');

// Verificar variables de entorno críticas
const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'BACKEND_URL',
    'SESSION_SECRET'
];

let allGood = true;

console.log('📋 Verificando variables de entorno:');
requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        if (varName === 'DB_PASSWORD' || varName === 'SESSION_SECRET') {
            console.log(`✅ ${varName}: ****** (oculto por seguridad)`);
        } else {
            console.log(`✅ ${varName}: ${value}`);
        }
    } else {
        console.log(`❌ ${varName}: NO CONFIGURADO`);
        allGood = false;
    }
});

console.log('\n🔐 Verificando seguridad:');

// Verificar que la contraseña no esté en valores por defecto peligrosos
const password = process.env.DB_PASSWORD;
if (password) {
    if (password.length < 8) {
        console.log('⚠️  Advertencia: La contraseña de BD es muy corta (recomendado: 8+ caracteres)');
    } else {
        console.log('✅ Contraseña de BD: Longitud adecuada');
    }
} else {
    console.log('❌ Contraseña de BD: NO CONFIGURADA');
    allGood = false;
}

// Verificar SESSION_SECRET
const sessionSecret = process.env.SESSION_SECRET;
if (sessionSecret) {
    if (sessionSecret.length < 32) {
        console.log('⚠️  Advertencia: SESSION_SECRET es muy corto (recomendado: 32+ caracteres)');
    } else {
        console.log('✅ SESSION_SECRET: Longitud adecuada');
    }
} else {
    console.log('❌ SESSION_SECRET: NO CONFIGURADO');
    allGood = false;
}

// Verificar conexión a base de datos
console.log('\n🗄️  Verificando conexión a PostgreSQL:');
const { testConnection } = require('./config/database');

testConnection()
    .then(connected => {
        if (connected) {
            console.log('✅ Conexión a PostgreSQL: EXITOSA');
        } else {
            console.log('❌ Conexión a PostgreSQL: FALLIDA');
            allGood = false;
        }
        
        console.log('\n📊 Resumen de validación:');
        if (allGood) {
            console.log('🎉 ¡Todas las configuraciones están correctas!');
            console.log('✅ El sistema está listo para usar');
        } else {
            console.log('❌ Hay problemas de configuración que deben resolverse');
            console.log('💡 Revisa las variables de entorno en el archivo .env');
        }
    })
    .catch(error => {
        console.log('❌ Error al verificar conexión:', error.message);
        console.log('\n📊 Resumen de validación:');
        console.log('❌ Hay problemas de configuración que deben resolverse');
        console.log('💡 Revisa las variables de entorno en el archivo .env');
    });
