# 🗺️ Sistema de Reposicionamiento de Pines - Guía de Uso

## ✅ Estado del Sistema
- **Frontend**: http://localhost:3000/mapa
- **Backend**: http://localhost:5000
- **Pines**: Reposicionados con coordenadas mejoradas

## 🎯 Cómo Usar el Editor de Pines

### 1. Activar Modo de Edición
- Ve a la página del mapa: http://localhost:3000/mapa
- Haz clic en el botón **"Editar Posiciones"** (azul, en la esquina superior derecha)
- Se abrirá el modo de edición con:
  - Panel de instrucciones (esquina superior derecha)
  - Lista de pines editables (parte derecha)
  - Cursor en forma de cruz sobre el mapa

### 2. Reposicionar un Pin
1. **Seleccionar**: En la lista de pines, haz clic en el pin que quieres mover
2. **Posicionar**: Haz clic en el mapa donde quieres que aparezca el pin
3. **Verificar**: El pin se moverá automáticamente a la nueva posición

### 3. Guardar Cambios
- Haz clic en **"Guardar Cambios"** en el panel de edición
- Confirma que quieres guardar
- Los cambios se aplicarán permanentemente

### 4. Salir del Modo de Edición
- Haz clic en **"Salir del Modo Edición"** o **"Cancelar"**
- El cursor vuelve a la normalidad
- Los panes funcionan normalmente (hover y clic para detalles)

## 🔧 Características Técnicas

### Coordenadas Actualizadas
- ✅ 20 ríos reposicionados
- ✅ 3 lagos reposicionados  
- ✅ 5 presas reposicionadas
- ✅ Coordenadas ajustadas para la nueva imagen `Mapa.webp`

### Sistema de Posicionamiento
- ✅ Cálculo automático considerando `object-fit: contain`
- ✅ Responsive design (funciona en desktop y móvil)
- ✅ Reposicionamiento automático al cambiar tamaño de ventana
- ✅ Tooltips que aparecen solo al hacer hover

## 📍 Pines Incluidos

### Ríos (🌊)
- Rio Moctezuma, Rio Tancuilin, Rio San Pedro, Rio Candelaria
- Rio Atlapexco, Rio Calabozo, Rio Garces, Rio Malila
- Rio Huazalingo, Rio Claro, Rio Amalac, Rio San Juan
- Rio San Francisco, Rio Tula, Rio Grande, Rio Venados
- Rio Amajac, Rio Beltran, Rio Pantepec, Rio Blanco

### Lagos (🏞️)
- Lago Azteca, Lago Tecocomulco, Lago Metztitlan

### Presas (🏗️)
- Presa Omiltémmetl, Presa El Tejocotal, Presa Requena
- Presa Endhó, Presa Fernando Hiriart

## 🚀 Próximos Pasos
1. Verifica visualmente que todos los pines estén bien posicionados
2. Usa el editor para ajustar cualquier pin que necesite corrección
3. Los cambios se guardan en `backend/data/pines.json`

¡El sistema está listo para usar! 🎉
