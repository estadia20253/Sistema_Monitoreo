import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'frontend', '.env'))

# Configuración de conexión a PostgreSQL
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'ecomonitor_db')  # Corregido: usar el nombre del .env
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASSWORD', 'postgres')  # Corregido: usar DB_PASSWORD del .env

conn = psycopg2.connect(
    host=DB_HOST,
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASS
)
cursor = conn.cursor()

# Crear tabla de pines si no existe
cursor.execute('''
CREATE TABLE IF NOT EXISTS pines (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    latitud REAL,
    longitud REAL,
    x REAL,
    y REAL,
    usuario_id INTEGER,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

# Crear tabla de imágenes si no existe
cursor.execute('''
CREATE TABLE IF NOT EXISTS imagenes (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    pin_id INTEGER REFERENCES pines(id),
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    porcentaje_agua REAL,
    contaminacion_detectada TEXT
);
''')
conn.commit()
