# Sistema de Visualización de Ecosistemas Acuáticos

## Descripción
Sistema web para la visualización y ubicación geográfica de ecosistemas acuáticos del estado de Hidalgo con autenticación de usuarios y almacenamiento en PostgreSQL.

## Características
- 🗺️ Mapa interactivo con ubicaciones de ecosistemas acuáticos
- 📍 Pines informativos que muestran detalles de cada ubicación
- 🔐 Sistema de autenticación con registro y login
- 💾 Base de datos PostgreSQL para usuarios
- 📱 Diseño responsive para dispositivos móviles
- 🎨 Interfaz moderna y fácil de usar

## Estructura del Proyecto
```
Sistema_de_Monitoreo_web_de_ecosistemas_Acuaticos_mediante_Vision_Artificial/
├── backend/
│   ├── app.py              # Servidor Flask principal
│   ├── requirements.txt    # Dependencias Python
│   ├── static/            # Archivos estáticos (imágenes, mapas)
│   └── data/              # Datos de pines del mapa
├── frontend/
│   ├── server.js          # Servidor Express
│   ├── package.json       # Dependencias Node.js
│   ├── config/            # Configuración de PostgreSQL
│   ├── models/            # Modelos de datos
│   ├── views/             # Plantillas EJS
│   └── public/            # Archivos estáticos (JS, CSS)
└── README.md
```

## Requisitos Previos
- Node.js (v16 o superior)
- Python 3.8+
- PostgreSQL 12+

## Instalación

### 1. Configurar PostgreSQL
```bash
# Crear base de datos
createdb ecomonitor_db

# O usando psql
psql -U postgres
CREATE DATABASE ecomonitor_db;
```

### 2. Backend (Python Flask)
```bash
cd backend
pip install -r requirements.txt
python app.py
```
El backend se ejecutará en: `http://localhost:5000`

### 3. Frontend (Node.js/Express)
```bash
cd frontend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

npm start
```
El frontend se ejecutará en: `http://localhost:3001`

## Configuración de Variables de Entorno
Crear archivo `.env` en la carpeta `frontend/`:
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecomonitor_db
DB_USER=postgres
DB_PASSWORD=tu_password
BACKEND_URL=http://localhost:5000
ADMIN_USER=admin
ADMIN_PASS=admin123
SESSION_SECRET=mi_secreto_super_seguro_para_sesiones_2024
```

## Características
- ✅ Sistema completo de autenticación (registro, login, recuperación)
- ✅ Almacenamiento persistente en PostgreSQL
- ✅ Visualización de mapa interactivo del ecosistema
- ✅ Sistema de sesiones y autorización
- ✅ Diseño responsivo con políticas de privacidad
- ✅ API REST para comunicación frontend-backend
- ✅ Recuperación de contraseña mediante preguntas secretas

## Credenciales por Defecto
- **Email**: admin@sistema.com
- **Contraseña**: admin123

## Tecnologías
- **Backend**: Python, Flask, Flask-CORS
- **Frontend**: Node.js, Express, EJS, JavaScript ES6
- **Base de Datos**: PostgreSQL
- **Autenticación**: bcryptjs, express-session
- **Futuro**: OpenCV para visión artificial
