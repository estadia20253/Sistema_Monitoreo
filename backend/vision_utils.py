import cv2
import numpy as np
import requests

def calcular_porcentaje_agua(url_imagen):
    """
    Calcula el porcentaje de agua en una imagen usando análisis de color HSV
    """
    try:
        resp = requests.get(url_imagen)
        img_array = np.asarray(bytearray(resp.content), dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Rango más amplio para detectar agua (azules y turquesas)
        lower_blue = np.array([90, 50, 50])
        upper_blue = np.array([130, 255, 255])
        mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)
        
        # También detectar agua más oscura o con reflejos
        lower_dark_blue = np.array([100, 30, 30])
        upper_dark_blue = np.array([120, 150, 150])
        mask_dark_blue = cv2.inRange(hsv, lower_dark_blue, upper_dark_blue)
        
        # Combinar máscaras
        mask_final = cv2.bitwise_or(mask_blue, mask_dark_blue)
        
        # Calcular porcentaje
        porcentaje_agua = np.sum(mask_final > 0) / mask_final.size * 100
        
        # Asegurar que el porcentaje esté en un rango realista y convertir a float nativo de Python
        resultado = min(max(porcentaje_agua, 0.0), 100.0)
        return float(resultado)  # Convertir numpy.float64 a float nativo de Python
        
    except Exception as e:
        print(f"Error en cálculo de porcentaje de agua: {e}")
        return 0.0

def detectar_contaminacion(url_imagen):
    """
    Detecta posible contaminación en imágenes de cuerpos de agua
    usando análisis de color HSV
    """
    try:
        resp = requests.get(url_imagen)
        img_array = np.asarray(bytearray(resp.content), dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Detectar colores marrones/amarillentos (contaminación)
        lower_brown = np.array([10, 100, 20])
        upper_brown = np.array([25, 255, 200])
        mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)
        brown_ratio = float(np.sum(mask_brown > 0) / mask_brown.size * 100)  # Convertir a float nativo
        
        # Detectar colores verdosos (algas excesivas)
        lower_green = np.array([40, 50, 50])
        upper_green = np.array([80, 255, 255])
        mask_green = cv2.inRange(hsv, lower_green, upper_green)
        green_ratio = float(np.sum(mask_green > 0) / mask_green.size * 100)  # Convertir a float nativo
        
        # Clasificar nivel de contaminación
        if brown_ratio > 15:
            return 'Contaminación alta detectada'
        elif brown_ratio > 8:
            return 'Contaminación moderada'
        elif green_ratio > 20:
            return 'Posible proliferación de algas'
        elif brown_ratio > 3:
            return 'Leve turbidez detectada'
        else:
            return 'Agua aparentemente limpia'
            
    except Exception as e:
        print(f"Error en análisis de contaminación: {e}")
        return 'Error en análisis'
