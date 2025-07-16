# Sistema de Monitoreo Web - Configuración de Roles

## 🎯 Vista Unificada Implementada

El sistema ahora utiliza **una sola vista de mapa** (`mapa.ejs`) que se adapta automáticamente según el rol del usuario:

### 🔧 Vista de Administrador
- **Panel lateral completo** con herramientas de gestión
- **Botón "Agregar Cuerpos de Agua"** - Agrega automáticamente 35 puntos con coordenadas exactas
- **Modo edición** para reposicionar pines
- **Estadísticas en tiempo real** por tipo de ecosistema
- **Filtros avanzados** con panel flotante
- **Funciones de eliminación** con confirmación

### 👥 Vista de Usuario
- **Interface simplificada** solo para consulta
- **Panel de filtros flotante** estilo overlay
- **Sin herramientas de edición** (solo lectura)
- **Información básica** con estadísticas simples
- **Detalles de pines** sin botones de administración

## 🔐 Sistema de Autenticación

### Usuario Administrador por Defecto
```
Email: admin@sistema.com
Contraseña: admin123
```

### Crear Administrador Manualmente
```bash
cd frontend
node create-admin.js
```

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno
```bash
# En frontend/.env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/ecomonitor
SESSION_SECRET=tu_secreto_super_seguro
GOOGLE_MAPS_API_KEY=tu_clave_de_google_maps
```

### 2. Inicializar Base de Datos
```bash
cd frontend
npm install
node -e "require('./config/init-db').initializeDatabase()"
```

### 3. Iniciar Servicios
```bash
# Terminal 1 - Backend (Flask)
cd backend
python app.py

# Terminal 2 - Frontend (Node.js)
cd frontend
npm start
```

### 4. Acceder al Sistema
- **URL**: http://localhost:3000
- **Login**: admin@sistema.com / admin123
- **Usuarios**: Se registran normalmente con rol 'user'

## 🗺️ Características del Mapa

### Cuerpos de Agua Incluidos (35 puntos)
- **20 Ríos**: Moctezuma, Tula, Amajac, San Juan, Salado, etc.
- **3 Lagos**: Metztitlán, Tecocomulco, Grutas de Tolantongo
- **7 Presas**: Requena, Endhó, Zimapán, La Esperanza, etc.
- **5 Manantiales**: Pathe, Vito, Dios Padre, Ajacuba, Amajac

### Filtros Disponibles
- 🌊 **Ríos** (azul)
- 🏞️ **Lagos** (verde)
- 🏗️ **Presas** (naranja)
- 💧 **Manantiales** (morado)

### Funciones de Administrador
- ✅ **Agregar pin manual** (clic en mapa)
- ✅ **Agregar todos los cuerpos de agua** (botón automático)
- ✅ **Editar posiciones** (arrastrar pines)
- ✅ **Eliminar pines** (con confirmación)
- ✅ **Ver estadísticas** en tiempo real

## 🛠️ Solución de Problemas

### Mapa no carga
1. Verificar API key de Google Maps en `.env`
2. Revisar consola del navegador para errores JS
3. Confirmar que el backend está corriendo en puerto 5000

### Error de base de datos
1. Verificar PostgreSQL esté corriendo
2. Confirmar credenciales en `DATABASE_URL`
3. Ejecutar `node create-admin.js` si no hay usuarios

### Filtros no funcionan
1. Abrir DevTools → Console
2. Verificar errores en `aplicarFiltros()`
3. Comprobar que los IDs de filtros coincidan

## 📱 Responsive Design

El sistema se adapta automáticamente a:
- **Desktop**: Panel lateral completo (admin) o filtros flotantes (user)
- **Tablet**: Paneles colapsables
- **Mobile**: Filtros apilados verticalmente

## 🔄 Flujo de Usuario

1. **Registro** → Rol 'user' automático
2. **Login** → Redirección a `/mapa`
3. **Vista adaptada** según rol (admin/user)
4. **Interacción** según permisos del rol

## ⚙️ Configuración Técnica

### Rutas Principales
- `/` - Página de inicio
- `/login` - Autenticación
- `/register` - Registro de usuarios
- `/mapa` - Vista unificada (adapta según rol)
- `/admin` - Redirige a `/mapa`

### Middlewares
- `requireAuth` - Verificar sesión activa
- `requireAdmin` - Verificar rol administrador
- Roles: 'admin' | 'user'

Este sistema proporciona una experiencia fluida con una sola vista que se adapta inteligentemente según los permisos del usuario.
