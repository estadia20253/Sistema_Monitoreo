from flask import Flask, render_template, send_file, jsonify, request
from flask_cors import CORS
import os
import json
from routes_imagenes import imagenes_bp
import psycopg2
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)  # Permitir solicitudes desde el frontend

# Cargar variables de entorno desde el archivo .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'frontend', '.env'))

# Inicializar modelos y base de datos
try:
    from models import conn
    print("✅ Conexión a PostgreSQL establecida correctamente")
    
    # Migrar datos del archivo JSON a PostgreSQL si la tabla está vacía
    def migrar_datos_json_a_postgresql():
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM pines")
            count = cursor.fetchone()[0]
            
            if count == 0 and os.path.exists(PINES_FILE):
                print("📦 Migrando datos del archivo JSON a PostgreSQL...")
                with open(PINES_FILE, 'r') as f:
                    pines_json = json.load(f)
                
                for pin in pines_json:
                    cursor.execute('''
                        INSERT INTO pines (nombre, tipo, descripcion, latitud, longitud, x, y, activo)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (
                        pin.get('nombre', ''),
                        pin.get('tipo', 'rio'),
                        pin.get('descripcion', ''),
                        pin.get('latitud'),
                        pin.get('longitud'),
                        pin.get('x'),
                        pin.get('y'),
                        pin.get('activo', True)
                    ))
                
                conn.commit()
                print(f"✅ {len(pines_json)} pines migrados exitosamente a PostgreSQL")
            else:
                print(f"📊 PostgreSQL ya contiene {count} pines")
                
        except Exception as e:
            print(f"⚠️ Error en migración: {e}")
    
    migrar_datos_json_a_postgresql()
    
except Exception as e:
    print(f"⚠️ Error conectando a PostgreSQL: {e}")
    print("El sistema usará archivos JSON como fallback")

# Archivo para almacenar los pines
PINES_FILE = os.path.join(os.path.dirname(__file__), 'data', 'pines.json')

# Crear carpeta data si no existe
os.makedirs(os.path.dirname(PINES_FILE), exist_ok=True)

# Inicializar archivo de pines si no existe
if not os.path.exists(PINES_FILE):
    # Crear pines con las coordenadas especificadas
    pines_hidalgo = [
        {"id": 1, "x": 47.67, "y": 22.26, "tipo": "rio", "nombre": "Rio Moctezuma", "descripcion": "Río principal del estado de Hidalgo"},
        {"id": 2, "x": 44.68, "y": 16.38, "tipo": "rio", "nombre": "Rio Tancuilin", "descripcion": "Río ubicado en la región norte"},
        {"id": 3, "x": 66.45, "y": 14.78, "tipo": "rio", "nombre": "Rio San Pedro", "descripcion": "Río de la región noreste"},
        {"id": 4, "x": 68.77, "y": 20.83, "tipo": "rio", "nombre": "Rio Candelaria", "descripcion": "Río de la región este"},
        {"id": 5, "x": 77.74, "y": 26.89, "tipo": "rio", "nombre": "Rio Atlapexco", "descripcion": "Río de la región este"},
        {"id": 6, "x": 83.89, "y": 25.11, "tipo": "rio", "nombre": "Rio Calabozo", "descripcion": "Río de la región este"},
        {"id": 7, "x": 78.57, "y": 35.97, "tipo": "rio", "nombre": "Rio Garces", "descripcion": "Río de la región este"},
        {"id": 8, "x": 69.77, "y": 39.53, "tipo": "rio", "nombre": "Rio Malila", "descripcion": "Río de la región central-este"},
        {"id": 9, "x": 68.27, "y": 30.98, "tipo": "rio", "nombre": "Rio Huazalingo", "descripcion": "Río de la región este"},
        {"id": 10, "x": 55.15, "y": 30.63, "tipo": "rio", "nombre": "Rio Claro", "descripcion": "Río de la región central"},
        {"id": 11, "x": 44.85, "y": 34.01, "tipo": "rio", "nombre": "Rio Amalac", "descripcion": "Río de la región central"},
        {"id": 12, "x": 12.62, "y": 54.67, "tipo": "rio", "nombre": "Rio San Juan", "descripcion": "Río de la región oeste"},
        {"id": 13, "x": 13.79, "y": 62.32, "tipo": "rio", "nombre": "Rio San Francisco", "descripcion": "Río de la región oeste"},
        {"id": 14, "x": 36.54, "y": 59.48, "tipo": "rio", "nombre": "Rio Tula", "descripcion": "Río principal de la región central"},
        {"id": 15, "x": 76.91, "y": 69.45, "tipo": "rio", "nombre": "Rio Grande", "descripcion": "Río de la región sureste"},
        {"id": 16, "x": 59.47, "y": 55.02, "tipo": "rio", "nombre": "Rio Venados", "descripcion": "Río de la región central"},
        {"id": 17, "x": 55.15, "y": 62.32, "tipo": "rio", "nombre": "Rio Amajac", "descripcion": "Río de la región central"},
        {"id": 18, "x": 85.55, "y": 55.02, "tipo": "rio", "nombre": "Rio Beltran", "descripcion": "Río de la región este"},
        {"id": 19, "x": 87.87, "y": 56.45, "tipo": "rio", "nombre": "Rio Pantepec", "descripcion": "Río de la región este"},
        {"id": 20, "x": 89.87, "y": 58.94, "tipo": "rio", "nombre": "Rio Blanco", "descripcion": "Río de la región este"},
        {"id": 21, "x": 62.46, "y": 36.15, "tipo": "lago", "nombre": "Lago Azteca", "descripcion": "Lago importante de la región central"},
        {"id": 22, "x": 77.24, "y": 87.97, "tipo": "lago", "nombre": "Lago Tecocomulco", "descripcion": "Lago ubicado en la región sur"},
        {"id": 23, "x": 59.30, "y": 44.52, "tipo": "lago", "nombre": "Lago Metztitlan", "descripcion": "Lago de la región central"},
        {"id": 24, "x": 91.53, "y": 66.95, "tipo": "presa", "nombre": "Presa Omiltémetl", "descripcion": "Presa ubicada en la región este"},
        {"id": 25, "x": 87.21, "y": 73.19, "tipo": "presa", "nombre": "Presa El Tejocotal", "descripcion": "Presa de la región sureste"},
        {"id": 26, "x": 36.38, "y": 87.79, "tipo": "presa", "nombre": "Presa Requena", "descripcion": "Presa de la región sur"},
        {"id": 27, "x": 30.23, "y": 76.21, "tipo": "presa", "nombre": "Presa Endhó", "descripcion": "Presa de la región suroeste"},
        {"id": 28, "x": 23.26, "y": 49.86, "tipo": "presa", "nombre": "Presa Fernando Hiriart", "descripcion": "Presa de la región oeste"}
    ]
    
    with open(PINES_FILE, 'w') as f:
        json.dump(pines_hidalgo, f, indent=2)

# Crear tabla de imágenes si no existe
try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        dbname=os.getenv('DB_NAME', 'ecomonitor_db'),  # Corregido: usar el nombre del .env
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')  # Corregido: usar DB_PASSWORD del .env
    )
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS imagenes (
            id SERIAL PRIMARY KEY,
            pin_id INTEGER REFERENCES pines(id),
            url TEXT NOT NULL,
            fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            descripcion TEXT
        );
    ''')
    conn.commit()
except Exception as e:
    print(f"Error creando tabla imagenes: {e}")

# Ruta principal del backend
@app.route('/')
def home():
    return jsonify({
        "mensaje": "Sistema de Monitoreo Web de Ecosistemas Acuáticos",
        "version": "1.0.0",
        "estado": "activo"
    })

# Endpoint para servir el mapa
@app.route('/api/mapa')
def obtener_mapa():
    try:
        # Servir la imagen PNG del mapa
        ruta_imagen = os.path.join(os.path.dirname(__file__), 'static', 'Mapa.webp')
        print(f"Buscando imagen en: {ruta_imagen}")
        
        if os.path.exists(ruta_imagen):
            print("Enviando imagen...")
            return send_file(ruta_imagen, mimetype='image/webp')
        else:
            print("Imagen no encontrada")
            return jsonify({"error": "Imagen del mapa no encontrada"}), 404
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Endpoint para obtener todos los pines
@app.route('/api/pines', methods=['GET'])
def obtener_pines():
    try:
        print("Obteniendo pines desde PostgreSQL...")
        
        # Importar conexión a la base de datos
        from models import conn
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, nombre, tipo, descripcion, latitud, longitud, x, y, activo FROM pines WHERE activo = TRUE")
        resultados = cursor.fetchall()
        
        pines = []
        for row in resultados:
            pin = {
                'id': row[0],
                'nombre': row[1],
                'tipo': row[2],
                'descripcion': row[3],
                'latitud': row[4],
                'longitud': row[5],
                'x': row[6],
                'y': row[7],
                'activo': row[8]
            }
            pines.append(pin)
        
        print(f"Pines encontrados en PostgreSQL: {len(pines)}")
        return jsonify(pines)
        
    except Exception as e:
        print(f"Error al obtener pines desde PostgreSQL: {str(e)}")
        # Fallback a archivo JSON si la base de datos falla
        try:
            print("Intentando fallback a archivo JSON...")
            with open(PINES_FILE, 'r') as f:
                pines = json.load(f)
            print(f"Pines encontrados en JSON: {len(pines)}")
            return jsonify(pines)
        except Exception as e2:
            print(f"Error también en archivo JSON: {str(e2)}")
            return jsonify({"error": f"Error en base de datos: {str(e)}. Error en JSON: {str(e2)}"}), 500


# Ruta para agregar un nuevo pin o actualizar todos los pines
@app.route('/api/pines', methods=['POST'])
def manejar_pines():
    try:
        datos = request.json or {}
        print(f"Datos recibidos para crear pin: {datos}")
        
        # Importar conexión a la base de datos
        from models import conn
        cursor = conn.cursor()
        
        # Si recibimos una lista, actualizamos todos los pines
        if isinstance(datos, list):
            print(f"Insertando {len(datos)} pines en PostgreSQL...")
            for pin_data in datos:
                cursor.execute('''
                    INSERT INTO pines (nombre, tipo, descripcion, latitud, longitud, x, y, activo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    pin_data.get('nombre', ''),
                    pin_data.get('tipo', 'rio'),
                    pin_data.get('descripcion', ''),
                    pin_data.get('latitud'),
                    pin_data.get('longitud'),
                    pin_data.get('x'),
                    pin_data.get('y'),
                    pin_data.get('activo', True)
                ))
            conn.commit()
            return jsonify({"mensaje": f"Se insertaron {len(datos)} pines exitosamente"}), 200
        
        # Si recibimos un objeto, agregamos un nuevo pin
        else:
            cursor.execute('''
                INSERT INTO pines (nombre, tipo, descripcion, latitud, longitud, x, y, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (
                datos.get('nombre', 'Nuevo Pin'),
                datos.get('tipo', 'rio'),
                datos.get('descripcion', ''),
                datos.get('latitud'),
                datos.get('longitud'),
                datos.get('x'),
                datos.get('y'),
                datos.get('activo', True)
            ))
            nuevo_id = cursor.fetchone()[0]
            conn.commit()
            
            datos['id'] = nuevo_id
            print(f"Pin creado exitosamente con ID: {nuevo_id}")
            return jsonify(datos), 201
            
    except Exception as e:
        print(f"Error al crear pin en PostgreSQL: {str(e)}")
        # Fallback a archivo JSON
        try:
            print("Intentando fallback a archivo JSON...")
            if isinstance(datos, list):
                with open(PINES_FILE, 'w') as f:
                    json.dump(datos, f, indent=2, ensure_ascii=False)
                return jsonify({"mensaje": f"Se actualizaron {len(datos)} pines exitosamente (JSON)"}), 200
            else:
                with open(PINES_FILE, 'r') as f:
                    pines = json.load(f)
                nuevo_id = max([p.get('id', 0) for p in pines], default=0) + 1
                datos['id'] = nuevo_id
                pines.append(datos)
                with open(PINES_FILE, 'w') as f:
                    json.dump(pines, f, indent=2, ensure_ascii=False)
                return jsonify(datos), 201
        except Exception as e2:
            print(f"Error también en archivo JSON: {str(e2)}")
            return jsonify({"error": f"Error en base de datos: {str(e)}. Error en JSON: {str(e2)}"}), 500


# Ruta para actualizar un pin por id
@app.route('/api/pines/<int:pin_id>', methods=['PUT'])
def actualizar_pin(pin_id):
    try:
        datos = request.json or {}
        
        with open(PINES_FILE, 'r') as f:
            pines = json.load(f)
        
        # Buscar el pin a actualizar
        pin_encontrado = None
        for i, pin in enumerate(pines):
            if pin.get('id') == pin_id:
                pin_encontrado = i
                break
        
        if pin_encontrado is None:
            return jsonify({"error": "Pin no encontrado"}), 404
        
        # Actualizar los campos proporcionados
        for campo, valor in datos.items():
            if campo != 'id':  # No permitir cambiar el ID
                pines[pin_encontrado][campo] = valor
        
        # Guardar los cambios
        with open(PINES_FILE, 'w') as f:
            json.dump(pines, f, indent=2, ensure_ascii=False)
        
        return jsonify(pines[pin_encontrado]), 200
        
    except Exception as e:
        print(f"Error al actualizar pin: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Ruta para eliminar un pin por id
@app.route('/api/pines/<int:pin_id>', methods=['DELETE'])
def eliminar_pin(pin_id):
    try:
        with open(PINES_FILE, 'r') as f:
            pines = json.load(f)
        nuevos_pines = [p for p in pines if p.get('id') != pin_id]
        if len(nuevos_pines) == len(pines):
            return jsonify({"error": "Pin no encontrado"}), 404
        with open(PINES_FILE, 'w') as f:
            json.dump(nuevos_pines, f, indent=2)
        return jsonify({"mensaje": "Pin eliminado"})
    except Exception as e:
        print(f"Error al eliminar pin: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Ruta con datos de ejemplo del ecosistema
@app.route('/api/datos-ecosistema')
def datos_ecosistema():
    datos = {
        "temperatura": 24.5,
        "ph": 7.2,
        "oxigeno": 8.1,
        "turbidez": 5.3
    }
    return jsonify(datos)

app.register_blueprint(imagenes_bp)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
