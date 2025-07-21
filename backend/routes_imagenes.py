from flask import Blueprint, request, jsonify
from cloudinary_config import upload_image_to_cloudinary
from models import conn, cursor
from vision_utils import calcular_porcentaje_agua, detectar_contaminacion
import os

imagenes_bp = Blueprint('imagenes', __name__)

@imagenes_bp.route('/api/imagenes', methods=['POST'])
def subir_imagen():
    pin_id = request.form.get('pin_id')
    imagen = request.files.get('imagen')
    if not pin_id or not imagen:
        return jsonify({'error': 'Faltan datos'}), 400
    # Guardar temporalmente
    temp_path = os.path.join('temp', imagen.filename)
    os.makedirs('temp', exist_ok=True)
    imagen.save(temp_path)
    # Subir a Cloudinary
    url = upload_image_to_cloudinary(temp_path)
    os.remove(temp_path)
    # Procesar visión artificial
    porcentaje_agua = calcular_porcentaje_agua(url)
    contaminacion = detectar_contaminacion(url)
    # Guardar en BD
    cursor.execute('''INSERT INTO imagenes (url, pin_id, porcentaje_agua, contaminacion_detectada) VALUES (%s, %s, %s, %s) RETURNING id''', (url, pin_id, porcentaje_agua, contaminacion))
    conn.commit()
    imagen_id = cursor.fetchone()[0]
    return jsonify({'id': imagen_id, 'url': url, 'porcentaje_agua': porcentaje_agua, 'contaminacion': contaminacion})

@imagenes_bp.route('/api/imagenes/<int:pin_id>', methods=['GET'])
def obtener_imagenes_pin(pin_id):
    cursor.execute('SELECT * FROM imagenes WHERE pin_id = %s ORDER BY fecha_subida DESC', (pin_id,))
    imagenes = cursor.fetchall()
    return jsonify([
        {
            'id': img[0],
            'url': img[1],
            'pin_id': img[2],
            'fecha_subida': img[3],
            'porcentaje_agua': img[4],
            'contaminacion': img[5]
        } for img in imagenes
    ])
