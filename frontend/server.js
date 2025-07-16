// Cargar variables de entorno
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');

// Importar configuración de base de datos y modelos
const { testConnection } = require('./config/database');
const { initializeDatabase } = require('./config/init-db');
const User = require('./models/User');
const Pin = require('./models/Pin');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// Configuración de middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'mi_secreto_super_seguro_para_sesiones_2024',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    
    // Log de todas las peticiones POST para debug
    if (req.method === 'POST') {
        console.log(`🔍 POST ${req.path} - Content-Type: ${req.headers['content-type']}`);
        console.log(`🔍 Body size: ${JSON.stringify(req.body).length} chars`);
    }
    
    next();
});

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ruta principal - Página de inicio
app.get('/', (req, res) => {
    res.render('layout', { 
        title: 'Sistema de Monitoreo de Ecosistemas Acuáticos',
        pageTitle: 'Inicio',
        user: req.session.user || null,
        pageView: 'index'
    });
});

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login?error=Debes iniciar sesión para acceder a esta página');
    }
    next();
}

// Middleware para verificar rol de administrador
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login?error=Debes iniciar sesión para acceder a esta página');
    }
    if (req.session.user.role !== 'admin') {
        return res.redirect('/mapa?error=No tienes permisos de administrador');
    }
    next();
}

// Ruta del mapa (requiere autenticación y diferencia por roles)
app.get('/mapa', requireAuth, async (req, res) => {
    try {
        // Verificar conexión con el backend
        const backendStatus = await verificarBackend();
        
        // Determinar configuración según el rol del usuario
        const isAdmin = req.session.user.role === 'admin';
        const pageTitle = isAdmin ? 'Panel de Administrador - EcoMonitor' : 'Mapa - Ecosistemas Acuáticos';
        
        res.render('layout', { 
            title: pageTitle,
            pageTitle: pageTitle,
            backendConnected: backendStatus,
            user: req.session.user,
            isAdmin: isAdmin,
            pageView: 'mapa'
        });
    } catch (error) {
        const isAdmin = req.session.user.role === 'admin';
        const pageTitle = isAdmin ? 'Panel de Administrador - EcoMonitor' : 'Mapa - Ecosistemas Acuáticos';
        
        res.render('layout', { 
            title: pageTitle,
            pageTitle: pageTitle,
            backendConnected: false,
            error: 'Error de conexión con el backend',
            user: req.session.user,
            isAdmin: isAdmin,
            pageView: 'mapa'
        });
    }
});

// Ruta específica para administradores (opcional, acceso directo)
app.get('/admin', requireAdmin, async (req, res) => {
    // Redirigir a /mapa ya que ahora es una vista unificada
    res.redirect('/mapa');
});

// Formularios de autenticación
app.get('/login', (req, res) => {
    // Si el usuario ya está autenticado, redirigir al inicio
    if (req.session.user) {
        return res.redirect('/');
    }
    
    const success = req.query.success;
    const error = req.query.error;
    res.render('layout', {
        title: 'Iniciar Sesión',
        pageTitle: 'Login',
        user: req.session.user || null,
        pageView: 'login',
        success: success || undefined,
        error: error || undefined
    });
});

app.post('/login', async (req, res) => {
    // Si el usuario ya está autenticado, redirigir al inicio
    if (req.session.user) {
        return res.redirect('/');
    }
    
    try {
        const email = sanitizeInput(req.body.email);
        const password = req.body.password;
        
        // Validaciones del lado del servidor
        const errors = [];
        
        if (!email) {
            errors.push('El email es obligatorio');
        } else if (!validateEmail(email)) {
            errors.push('El formato del email no es válido');
        }
        
        if (!password) {
            errors.push('La contraseña es obligatoria');
        } else if (!validatePassword(password)) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        }
        
        if (errors.length > 0) {
            return res.render('layout', {
                title: 'Iniciar Sesión',
                pageTitle: 'Login',
                error: errors.join('. '),
                user: req.session.user || null,
                pageView: 'login'
            });
        }

        // Buscar usuario por email en PostgreSQL
        const user = await User.findByEmail(email);

        if (user && await user.validatePassword(password)) {
            // Verificar si la cuenta está activa
            if (!user.isActive) {
                return res.render('layout', {
                    title: 'Iniciar Sesión',
                    pageTitle: 'Login',
                    error: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
                    user: req.session.user || null,
                    pageView: 'login'
                });
            }

            // Actualizar último login
            await user.updateLastLogin();

            // Crear sesión con información del usuario
            req.session.user = user.toSessionData();

            console.log(`Usuario ${user.getFullName()} (${user.email}) ha iniciado sesión con rol: ${user.role}`);
            
            // Redirigir al mapa (que ahora se adapta según el rol)
            return res.redirect('/mapa');
        }

        res.render('layout', {
            title: 'Iniciar Sesión',
            pageTitle: 'Login',
            error: 'Email o contraseña incorrectos',
            user: req.session.user || null,
            pageView: 'login'
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.render('layout', {
            title: 'Iniciar Sesión',
            pageTitle: 'Login',
            error: 'Error interno del servidor. Por favor intenta de nuevo.',
            user: req.session.user || null,
            pageView: 'login'
        });
    }
});

app.get('/register', (req, res) => {
    // Si el usuario ya está autenticado, redirigir al inicio
    if (req.session.user) {
        return res.redirect('/');
    }
    
    res.render('layout', {
        title: 'Registro',
        pageTitle: 'Registro',
        user: req.session.user || null,
        pageView: 'register'
    });
});

app.post('/register', async (req, res) => {
    // Si el usuario ya está autenticado, redirigir al inicio
    if (req.session.user) {
        return res.redirect('/');
    }
    
    try {
        // Sanitizar entradas
        const email = sanitizeInput(req.body.email);
        const password = req.body.password;
        const nombres = sanitizeInput(req.body.nombres);
        const apellidoPaterno = sanitizeInput(req.body.apellidoPaterno);
        const apellidoMaterno = sanitizeInput(req.body.apellidoMaterno);
        const preguntaSecreta = sanitizeInput(req.body.preguntaSecreta);
        const respuestaSecreta = sanitizeInput(req.body.respuestaSecreta);
        const acceptTerms = req.body.acceptTerms;

        // Validaciones del lado del servidor
        const errors = [];

        // Validación de términos y condiciones
        if (!acceptTerms) {
            errors.push('Debes aceptar los términos y condiciones para continuar');
        }

        // Validación de campos requeridos
        if (!email) errors.push('El email es obligatorio');
        if (!password) errors.push('La contraseña es obligatoria');
        if (!nombres) errors.push('Los nombres son obligatorios');
        if (!apellidoPaterno) errors.push('El apellido paterno es obligatorio');
        if (!apellidoMaterno) errors.push('El apellido materno es obligatorio');
        if (!preguntaSecreta) errors.push('La pregunta secreta es obligatoria');
        if (!respuestaSecreta) errors.push('La respuesta secreta es obligatoria');

        // Validaciones de formato
        if (email && !validateEmail(email)) {
            errors.push('El formato del email no es válido');
        }
        
        if (password && !validatePassword(password)) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        }
        
        if (nombres && !validateName(nombres)) {
            errors.push('Los nombres solo pueden contener letras y espacios');
        }
        
        if (apellidoPaterno && !validateName(apellidoPaterno)) {
            errors.push('El apellido paterno solo puede contener letras y espacios');
        }
        
        if (apellidoMaterno && !validateName(apellidoMaterno)) {
            errors.push('El apellido materno solo puede contener letras y espacios');
        }
        
        if (respuestaSecreta && !validateSecretAnswer(respuestaSecreta)) {
            errors.push('La respuesta secreta debe tener al menos 3 caracteres');
        }

        // Si hay errores, mostrarlos
        if (errors.length > 0) {
            return res.render('layout', {
                title: 'Registro',
                pageTitle: 'Registro',
                error: errors.join('. '),
                user: req.session.user || null,
                pageView: 'register'
            });
        }

        // Verificar si el email ya existe
        const existingUser = await User.findByEmail(email);
        
        if (existingUser) {
            return res.render('layout', {
                title: 'Registro',
                pageTitle: 'Registro',
                error: 'Este email ya está registrado',
                user: req.session.user || null,
                pageView: 'register'
            });
        }

        // Validación de contraseña
        if (password.length < 6) {
            return res.render('layout', {
                title: 'Registro',
                pageTitle: 'Registro',
                error: 'La contraseña debe tener al menos 6 caracteres',
                user: req.session.user || null,
                pageView: 'register'
            });
        }

        // Crear nuevo usuario solo con campos esenciales
        const userData = {
            email: email.toLowerCase().trim(),
            password: password,
            nombres: nombres.trim(),
            apellidoPaterno: apellidoPaterno.trim(),
            apellidoMaterno: apellidoMaterno.trim(),
            preguntaSecreta,
            respuestaSecreta: respuestaSecreta.toLowerCase().trim(),
            role: 'user',
            isActive: true,
            passwordResetAttempts: 0,
            profileCompleteness: 100 // 100% ya que solo incluye campos esenciales
        };

        // Guardar usuario en PostgreSQL
        const newUser = await User.create(userData);

        console.log(`Nuevo usuario registrado: ${newUser.getFullName()} (${email})`);
        
        // Redirigir al login con mensaje de éxito
        res.redirect('/login?success=¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');

    } catch (error) {
        console.error('Error en registro:', error);
        
        // Error genérico
        res.render('layout', {
            title: 'Registro',
            pageTitle: 'Registro',
            error: 'Error interno del servidor. Por favor intenta de nuevo.',
            user: req.session.user || null,
            pageView: 'register'
        });
    }
});

app.get('/logout', (req, res) => {
    // Si no hay sesión activa, redirigir al inicio
    if (!req.session.user) {
        return res.redirect('/');
    }
    
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Ruta para mostrar formulario de recuperación de contraseña
app.get('/forgot-password', (req, res) => {
    // Si el usuario ya está autenticado, redirigir al inicio
    if (req.session.user) {
        return res.redirect('/');
    }
    
    res.render('layout', {
        title: 'Recuperar Contraseña',
        pageTitle: 'Recuperar Contraseña',
        user: req.session.user || null,
        pageView: 'forgot-password'
    });
});

// Procesar solicitud de recuperación de contraseña
app.post('/forgot-password', async (req, res) => {
    // Si el usuario ya está autenticado, redirigir al inicio
    if (req.session.user) {
        return res.redirect('/');
    }
    
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.render('layout', {
                title: 'Recuperar Contraseña',
                pageTitle: 'Recuperar Contraseña',
                error: 'Por favor ingresa tu email',
                user: req.session.user || null,
                pageView: 'forgot-password'
            });
        }

        // Buscar usuario por email
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.render('layout', {
                title: 'Recuperar Contraseña',
                pageTitle: 'Recuperar Contraseña',
                error: 'No existe una cuenta con este email',
                user: req.session.user || null,
                pageView: 'forgot-password'
            });
        }

        // Verificar límite de intentos de recuperación
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        if (user.lastPasswordResetAttempt && user.lastPasswordResetAttempt > oneHourAgo && user.passwordResetAttempts >= 3) {
            return res.render('layout', {
                title: 'Recuperar Contraseña',
                pageTitle: 'Recuperar Contraseña',
                error: 'Has excedido el límite de intentos. Espera una hora antes de intentar de nuevo.',
                user: req.session.user || null,
                pageView: 'forgot-password'
            });
        }

        // Mostrar pregunta secreta
        res.render('layout', {
            title: 'Pregunta Secreta',
            pageTitle: 'Pregunta Secreta',
            user: req.session.user || null,
            pageView: 'secret-question',
            userData: {
                email: user.email,
                preguntaSecreta: user.preguntaSecreta
            }
        });

    } catch (error) {
        console.error('Error en forgot-password:', error);
        res.render('layout', {
            title: 'Recuperar Contraseña',
            pageTitle: 'Recuperar Contraseña',
            error: 'Error interno del servidor. Por favor intenta de nuevo.',
            user: req.session.user || null,
            pageView: 'forgot-password'
        });
    }
});

// Verificar respuesta secreta y permitir cambio de contraseña
app.post('/verify-secret-answer', async (req, res) => {
    try {
        const { email, respuestaSecreta } = req.body;
        
        if (!email || !respuestaSecreta) {
            return res.render('layout', {
                title: 'Pregunta Secreta',
                pageTitle: 'Pregunta Secreta',
                error: 'Por favor completa todos los campos',
                user: req.session.user || null,
                pageView: 'secret-question',
                userData: { email }
            });
        }

        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.redirect('/forgot-password');
        }

        // Incrementar contador de intentos
        await user.incrementPasswordResetAttempts();

        // Verificar respuesta secreta
        if (user.respuestaSecreta === respuestaSecreta.toLowerCase().trim()) {
            // Respuesta correcta - resetear contador y permitir cambio de contraseña
            await user.resetPasswordResetAttempts();
            
            // Crear token temporal en sesión para cambio de contraseña
            req.session.resetPasswordToken = {
                email: user.email,
                timestamp: Date.now(),
                expires: Date.now() + (15 * 60 * 1000) // 15 minutos
            };
            
            res.render('layout', {
                title: 'Nueva Contraseña',
                pageTitle: 'Nueva Contraseña',
                user: req.session.user || null,
                pageView: 'reset-password',
                userData: { email: user.email }
            });
        } else {
            const attemptsLeft = Math.max(0, 3 - user.passwordResetAttempts);
            
            res.render('layout', {
                title: 'Pregunta Secreta',
                pageTitle: 'Pregunta Secreta',
                error: `Respuesta incorrecta. Te quedan ${attemptsLeft} intentos.`,
                user: req.session.user || null,
                pageView: 'secret-question',
                userData: {
                    email: user.email,
                    preguntaSecreta: user.preguntaSecreta
                }
            });
        }

    } catch (error) {
        console.error('Error en verify-secret-answer:', error);
        res.redirect('/forgot-password');
    }
});

// Establecer nueva contraseña
app.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        
        // Verificar token de sesión
        if (!req.session.resetPasswordToken || 
            req.session.resetPasswordToken.email !== email ||
            Date.now() > req.session.resetPasswordToken.expires) {
            return res.redirect('/forgot-password');
        }

        if (!newPassword || !confirmPassword) {
            return res.render('layout', {
                title: 'Nueva Contraseña',
                pageTitle: 'Nueva Contraseña',
                error: 'Por favor completa todos los campos',
                user: req.session.user || null,
                pageView: 'reset-password',
                userData: { email }
            });
        }

        if (newPassword !== confirmPassword) {
            return res.render('layout', {
                title: 'Nueva Contraseña',
                pageTitle: 'Nueva Contraseña',
                error: 'Las contraseñas no coinciden',
                user: req.session.user || null,
                pageView: 'reset-password',
                userData: { email }
            });
        }

        if (newPassword.length < 6) {
            return res.render('layout', {
                title: 'Nueva Contraseña',
                pageTitle: 'Nueva Contraseña',
                error: 'La contraseña debe tener al menos 6 caracteres',
                user: req.session.user || null,
                pageView: 'reset-password',
                userData: { email }
            });
        }

        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.redirect('/forgot-password');
        }

        // Actualizar contraseña
        await user.updatePassword(newPassword);
        await user.resetPasswordResetAttempts();

        // Limpiar token de sesión
        delete req.session.resetPasswordToken;

        console.log(`Contraseña cambiada para usuario: ${user.getFullName()} (${email})`);
        
        res.redirect('/login?success=¡Contraseña cambiada exitosamente! Ya puedes iniciar sesión.');

    } catch (error) {
        console.error('Error en reset-password:', error);
        res.redirect('/forgot-password');
    }
});

// API para obtener datos del ecosistema
app.get('/api/datos-ecosistema', async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/datos-ecosistema`);
        res.json(response.data);
    } catch (error) {
        console.error('Error al obtener datos del ecosistema:', error.message);
        res.status(500).json({ 
            error: 'Error al conectar con el backend',
            message: error.message 
        });
    }
});

// API para obtener el mapa (requiere autenticación)
app.get('/api/mapa', async (req, res) => {
    // Verificar que el usuario esté autenticado
    if (!req.session.user) {
        return res.status(401).json({ 
            error: 'No autorizado',
            message: 'Debes iniciar sesión para acceder al mapa'
        });
    }
    
    try {
        console.log(`Intentando conectar al backend: ${BACKEND_URL}/api/mapa`);
        const response = await axios.get(`${BACKEND_URL}/api/mapa`, {
            responseType: 'stream',
            timeout: 10000,
            headers: {
                'Accept': 'image/png, image/jpeg, image/gif, */*'
            }
        });
        
        // Establecer headers correctos para la imagen
        res.setHeader('Content-Type', 'image/png');
        response.data.pipe(res);
    } catch (error) {
        console.error('Error detallado:', error.response?.status, error.response?.statusText);
        console.error('Error al obtener el mapa:', error.message);
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            res.status(503).json({ 
                error: 'Backend no disponible',
                message: 'No se pudo conectar al servidor backend. Verifica que esté ejecutándose en el puerto 5000.',
                debug: `Intentando conectar a: ${BACKEND_URL}/api/mapa`
            });
        } else if (error.response?.status === 404) {
            res.status(404).json({ 
                error: 'Imagen no encontrada',
                message: 'La imagen del mapa no se encontró en el backend.'
            });
        } else {
            res.status(500).json({ 
                error: 'Error al cargar el mapa',
                message: error.message,
                debug: `Error code: ${error.code}`
            });
        }
    }
});

// API para obtener pines (desde base de datos + backend para coordenadas)
app.get('/api/pines', async (req, res) => {
    try {
        // Obtener pines de la base de datos
        const pinesDB = await Pin.findAll();
        
        // Obtener pines del backend (que incluye coordenadas)
        let pinesBackend = [];
        try {
            const response = await axios.get(`${BACKEND_URL}/api/pines`);
            pinesBackend = response.data;
        } catch (backendError) {
            console.warn('Backend no disponible para coordenadas:', backendError.message);
        }

        // Combinar datos: información de BD + coordenadas del backend
        const pinesCombinados = pinesDB.map(pinDB => {
            const pinBackend = pinesBackend.find(p => p.id === pinDB.id);
            const pinData = {
                ...pinDB.toJSON()
            };
            
            // Solo agregar coordenadas si existen en el backend
            if (pinBackend && pinBackend.lat !== null && pinBackend.lng !== null) {
                pinData.lat = pinBackend.lat;
                pinData.lng = pinBackend.lng;
                // Convertir para compatibilidad con frontend
                pinData.x = pinBackend.lng;  // lng corresponde a x
                pinData.y = pinBackend.lat;  // lat corresponde a y
            } else {
                // Sin coordenadas
                pinData.lat = null;
                pinData.lng = null;
                pinData.x = null;
                pinData.y = null;
            }
            
            return pinData;
        });

        res.json(pinesCombinados);
    } catch (error) {
        console.error('Error al obtener pines:', error.message);
        res.status(500).json({ error: 'Error al obtener pines' });
    }
});

app.post('/api/pines', async (req, res) => {
    // Verificar autenticación
    if (!req.session.user) {
        console.log('❌ Error: Usuario no autenticado');
        return res.status(401).json({ error: 'Debes iniciar sesión para crear pines' });
    }

    try {
        console.log('📍 Recibiendo petición para crear pin:');
        console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
        console.log('📋 Body completo:', JSON.stringify(req.body, null, 2));
        console.log('📋 Content-Type:', req.headers['content-type']);
        
        const { nombre, tipo, descripcion, lat, lng, latitud, longitud } = req.body;
        
        console.log('📋 Datos extraídos:');
        console.log('  - nombre:', typeof nombre, '=', nombre);
        console.log('  - tipo:', typeof tipo, '=', tipo);
        console.log('  - descripcion:', typeof descripcion, '=', descripcion);
        console.log('  - lat:', typeof lat, '=', lat);
        console.log('  - lng:', typeof lng, '=', lng);
        console.log('  - latitud:', typeof latitud, '=', latitud);
        console.log('  - longitud:', typeof longitud, '=', longitud);

        // Validar datos requeridos (nombre y tipo son obligatorios, coordenadas opcionales)
        if (!nombre || !tipo) {
            console.log('❌ Error: Faltan datos requeridos');
            console.log('❌ nombre válido:', !!nombre, 'tipo válido:', !!tipo);
            return res.status(400).json({ error: 'Faltan datos requeridos: nombre y tipo' });
        }

        console.log('✅ Datos válidos, creando pin en base de datos...');

        // Determinar coordenadas finales (priorizar latitud/longitud, luego lat/lng)
        const coordenadasFinales = {
            latitud: latitud !== null && latitud !== undefined ? parseFloat(latitud) : 
                    (lat !== null && lat !== undefined ? parseFloat(lat) : null),
            longitud: longitud !== null && longitud !== undefined ? parseFloat(longitud) : 
                     (lng !== null && lng !== undefined ? parseFloat(lng) : null)
        };

        // Preparar datos para la base de datos (incluyendo coordenadas geográficas si están disponibles)
        const pinData = {
            nombre: nombre.trim(),
            tipo: tipo.trim(),
            descripcion: descripcion?.trim() || '',
            latitud: coordenadasFinales.latitud,
            longitud: coordenadasFinales.longitud,
            usuario_id: req.session.user.id
        };

        console.log('📊 Datos para BD (con coordenadas geográficas):', pinData);
        const pinDB = await Pin.create(pinData);
        console.log('✅ Pin creado en BD con ID:', pinDB.id, 'lat:', pinDB.latitud, 'lng:', pinDB.longitud);

        // Solo enviar al backend si hay coordenadas
        let pinBackend = null;
        if ((lat !== null && lng !== null) || (x !== null && y !== null)) {
            console.log('📍 Enviando coordenadas al backend...');
            const backendData = {
                id: pinDB.id,
                nombre: pinDB.nombre,
                tipo: pinDB.tipo,
                descripcion: pinDB.descripcion,
                // Usar las coordenadas que estén disponibles
                lat: lat !== null ? lat : y,  // y corresponde a lat en el sistema de porcentajes
                lng: lng !== null ? lng : x   // x corresponde a lng en el sistema de porcentajes
            };

            try {
                const backendResponse = await axios.post(`${BACKEND_URL}/api/pines`, backendData);
                pinBackend = backendResponse.data;
                console.log('✅ Pin enviado al backend:', pinBackend);
            } catch (backendError) {
                console.warn('⚠️ Error enviando al backend:', backendError.message);
                // No eliminar de BD si falla el backend, ya que las coordenadas son opcionales
            }
        } else {
            console.log('ℹ️ Pin creado sin coordenadas (temporal)');
        }

        // Responder con datos combinados
        const responseData = {
            ...pinDB.toJSON(),
            success: true,
            message: 'Pin creado exitosamente'
        };

        // Agregar coordenadas si están disponibles
        if (pinBackend) {
            responseData.lat = pinBackend.lat;
            responseData.lng = pinBackend.lng;
            responseData.x = pinBackend.lng;  // lng corresponde a x en el frontend
            responseData.y = pinBackend.lat;  // lat corresponde a y en el frontend
        } else if (x !== null && y !== null) {
            responseData.x = x;
            responseData.y = y;
        }

        console.log('🎉 Pin creado exitosamente. Respuesta:', responseData);
        res.json(responseData);

    } catch (error) {
        console.error('💥 Error al agregar pin:', error);
        console.error('📋 Stack trace:', error.stack);
        
        if (error.response?.status === 400) {
            res.status(400).json({ error: 'Datos inválidos' });
        } else {
            res.status(500).json({ error: 'Error al agregar pin: ' + error.message });
        }
    }
});

// Endpoint para actualizar coordenadas de un pin
app.put('/api/pines/:id', async (req, res) => {
    // Verificar autenticación
    if (!req.session.user) {
        return res.status(401).json({ error: 'Debes iniciar sesión para actualizar pines' });
    }

    try {
        const pinId = parseInt(req.params.id);
        const { latitud, longitud } = req.body;
        
        // Validar que se proporcionaron las coordenadas
        if (!latitud || !longitud) {
            return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
        }
        
        // Validar que las coordenadas están en el rango válido para Hidalgo
        if (latitud < 19.6 || latitud > 21.4 || longitud < -99.8 || longitud > -97.8) {
            return res.status(400).json({ error: 'Coordenadas fuera del rango válido para Hidalgo' });
        }
        
        // Verificar que el pin existe en la BD
        const pin = await Pin.findById(pinId);
        if (!pin) {
            return res.status(404).json({ error: 'Pin no encontrado' });
        }
        
        // Actualizar las coordenadas
        const updatedPin = await Pin.update(pinId, {
            latitud: latitud,
            longitud: longitud
        });
        
        console.log(`Pin ${pinId} actualizado: latitud=${latitud}, longitud=${longitud}`);
        res.json({ 
            message: 'Coordenadas actualizadas correctamente',
            pin: updatedPin 
        });
        
    } catch (error) {
        console.error('Error al actualizar coordenadas del pin:', error);
        res.status(500).json({ error: 'Error al actualizar pin: ' + error.message });
    }
});

app.delete('/api/pines/:id', async (req, res) => {
    // Verificar autenticación
    if (!req.session.user) {
        return res.status(401).json({ error: 'Debes iniciar sesión para eliminar pines' });
    }

    try {
        const pinId = parseInt(req.params.id);
        
        // Verificar que el pin existe en la BD
        const pin = await Pin.findById(pinId);
        if (!pin) {
            return res.status(404).json({ error: 'Pin no encontrado' });
        }

        // Verificar permisos (solo el creador o admin puede eliminar)
        if (pin.usuario_id !== req.session.user.id && req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'No tienes permisos para eliminar este pin' });
        }

        // Eliminar del backend primero
        try {
            await axios.delete(`${BACKEND_URL}/api/pines/${pinId}`);
        } catch (backendError) {
            console.warn('Error eliminando del backend:', backendError.message);
            // Continuar aunque falle el backend
        }

        // Eliminar de la base de datos (eliminación lógica)
        await Pin.deleteById(pinId);

        res.json({ 
            success: true, 
            message: 'Pin eliminado exitosamente',
            id: pinId 
        });

    } catch (error) {
        console.error('Error al eliminar pin:', error.message);
        res.status(500).json({ error: 'Error al eliminar pin' });
    }
});

// Funciones de validación para el servidor
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 100;
}

function validatePassword(password) {
    return password && password.length >= 6 && password.length <= 100;
}

function validateName(name) {
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return namePattern.test(name) && name.trim().length >= 2 && name.length <= 100;
}

function validateSecretAnswer(answer) {
    return answer && answer.trim().length >= 3 && answer.length <= 100;
}

function sanitizeInput(input) {
    return typeof input === 'string' ? input.trim() : '';
}

// Función para verificar estado del backend
async function verificarBackend() {
    try {
        const response = await axios.get(BACKEND_URL, { timeout: 3000 });
        console.log('✅ Backend conectado correctamente');
        return response.status === 200;
    } catch (error) {
        console.warn('❌ Backend no disponible:', error.message);
        return false;
    }
}

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('error', { 
        title: 'Página no encontrada',
        pageTitle: 'Error 404',
        message: 'La página que buscas no existe'
    });
});

// Inicializar la base de datos al arrancar el servidor
async function startServer() {
    try {
        // Probar conexión y inicializar base de datos
        console.log('🔄 Inicializando servidor...');
        await initializeDatabase();
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor frontend ejecutándose en http://localhost:${PORT}`);
            console.log(`📱 También disponible en tu red local: http://172.16.20.25:${PORT}`);
            console.log(`🔗 Conectando al backend en http://localhost:5000`);
            console.log(`🎉 Base de datos inicializada correctamente`);
            console.log('');
            console.log('📝 Credenciales de administrador por defecto:');
            console.log('   Email: admin@sistema.com');
            console.log('   Contraseña: admin123');
            console.log('');
            console.log('📲 Para acceder desde tu teléfono:');
            console.log('   1. Conecta tu teléfono a la misma red WiFi');
            console.log('   2. Abre el navegador y ve a: http://172.16.20.25:3000');
            console.log('');
        });
        
        // Manejo de errores del servidor
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
                console.log('💡 Soluciones:');
                console.log('   1. Cambia el puerto en el archivo .env');
                console.log('   2. Termina otros procesos que usen este puerto');
                console.log('   3. Usa: taskkill /F /IM node.exe (para terminar todos los procesos Node.js)');
                process.exit(1);
            } else {
                console.error('❌ Error del servidor:', error);
                process.exit(1);
            }
        });
        
        // Manejo de terminación graciosa
        process.on('SIGINT', () => {
            console.log('\n🛑 Terminando servidor...');
            server.close(() => {
                console.log('✅ Servidor terminado correctamente');
                process.exit(0);
            });
        });
        
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error.message);
        console.log('');
        console.log('🔧 Posibles soluciones:');
        console.log('   1. Verifica que PostgreSQL esté corriendo');
        console.log('   2. Verifica las credenciales en el archivo .env');
        console.log('   3. Asegúrate de que la base de datos existe');
        console.log('');
        process.exit(1);
    }
}

startServer();
