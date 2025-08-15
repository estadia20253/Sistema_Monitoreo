from flask import Blueprint, request, jsonify
from cloudinary_config import upload_image_to_cloudinary
from models import conn
from vision_utils import calcular_porcentaje_agua, detectar_contaminacion
import os

imagenes_bp = Blueprint('imagenes', __name__)

@imagenes_bp.route('/api/imagenes', methods=['POST'])
def subir_imagen():
    cursor = conn.cursor()
    
    try:
        pin_id = request.form.get('pin_id')
        imagen = request.files.get('imagen')
        
        if not pin_id or not imagen:
            return jsonify({'error': 'Faltan datos: pin_id o imagen'}), 400
        
        try:
            pin_id = int(pin_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'ID de pin inválido'}), 400
            return jsonify({'error': 'pin_id debe ser un número válido'}), 400
        
        # Guardar temporalmente
        temp_path = os.path.join('temp', imagen.filename)
        os.makedirs('temp', exist_ok=True)
        imagen.save(temp_path)
        print(f"💾 Archivo guardado temporalmente en: {temp_path}")
        
        # Subir a Cloudinary
        print("☁️ Subiendo imagen a Cloudinary...")
        url = upload_image_to_cloudinary(temp_path)
        print(f"✅ Imagen subida a Cloudinary: {url}")
        
        # Eliminar archivo temporal
        os.remove(temp_path)
        
        # Verificar que el pin existe antes de insertar
        cursor.execute('SELECT id FROM pines WHERE id = %s', (pin_id,))
        pin_exists = cursor.fetchone()
        
        if not pin_exists:
            print(f"❌ Error: El pin_id {pin_id} no existe en la tabla pines")
            return jsonify({'error': f'Pin con ID {pin_id} no encontrado'}), 400
        
        # Paso 1: Guardar URL en BD inmediatamente (sin análisis)
        print("💾 Guardando URL en base de datos...")
        try:
            cursor.execute('''INSERT INTO imagenes (url, pin_id) VALUES (%s, %s) RETURNING id''', (url, pin_id))
            conn.commit()
            imagen_id = cursor.fetchone()[0]
            print(f"✅ Imagen guardada con ID: {imagen_id}")
        except Exception as db_error:
            print(f"❌ Error en base de datos: {str(db_error)}")
            conn.rollback()
            raise db_error
        
        # Paso 2: Buscar la imagen en BD y procesarla con OpenCV
        print("🔍 Buscando imagen en BD para análisis...")
        cursor.execute('SELECT url FROM imagenes WHERE id = %s', (imagen_id,))
        imagen_bd = cursor.fetchone()
        
        if imagen_bd:
            url_desde_bd = imagen_bd[0]
            print(f"📁 URL encontrada en BD: {url_desde_bd[:50]}...")
            
            # Procesar visión artificial usando URL de BD
            print("🔍 Procesando imagen con visión artificial...")
            porcentaje_agua = calcular_porcentaje_agua(url_desde_bd)
            contaminacion = detectar_contaminacion(url_desde_bd)
            
            # Asegurar que los valores sean tipos nativos de Python para PostgreSQL
            porcentaje_agua = float(porcentaje_agua) if porcentaje_agua is not None else 0.0
            contaminacion = str(contaminacion) if contaminacion is not None else 'Error en análisis'
            
            print(f"🌊 Porcentaje de agua: {porcentaje_agua}%")
            print(f"🔬 Contaminación detectada: {contaminacion}")
            
            # Paso 3: Actualizar los campos de análisis en BD
            print("📊 Actualizando campos de análisis en BD...")
            try:
                cursor.execute('''UPDATE imagenes SET porcentaje_agua = %s, contaminacion_detectada = %s WHERE id = %s''', 
                             (porcentaje_agua, contaminacion, imagen_id))
                conn.commit()
                print(f"✅ Análisis actualizado en BD para imagen ID: {imagen_id}")
            except Exception as db_error:
                print(f"❌ Error actualizando análisis: {str(db_error)}")
                conn.rollback()
                raise db_error
        else:
            print("❌ Error: No se pudo encontrar la imagen en BD")
            porcentaje_agua = 0.0
            contaminacion = 'Error: imagen no encontrada'
        
        return jsonify({
            'id': imagen_id, 
            'url': url, 
            'porcentaje_agua': porcentaje_agua, 
            'contaminacion': contaminacion
        })
        
    except Exception as e:
        print(f"❌ Error procesando imagen: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Hacer rollback si hay una transacción pendiente
        try:
            conn.rollback()
            print("🔄 Rollback realizado")
        except:
            pass
            
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500
    
    finally:
        # Cerrar el cursor
        try:
            cursor.close()
        except:
            pass

@imagenes_bp.route('/api/imagenes/<int:pin_id>', methods=['GET'])
def obtener_imagenes_pin(pin_id):
    # Crear un nuevo cursor para esta operación
    cursor = conn.cursor()
    
    try:
        # Verificar si hay una transacción abortada y hacer rollback
        try:
            conn.rollback()
            print("🔄 Rollback realizado para limpiar transacción")
        except:
            pass
            
        print(f"🔍 Buscando imágenes para pin_id: {pin_id}")
        cursor.execute('SELECT * FROM imagenes WHERE pin_id = %s ORDER BY fecha_subida DESC', (pin_id,))
        imagenes = cursor.fetchall()
        print(f"📊 Encontradas {len(imagenes)} imágenes para pin_id {pin_id}")
        
        if imagenes:
            print(f"🖼️ Primera imagen: {imagenes[0]}")
        
        resultado = [
            {
                'id': img[0],
                'url': img[1],
                'pin_id': img[2],
                'fecha_subida': img[3],
                'porcentaje_agua': img[4],
                'contaminacion_detectada': img[5]
            } for img in imagenes
        ]
        
        print(f"✅ Devolviendo {len(resultado)} imágenes")
        return jsonify(resultado)
        
    except Exception as e:
        print(f"❌ Error obteniendo imágenes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error al obtener imágenes: {str(e)}'}), 500
    finally:
        cursor.close()

@imagenes_bp.route('/api/imagenes/<int:imagen_id>', methods=['DELETE'])
def eliminar_imagen(imagen_id):
    # Crear un nuevo cursor para esta operación
    cursor = conn.cursor()
    
    try:
        print(f"🗑️ Eliminando imagen ID: {imagen_id}")
        
        # Verificar si hay una transacción abortada y hacer rollback
        try:
            conn.rollback()
            print("🔄 Rollback realizado para limpiar transacción")
        except:
            pass
        
        # Verificar que la imagen existe antes de eliminarla
        cursor.execute('SELECT id, url, pin_id FROM imagenes WHERE id = %s', (imagen_id,))
        imagen_data = cursor.fetchone()
        
        if not imagen_data:
            print(f"❌ Imagen con ID {imagen_id} no encontrada")
            return jsonify({'error': f'Imagen con ID {imagen_id} no encontrada'}), 404
        
        imagen_id_db, imagen_url, pin_id = imagen_data
        print(f"✅ Imagen encontrada: ID={imagen_id_db}, URL={imagen_url}, Pin ID={pin_id}")
        
        # Eliminar de la base de datos
        cursor.execute('DELETE FROM imagenes WHERE id = %s', (imagen_id,))
        rows_affected = cursor.rowcount
        
        if rows_affected == 0:
            print(f"❌ No se pudo eliminar la imagen con ID {imagen_id}")
            return jsonify({'error': 'No se pudo eliminar la imagen'}), 500
        
        # Confirmar la transacción
        conn.commit()
        print(f"✅ Imagen eliminada de la base de datos - filas afectadas: {rows_affected}")
        
        # TODO: Opcional - eliminar también de Cloudinary
        # Esto requeriría parsear la URL de Cloudinary y usar su API de eliminación
        # Por ahora solo eliminamos de la base de datos
        
        return jsonify({
            'mensaje': 'Imagen eliminada correctamente',
            'imagen_id': imagen_id,
            'pin_id': pin_id
        }), 200
        
    except Exception as e:
        print(f"❌ Error eliminando imagen: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Hacer rollback en caso de error
        try:
            conn.rollback()
            print("🔄 Rollback realizado por error")
        except:
            pass
            
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500
    
    finally:
        cursor.close()
