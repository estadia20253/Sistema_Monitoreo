# Migración a PostgreSQL - Sistema EcoMonitor

## 📋 Resumen
Se ha migrado exitosamente el sistema de almacenamiento de usuarios desde memoria (arrays) hacia PostgreSQL, una base de datos robusta y escalable.

## 🔧 Configuración Requerida

### 1. Instalar PostgreSQL
```bash
# Windows (con Chocolatey)
choco install postgresql

# Windows (Installer directo)
# Descargar desde: https://www.postgresql.org/download/windows/

# macOS (con Homebrew)
brew install postgresql

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib
```

### 2. Crear la Base de Datos
```sql
-- Conectar como postgres
psql -U postgres

-- Crear la base de datos
CREATE DATABASE ecomonitor_db;

-- Crear usuario específico (opcional)
CREATE USER ecomonitor WITH PASSWORD 'mi_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE ecomonitor_db TO ecomonitor;
```

### 3. Configurar Variables de Entorno
Edita el archivo `.env` con tus credenciales:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecomonitor_db
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
```

## 📁 Archivos Agregados

### Configuración de Base de Datos
- `config/database.js` - Configuración del pool de conexiones PostgreSQL
- `config/init-db.js` - Scripts de inicialización y creación de tablas

### Modelo de Usuario
- `models/User.js` - Modelo completo de Usuario con métodos de base de datos

### Variables de Entorno
- `.env` - Configuración de la aplicación y base de datos

## 🗃️ Estructura de la Base de Datos

### Tabla: users
```sql
CREATE TABLE users (
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
```

### Índices Optimizados
- `idx_users_email` - Búsquedas por email
- `idx_users_role` - Filtros por rol
- `idx_users_is_active` - Usuarios activos

## 🚀 Funcionalidades Implementadas

### Gestión de Usuarios
- ✅ Registro de usuarios con validación
- ✅ Login con autenticación segura
- ✅ Recuperación de contraseña por pregunta secreta
- ✅ Hash seguro de contraseñas con bcrypt
- ✅ Gestión de sesiones
- ✅ Control de intentos de reset de contraseña

### Seguridad
- ✅ Validación de entrada de datos
- ✅ Prevención de SQL injection con queries parametrizadas
- ✅ Hash de contraseñas con salt
- ✅ Protección de rutas por autenticación
- ✅ Variables de entorno para credenciales

### Administración
- ✅ Usuario administrador por defecto
- ✅ Logs detallados de operaciones
- ✅ Conexión resiliente con manejo de errores
- ✅ Pool de conexiones optimizado

## 📊 Ventajas de PostgreSQL

### vs. Almacenamiento en Memoria
- **Persistencia**: Los datos sobreviven reinicios del servidor
- **Escalabilidad**: Maneja miles de usuarios sin problemas
- **Integridad**: ACID compliance y transacciones
- **Seguridad**: Autenticación y autorización robusta
- **Respaldos**: Backup y recovery automatizados

### Características Avanzadas
- **Índices**: Búsquedas ultrarrápidas
- **Constraints**: Validación a nivel de BD
- **Triggers**: Lógica automática
- **Full-text search**: Búsquedas de texto avanzadas
- **JSON support**: Datos semi-estructurados

## 🔄 Proceso de Migración

### Cambios Realizados
1. **Dependencias**: Agregado `pg`, `pg-hstore`, `dotenv`
2. **Configuración**: Pool de conexiones PostgreSQL
3. **Modelo**: Clase User con métodos ORM-like
4. **Server.js**: Reemplazadas funciones de memoria por PostgreSQL
5. **Inicialización**: Auto-creación de tablas y usuario admin

### Funciones Eliminadas
```javascript
// Antes (memoria)
findUserByEmail(email)
createUser(userData)
calculateProfileCompleteness(user)
getFullName(user)
verifySecretAnswer(user, answer)

// Ahora (PostgreSQL)
User.findByEmail(email)
User.create(userData)
user.getFullName()
user.validatePassword(password)
user.updateLastLogin()
```

## 🎯 Comandos Útiles

### Desarrollo
```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start

# Modo desarrollo
npm run dev

# Resetear base de datos (solo desarrollo)
node -e "require('./config/init-db').resetDatabase()"
```

### PostgreSQL
```bash
# Conectar a la base de datos
psql -U postgres -d ecomonitor_db

# Ver tablas
\dt

# Ver usuarios
SELECT email, nombres, apellido_paterno, role, created_at FROM users;

# Backup
pg_dump -U postgres ecomonitor_db > backup.sql

# Restore
psql -U postgres ecomonitor_db < backup.sql
```

## 🔐 Credenciales por Defecto

### Usuario Administrador
- **Email**: admin@sistema.com
- **Contraseña**: admin123
- **Rol**: admin

### Base de Datos
- **Host**: localhost
- **Puerto**: 5432
- **Base de datos**: ecomonitor_db
- **Usuario**: postgres
- **Contraseña**: admin (configurable)

## ⚠️ Notas Importantes

1. **Cambiar contraseñas por defecto** en producción
2. **Configurar backup automático** para datos críticos
3. **Usar conexión SSL** en producción
4. **Monitorear rendimiento** con herramientas PG
5. **Aplicar actualizaciones de seguridad** regularmente

## 🚀 Próximos Pasos

1. **Testing**: Implementar tests unitarios y de integración
2. **Monitoring**: Agregar métricas y alertas
3. **Caching**: Implementar Redis para sesiones
4. **Clustering**: Preparar para múltiples instancias
5. **Analytics**: Agregar métricas de uso y comportamiento

---

**✅ Migración completada exitosamente a PostgreSQL**
