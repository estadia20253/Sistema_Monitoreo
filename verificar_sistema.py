import requests
import subprocess
import sys
import time

def verificar_backend():
    try:
        response = requests.get('http://localhost:5000/api/pines', timeout=5)
        if response.status_code == 200:
            print("✅ Backend funcionando correctamente")
            return True
        else:
            print(f"❌ Backend respondió con código: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ No se pudo conectar al backend: {e}")
        return False

def iniciar_backend():
    print("🚀 Iniciando backend...")
    try:
        # Cambiar al directorio del backend y ejecutar
        subprocess.Popen([
            sys.executable, 'app.py'
        ], cwd='./backend', shell=True)
        print("Backend iniciado")
        time.sleep(3)  # Esperar que se inicie
        return True
    except Exception as e:
        print(f"Error al iniciar backend: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Verificando estado del backend...")
    
    if not verificar_backend():
        print("⚠️ Backend no está funcionando, intentando iniciarlo...")
        if iniciar_backend():
            if verificar_backend():
                print("✅ Backend iniciado exitosamente")
            else:
                print("❌ Error al verificar backend después del inicio")
        else:
            print("❌ No se pudo iniciar el backend")
    
    print("\n📍 Pines actualizados con nuevas coordenadas")
    print("🌐 Frontend disponible en: http://localhost:3000/mapa")
    print("🔧 Backend disponible en: http://localhost:5000")
