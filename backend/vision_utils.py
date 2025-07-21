import cv2
import numpy as np
import requests

def calcular_porcentaje_agua(url_imagen):
    resp = requests.get(url_imagen)
    img_array = np.asarray(bytearray(resp.content), dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_blue = np.array([90, 50, 50])
    upper_blue = np.array([130, 255, 255])
    mask = cv2.inRange(hsv, lower_blue, upper_blue)
    porcentaje_agua = np.sum(mask > 0) / mask.size * 100
    return porcentaje_agua

def detectar_contaminacion(url_imagen):
    # Ejemplo simple: si la imagen tiene mucho color marrón/negro, marcar como contaminada
    resp = requests.get(url_imagen)
    img_array = np.asarray(bytearray(resp.content), dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_brown = np.array([10, 100, 20])
    upper_brown = np.array([20, 255, 200])
    mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)
    brown_ratio = np.sum(mask_brown > 0) / mask_brown.size * 100
    if brown_ratio > 10:
        return 'Posible contaminación detectada'
    return 'Sin contaminación aparente'
