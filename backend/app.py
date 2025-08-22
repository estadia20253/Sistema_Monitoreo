from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from routes_imagenes import imagenes_bp
import psycopg2
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'frontend', '.env'))
try:
    from models import conn
    print("✅ Conexión a PostgreSQL establecida correctamente")
except Exception as e:
    print(f"⚠️ Error conectando a PostgreSQL: {e}")

@app.route('/')
def home():
    return jsonify({
        "mensaje": "Sistema de Monitoreo Web de Ecosistemas Acuáticos",
        "version": "1.0.0",
        "estado": "activo"
    })

@app.route('/api/pines', methods=['GET'])
def obtener_pines():
    try:
        from models import conn
        cursor = conn.cursor()
        cursor.execute("SELECT id, nombre, tipo, descripcion, latitud, longitud, activo FROM pines WHERE activo = TRUE")
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
                'activo': row[6]
            }
            pines.append(pin)
        return jsonify(pines)
    except Exception as e:
        return jsonify({"error": f"Error en base de datos: {str(e)}"}), 500

@app.route('/api/pines', methods=['POST'])
def manejar_pines():
    try:
        datos = request.json or {}
        from models import conn
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO pines (nombre, tipo, descripcion, latitud, longitud, activo)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            datos.get('nombre', 'Nuevo Pin'),
            datos.get('tipo', 'rio'),
            datos.get('descripcion', ''),
            datos.get('latitud'),
            datos.get('longitud'),
            datos.get('activo', True)
        ))
        nuevo_id = cursor.fetchone()[0]
        conn.commit()
        
        datos['id'] = nuevo_id
        return jsonify(datos), 201
            
    except Exception as e:
        return jsonify({"error": f"Error en base de datos: {str(e)}"}), 500

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