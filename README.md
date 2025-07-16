# Sistema de Monitoreo de Ecosistemas Acuáticos - Hidalgo

Sistema web interactivo para la visualización, gestión y monitoreo de ecosistemas acuáticos del estado de Hidalgo, México.

## 🌊 Características Principales

- **🗺️ Mapa Interactivo**: Visualización de ríos, lagos y presas sobre mapa geográfico
- **📍 Gestión de Pines**: Agregar, eliminar y reposicionar puntos de ecosistemas
- **🔍 Filtros Dinámicos**: Mostrar/ocultar ecosistemas por tipo
- **👤 Sistema de Usuarios**: Autenticación completa con PostgreSQL
- **📱 Responsive**: Funciona en móviles y escritorio
- **🎨 Interfaz Moderna**: Tooltips, animaciones y efectos visuales

## 🚀 Funcionalidades Implementadas

### Gestión de Pines
- ✅ **Agregar nuevos pines** sin coordenadas automáticas
- ✅ **Eliminar pines existentes** con confirmación doble
- ✅ **Editar posiciones** mediante clic en el mapa
- ✅ **Filtros por tipo** (ríos, lagos, presas)
- ✅ **Tooltips informativos** solo al hover

### Sistema de Usuarios
- ✅ Registro y login seguro
- ✅ Recuperación de contraseña con preguntas secretas
- ✅ Sesiones persistentes
- ✅ Validación completa de formularios

## 📁 Estructura del Proyecto

```
Sistema_de_Monitoreo_web/
├── backend/                    # API Python Flask
│   ├── app.py                 # Servidor principal
│   ├── requirements.txt       # Dependencias Python
│   ├── static/               # Mapa base de Hidalgo
│   └── data/                 # Datos de pines (excluido en .gitignore)
├── frontend/                  # Aplicación Node.js/Express
│   ├── server.js             # Servidor web
│   ├── package.json          # Dependencias Node.js
│   ├── config/               # Configuración BD
│   ├── models/               # Modelos de usuario
│   ├── views/                # Plantillas EJS
│   └── public/               # CSS, JavaScript, assets
└── README.md
```

## ⚙️ Requisitos del Sistema

- **Node.js** 16.0 o superior
- **Python** 3.8 o superior  
- **PostgreSQL** 12 o superior
- **npm** o **yarn**
- **pip** (Python package manager)

## 🛠️ Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/AlanGomez0605/Sistema_de_Monitoreo_web.git
cd Sistema_de_Monitoreo_web
```

### 2. Configurar Base de Datos PostgreSQL

```sql
-- Conectar a PostgreSQL como superusuario
psql -U postgres

-- Crear base de datos
CREATE DATABASE ecomonitor_db;

-- Crear usuario (opcional)
CREATE USER ecomonitor WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE ecomonitor_db TO ecomonitor;

-- Salir
\q
```

### 3. Configurar Backend (Python Flask)

```bash
# Navegar al directorio backend
cd backend

# Crear entorno virtual (recomendado)
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
python app.py
```

**El backend se ejecutará en:** `http://localhost:5000`

### 4. Configurar Frontend (Node.js/Express)

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Crear archivo de variables de entorno
cp .env.example .env
```

### 5. Configurar Variables de Entorno

Crear archivo `.env` en `frontend/` con el siguiente contenido:

```env
# Configuración del servidor
NODE_ENV=development
PORT=3000

# Configuración de PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecomonitor_db
DB_USER=postgres
DB_PASSWORD=tu_password_postgresql

# URL del backend
BACKEND_URL=http://localhost:5000

# Credenciales de administrador
ADMIN_USER=admin@sistema.com
ADMIN_PASS=admin123

# Secreto para sesiones (cambiar en producción)
SESSION_SECRET=mi_secreto_super_seguro_para_sesiones_2024
```

### 6. Crear Archivo de Datos (Requerido)

Como `backend/data/pines.json` está excluido del repositorio, crear manualmente:

```bash
# Crear directorio
mkdir backend/data

# Crear archivo con datos iniciales
echo '[
  {
    "id": 1,
    "nombre": "Río Moctezuma",
    "tipo": "rio", 
    "x": 45.5,
    "y": 30.2,
    "descripcion": "Río principal del estado de Hidalgo"
  },
  {
    "id": 2,
    "nombre": "Lago Metztitlán", 
    "tipo": "lago",
    "x": 55.8,
    "y": 25.4,
    "descripcion": "Importante cuerpo de agua en la región"
  }
]' > backend/data/pines.json
```

### 7. Ejecutar la Aplicación

```bash
# Terminal 1: Backend
cd backend
python app.py

# Terminal 2: Frontend
cd frontend
npm start
```

**Acceder a la aplicación:** `http://localhost:3000`

## 🔑 Credenciales por Defecto

- **Usuario**: `admin@sistema.com`
- **Contraseña**: `admin123`

## 🎮 Guía de Uso

### Agregar Nuevos Pines
1. Click en **"➕ Agregar Pin"**
2. Completar formulario (nombre, tipo, descripción)
3. El pin se crea SIN coordenadas
4. Usar **"Editar Posiciones"** para ubicarlo en el mapa

### Eliminar Pines
1. Click en **"🗑️ Eliminar Pin"**
2. Seleccionar pin de la lista
3. Confirmar eliminación (doble confirmación)

### Filtrar Ecosistemas
- Usar checkboxes para mostrar/ocultar tipos
- Filtros: Ríos, Lagos, Presas
- Botón "Resetear Filtros" para mostrar todos

### Reposicionar Pines
1. Click en **"Editar Posiciones"**
2. Seleccionar pin de la lista lateral
3. Click en nueva ubicación en el mapa
4. Guardar cambios

## 🛡️ Archivos No Incluidos (.gitignore)

Por seguridad y buenas prácticas, estos archivos NO se suben al repositorio:

- `frontend/.env` - Variables de entorno y credenciales
- `frontend/node_modules/` - Dependencias de Node.js
- `backend/__pycache__/` - Cache de Python
- `backend/venv/` - Entorno virtual de Python
- `backend/data/pines.json` - Datos dinámicos de pines

## 🔧 Tecnologías Utilizadas

### Backend
- **Python 3.8+**
- **Flask** - Framework web
- **Flask-CORS** - Manejo de CORS
- **JSON** - Almacenamiento de datos de pines

### Frontend  
- **Node.js 16+**
- **Express** - Servidor web
- **EJS** - Motor de plantillas
- **PostgreSQL** - Base de datos de usuarios
- **bcryptjs** - Encriptación de contraseñas
- **express-session** - Manejo de sesiones

### Cliente
- **JavaScript ES6+** - Lógica del mapa
- **CSS3** - Estilos y animaciones
- **HTML5** - Estructura responsiva

## 📝 Notas de Desarrollo

### Puertos por Defecto
- **Frontend**: Puerto 3000
- **Backend**: Puerto 5000
- **PostgreSQL**: Puerto 5432

### Base de Datos
- La base de datos `ecomonitor_db` se crea automáticamente al primera ejecución
- Las tablas de usuarios se generan automáticamente
- Los datos de pines se almacenan en archivo JSON

### Seguridad
- Contraseñas encriptadas con bcrypt
- Sesiones seguras con express-session
- Validación de entrada en formularios
- Protección CORS configurada

## 🐛 Resolución de Problemas

### Error de Conexión a PostgreSQL
```bash
# Verificar que PostgreSQL esté ejecutándose
sudo service postgresql status

# Verificar credenciales en .env
cat frontend/.env
```

### Error "Puerto ya en uso"
```bash
# Terminar procesos en puertos 3000 y 5000
npx kill-port 3000
npx kill-port 5000
```

### Pines no aparecen en el mapa
- Verificar que existe `backend/data/pines.json`
- Verificar que el backend esté ejecutándose
- Revisar consola del navegador para errores

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama para nueva funcionalidad
3. Commit de cambios
4. Push a la rama
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para detalles.

---

**Desarrollado para el monitoreo de ecosistemas acuáticos del estado de Hidalgo, México 🇲🇽**
