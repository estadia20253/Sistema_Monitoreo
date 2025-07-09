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

// Ruta del mapa (requiere autenticación)
app.get('/mapa', async (req, res) => {
    // Verificar que el usuario esté autenticado
    if (!req.session.user) {
        return res.redirect('/login?error=Debes iniciar sesión para acceder al mapa');
    }
    
    try {
        // Verificar conexión con el backend
        const backendStatus = await verificarBackend();
        
        res.render('layout', { 
            title: 'Mapa - EcoMonitor Acuático',
            pageTitle: 'Mapa',
            backendConnected: backendStatus,
            user: req.session.user || null,
            pageView: 'mapa'
        });
    } catch (error) {
        res.render('layout', { 
            title: 'Mapa - EcoMonitor Acuático',
            pageTitle: 'Mapa',
            backendConnected: false,
            error: 'Error de conexión con el backend',
            user: req.session.user || null,
            pageView: 'mapa'
        });
    }
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
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.render('layout', {
                title: 'Iniciar Sesión',
                pageTitle: 'Login',
                error: 'Por favor ingresa tu email y contraseña',
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

            console.log(`Usuario ${user.getFullName()} (${user.email}) ha iniciado sesión`);
            return res.redirect('/');
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
        const { 
            email,
            password, 
            nombres, 
            apellidoPaterno, 
            apellidoMaterno,
            preguntaSecreta,
            respuestaSecreta,
            acceptTerms 
        } = req.body;

        // Validación de términos y condiciones
        if (!acceptTerms) {
            return res.render('layout', {
                title: 'Registro',
                pageTitle: 'Registro',
                error: 'Debes aceptar los términos y condiciones para continuar',
                user: req.session.user || null,
                pageView: 'register'
            });
        }

        // Validación de campos requeridos
        if (!email || !password || !nombres || !apellidoPaterno || !apellidoMaterno || !preguntaSecreta || !respuestaSecreta) {
            return res.render('layout', {
                title: 'Registro',
                pageTitle: 'Registro',
                error: 'Por favor completa todos los campos obligatorios',
                user: req.session.user || null,
                pageView: 'register'
            });
        }

        // Validación de formato de nombres (solo letras y espacios)
        const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!namePattern.test(nombres) || !namePattern.test(apellidoPaterno) || !namePattern.test(apellidoMaterno)) {
            return res.render('layout', {
                title: 'Registro',
                pageTitle: 'Registro',
                error: 'Los nombres y apellidos solo pueden contener letras y espacios',
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

// API para obtener pines
app.get('/api/pines', async (req, res) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/pines`);
        res.json(response.data);
    } catch (error) {
        console.error('Error al obtener pines:', error.message);
        res.status(500).json({ error: 'Error al obtener pines' });
    }
});

app.post('/api/pines', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/pines`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error al agregar pin:', error.message);
        res.status(500).json({ error: 'Error al agregar pin' });
    }
});

app.delete('/api/pines/:id', async (req, res) => {
    try {
        const response = await axios.delete(`${BACKEND_URL}/api/pines/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error al eliminar pin:', error.message);
        res.status(500).json({ error: 'Error al eliminar pin' });
    }
});

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
        
        const server = app.listen(PORT, () => {
            console.log(`🚀 Servidor frontend ejecutándose en http://localhost:${PORT}`);
            console.log(`� Conectando al backend en http://localhost:5000`);
            console.log(`🎉 Base de datos inicializada correctamente`);
            console.log('');
            console.log('📝 Credenciales de administrador por defecto:');
            console.log('   Email: admin@sistema.com');
            console.log('   Contraseña: admin123');
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
