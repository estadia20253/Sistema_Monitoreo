// Variables globales para Google Maps
let googleMap = null;
let infoWindow = null;
let markers = [];

// Configuración del mapa de Hidalgo
const HIDALGO_MAP_CONFIG = {
    bounds: {
        north: 21.4,   // Límite norte de Hidalgo
        south: 19.6,   // Límite sur de Hidalgo  
        east: -97.8,   // Límite este de Hidalgo
        west: -99.8    // Límite oeste de Hidalgo
    },
    center: { lat: 20.5, lng: -98.8 }  // Centro aproximado del estado
};

// Variables globales existentes
let pinesData = [];
let modoEdicion = false;
let pinEditando = null;

// Función de inicialización de Google Maps (llamada desde el callback de la API)
function initMap() {
    console.log('🚀 Inicializando Google Maps...');
    
    const mapElement = document.getElementById('google-map');
    if (!mapElement) {
        console.error('❌ Elemento google-map no encontrado');
        return;
    }
    
    console.log('🎯 Elemento del mapa encontrado:', mapElement);
    
    // Configuración del mapa
    const mapOptions = {
        zoom: 9,
        center: HIDALGO_MAP_CONFIG.center,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        restriction: {
            latLngBounds: {
                north: HIDALGO_MAP_CONFIG.bounds.north,
                south: HIDALGO_MAP_CONFIG.bounds.south,
                east: HIDALGO_MAP_CONFIG.bounds.east,
                west: HIDALGO_MAP_CONFIG.bounds.west
            },
            strictBounds: false
        },
        styles: [
            {
                featureType: "water",
                elementType: "all",
                stylers: [{ color: "#3498db" }]
            },
            {
                featureType: "landscape",
                elementType: "all",
                stylers: [{ color: "#f8f9fa" }]
            }
        ]
    };

    console.log('📋 Configuración del mapa:', mapOptions);

    // Crear el mapa
    googleMap = new google.maps.Map(mapElement, mapOptions);
    
    console.log('🗺️ Objeto Google Map creado:', googleMap);
    
    // Crear InfoWindow para mostrar información de los pines
    infoWindow = new google.maps.InfoWindow();
    
    // Ocultar loading y mostrar el mapa
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
        console.log('✅ Loading ocultado');
    }
    
    console.log('✅ Google Maps inicializado correctamente');
    
    // Cargar los pines después de inicializar el mapa
    cargarPines();
    
    // Agregar listener para el modo edición
    if (googleMap) {
        googleMap.addListener('click', function(e) {
            if (modoEdicion) {
                manejarClicGoogleMaps(e);
            }
        });
        console.log('🖱️ Event listeners agregados');
    }
}

function cargarMapa() {
    // Esta función ahora solo verifica si Google Maps está cargado
    if (typeof google === 'undefined') {
        console.log('Esperando a que Google Maps se cargue...');
        return;
    }
    
    if (!googleMap) {
        initMap();
    }
}

// Función para cargar pines desde el servidor
function cargarPines() {
    console.log('📡 Iniciando carga de pines desde el servidor...');
    
    fetch('/api/pines')
        .then(response => {
            console.log('📬 Respuesta del servidor recibida:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('🔍 Pines cargados desde servidor:', data);
            console.log('📊 Cantidad de pines recibidos:', data.length);
            
            // Procesar cada pin para determinar coordenadas
            pinesData = data.map(pin => {
                console.log(`🔍 Procesando pin: ${pin.nombre} (ID: ${pin.id})`);
                
                let coordenadas = { x: null, y: null, lat: null, lng: null };
                
                // Prioridad 1: Coordenadas geográficas desde la base de datos
                if (pin.latitud !== null && pin.latitud !== undefined && pin.longitud !== null && pin.longitud !== undefined) {
                    coordenadas.lat = parseFloat(pin.latitud);
                    coordenadas.lng = parseFloat(pin.longitud);
                    
                    // Convertir coordenadas geográficas a posición en el mapa (porcentajes)
                    const posicionMapa = coordenadasGeograficasAPorcentaje(coordenadas.lat, coordenadas.lng);
                    coordenadas.x = posicionMapa.x;
                    coordenadas.y = posicionMapa.y;
                    
                    console.log(`✅ Pin ${pin.id} (${pin.nombre}): coordenadas geográficas desde BD - lat:${coordenadas.lat}, lng:${coordenadas.lng} -> mapa x:${coordenadas.x}%, y:${coordenadas.y}%`);
                } else if (pin.x !== null && pin.x !== undefined && pin.y !== null && pin.y !== undefined) {
                    // Prioridad 2: Coordenadas de porcentaje desde la base de datos (formato actual)
                    coordenadas.x = parseFloat(pin.x);
                    coordenadas.y = parseFloat(pin.y);
                    
                    // Convertir coordenadas de porcentaje a geográficas
                    const coordsGeo = porcentajeACoordenasGeograficas(coordenadas.x, coordenadas.y);
                    coordenadas.lat = coordsGeo.lat;
                    coordenadas.lng = coordsGeo.lng;
                    
                    console.log(`🔄 Pin ${pin.id} (${pin.nombre}): coordenadas desde porcentajes BD - x:${coordenadas.x}%, y:${coordenadas.y}% -> lat:${coordenadas.lat}, lng:${coordenadas.lng}`);
                } else {
                    // Prioridad 3: Coordenadas desde localStorage como respaldo
                    const coordenadasGuardadas = localStorage.getItem(`pin_coords_${pin.id}`);
                    if (coordenadasGuardadas) {
                        try {
                            const coords = JSON.parse(coordenadasGuardadas);
                            coordenadas.x = coords.x;
                            coordenadas.y = coords.y;
                            
                            // Si tenemos coordenadas de porcentaje, convertir a geográficas
                            if (coordenadas.x !== null && coordenadas.y !== null) {
                                const coordsGeo = porcentajeACoordenasGeograficas(coordenadas.x, coordenadas.y);
                                coordenadas.lat = coordsGeo.lat;
                                coordenadas.lng = coordsGeo.lng;
                            }
                            
                            console.log(`� Pin ${pin.id} (${pin.nombre}): coordenadas desde localStorage - x:${coordenadas.x}%, y:${coordenadas.y}% -> lat:${coordenadas.lat}, lng:${coordenadas.lng}`);
                        } catch (error) {
                            console.error(`❌ Error parseando coordenadas localStorage para pin ${pin.id}:`, error);
                        }
                    } else {
                        console.log(`⚠️ Pin ${pin.id} (${pin.nombre}): sin coordenadas en BD ni localStorage`);
                    }
                }
                
                return {
                    ...pin,
                    x: coordenadas.x,
                    y: coordenadas.y,
                    lat: coordenadas.lat,
                    lng: coordenadas.lng,
                    latitud: coordenadas.lat,
                    longitud: coordenadas.lng
                };
            });
            
            console.log('🔍 Pines procesados con coordenadas geográficas:', pinesData);
            mostrarPines();
        })
        .catch(error => {
            console.error('Error al cargar pines:', error);
        });
}

// Función actualizada para mostrar pines con Google Maps
function mostrarPines() {
    console.log('🎯 Función mostrarPines llamada');
    
    if (!googleMap) {
        console.log('❌ Google Maps no está inicializado aún');
        return;
    }
    
    console.log('✅ Google Maps está disponible, procesando pines...');
    console.log('📊 Cantidad de pines a procesar:', pinesData.length);

    // Limpiar markers existentes
    markers.forEach(marker => {
        marker.setMap(null);
    });
    markers = [];
    console.log('🧹 Markers anteriores limpiados');

    if (pinesData.length > 0) {
        let pinesMostrados = 0;
        let pinesSinCoordenadas = 0;
        
        pinesData.forEach((pin, index) => {
            console.log(`🔍 Procesando pin ${index + 1}/${pinesData.length}: ${pin.nombre}`);
            console.log(`   - Coordenadas: lat=${pin.lat}, lng=${pin.lng}`);
            
            // Solo mostrar pines que tienen coordenadas geográficas
            if (pin.lat === null || pin.lng === null || pin.lat === undefined || pin.lng === undefined) {
                console.log(`⚠️ Pin ${pin.nombre} sin coordenadas válidas - lat: ${pin.lat}, lng: ${pin.lng}`);
                pinesSinCoordenadas++;
                return; // Saltar pines sin posicionar
            }
            
            const lat = parseFloat(pin.lat);
            const lng = parseFloat(pin.lng);
            
            console.log(`✅ Creando marker para ${pin.nombre} en lat:${lat}, lng:${lng}`);
            
            // Crear marcador con icono simple para debug
            const marker = new google.maps.Marker({
                position: { lat: lat, lng: lng },
                map: googleMap,
                title: pin.nombre,
                // Usar icono por defecto temporalmente para debug
                animation: pin.temporal ? google.maps.Animation.BOUNCE : null
            });

            console.log(`🔧 Marker creado para ${pin.nombre}:`, marker);

            // Agregar información del pin al marker
            marker.pinData = pin;
            
            // Event listener para mostrar detalles al hacer clic
            marker.addListener('click', () => {
                console.log(`🖱️ Click en marker: ${pin.nombre}`);
                mostrarDetallesPin(pin);
                
                // Mostrar InfoWindow con información básica
                const infoContent = `
                    <div style="font-family: Arial, sans-serif; padding: 5px;">
                        <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${pin.nombre}${pin.temporal ? ' ⏳' : ''}</h4>
                        <p style="margin: 0; color: #7f8c8d; font-size: 12px;">
                            <strong>Tipo:</strong> ${getDescripcionTipo(pin.tipo)}<br>
                            <strong>Coordenadas:</strong> ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}
                        </p>
                    </div>
                `;
                
                infoWindow.setContent(infoContent);
                infoWindow.open(googleMap, marker);
            });

            // Event listener para modo edición
            marker.addListener('rightclick', (e) => {
                if (modoEdicion) {
                    e.stop();
                    seleccionarPinParaEdicion(pin);
                }
            });

            markers.push(marker);
            pinesMostrados++;
            console.log(`✅ Marker ${pinesMostrados} creado y agregado al mapa`);
        });
        
        console.log(`📈 Resumen: ${pinesMostrados} pines mostrados, ${pinesSinCoordenadas} sin coordenadas`);
        
        // Aplicar filtros después de crear todos los markers
        setTimeout(() => {
            aplicarFiltros();
        }, 100);
        
        // Mostrar botones después de crear los pines
        mostrarBotonAgregarPin();
    } else {
        console.log('📭 No hay pines para mostrar');
        // Mostrar botón agregar incluso si no hay pines
        mostrarBotonAgregarPin();
    }
    
    console.log('🏁 Función mostrarPines completada');
}

// Función auxiliar para crear iconos SVG personalizados
function createSVGIcon(tipo, temporal = false) {
    const icono = getIconoPorTipo(tipo);
    const color = getColorPorTipo(tipo);
    const borderStyle = temporal ? 'stroke-dasharray="4,2" stroke="#f39c12" stroke-width="2"' : 'stroke="rgba(0,0,0,0.3)" stroke-width="1"';
    
    return `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="${color}" ${borderStyle} opacity="0.9"/>
            <text x="16" y="20" text-anchor="middle" font-size="12" fill="white" font-family="Arial">${icono}</text>
        </svg>
    `;
}

// Función auxiliar para obtener color por tipo
function getColorPorTipo(tipo) {
    switch(tipo) {
        case 'rios':
        case 'rio': 
            return '#3498db';      // Azul para ríos
        case 'lagos':
        case 'lago':
            return '#2ecc71';     // Verde para lagos  
        case 'presas':
        case 'presa':
            return '#e67e22';    // Naranja para presas
        default: return '#95a5a6';          // Gris por defecto
    }
}

// Función auxiliar para obtener descripción del tipo
function getDescripcionTipo(tipo) {
    switch(tipo) {
        case 'rios':
        case 'rio':
            return 'Río';
        case 'lagos':
        case 'lago':
            return 'Lago';
        case 'presas':
        case 'presa':
            return 'Presa';
        default: return 'Desconocido';
    }
}

// Función auxiliar para obtener icono por tipo
function getIconoPorTipo(tipo) {
    switch(tipo) {
        case 'rios':
        case 'rio':
            return '🌊';
        case 'lagos':
        case 'lago':
            return '🏞️';
        case 'presas':
        case 'presa':
            return '🏗️';
        default: return '📍';
    }
}

// Función para manejar clics en Google Maps para modo edición
function manejarClicGoogleMaps(event) {
    if (!modoEdicion) return;
    
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    
    console.log('Clic en Google Maps:', { lat, lng });
    
    if (pinEditando) {
        // Actualizar posición del pin directamente con las coordenadas del clic
        actualizarPosicionPinGoogleMaps(pinEditando, lat, lng);
    } else {
        console.log(`Coordenadas disponibles para posicionamiento: lat:${lat.toFixed(6)}, lng:${lng.toFixed(6)}`);
        alert(`Primero selecciona un pin de la lista para editar.\nCoordenadas del clic: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
}

// Función para actualizar la posición de un pin en Google Maps
function actualizarPosicionPinGoogleMaps(pin, newLat, newLng) {
    // Actualizar datos en memoria
    pin.lat = newLat;
    pin.lng = newLng;
    pin.latitud = newLat;
    pin.longitud = newLng;
    
    // Convertir coordenadas geográficas a porcentajes para compatibilidad
    const posicionMapa = coordenadasGeograficasAPorcentaje(newLat, newLng);
    pin.x = posicionMapa.x;
    pin.y = posicionMapa.y;
    
    // Quitar flags de sin posicionar
    if (pin.sinPosicionar) {
        delete pin.sinPosicionar;
    }
    
    // Si no es un pin temporal, guardar inmediatamente en la base de datos
    if (!pin.temporal && pin.id) {
        guardarNuevaPosicionPin(pin, newLat, newLng);
    }
    
    // Mostrar mensaje apropiado según el tipo de pin
    if (pin.temporal) {
        mostrarMensajeConfirmacion(`Pin temporal "${pin.nombre}" posicionado. Usa "Guardar Cambios" para guardarlo en la base de datos.`, 'temporal');
    } else {
        mostrarMensajeConfirmacion(`Pin "${pin.nombre}" reposicionado y guardado en la base de datos.`, 'agregar');
    }
    
    // Reposicionar pines visualmente
    mostrarPines();
    
    // Mostrar información de la nueva posición
    console.log(`${pin.nombre} posicionado en:`);
    console.log(`  - Geográficas: lat:${newLat}, lng:${newLng}`);
    console.log(`  - Mapa: ${pin.x.toFixed(2)}%, ${pin.y.toFixed(2)}%`);
    
    // Limpiar pin seleccionado
    pinEditando = null;
    actualizarListaPines();
}

// Funciones de conversión de coordenadas (mantener compatibilidad)
function coordenadasGeograficasAPorcentaje(lat, lng) {
    const bounds = HIDALGO_MAP_CONFIG.bounds;
    
    // Convertir latitud (Y - invertido porque en mapas Y=0 está arriba)
    const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * 100;
    
    // Convertir longitud (X)
    const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100;
    
    return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
    };
}

function porcentajeACoordenasGeograficas(x, y) {
    const bounds = HIDALGO_MAP_CONFIG.bounds;
    
    // Convertir X (longitud)
    const lng = bounds.west + (x / 100) * (bounds.east - bounds.west);
    
    // Convertir Y (latitud - invertido)
    const lat = bounds.north - (y / 100) * (bounds.north - bounds.south);
    
    return { lat, lng };
}

// Función para mostrar errores
function mostrarError(mensaje) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.innerHTML = `
            <div style="color: red; padding: 20px; text-align: center; background: #fff; border-radius: 10px;">
                <h3>❌ ${mensaje}</h3>
                <button onclick="cargarMapa()" style="margin-top: 10px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
    }
}

// Función para activar/desactivar el modo de edición
function toggleModoEdicion() {
    modoEdicion = !modoEdicion;
    const botonEdicion = document.getElementById('btn-editar-pines');
    
    if (modoEdicion) {
        botonEdicion.textContent = 'Salir del Modo Edición';
        botonEdicion.style.background = '#e74c3c';
        
        if (googleMap) {
            googleMap.setOptions({ draggableCursor: 'crosshair' });
        }
        
        mostrarInstruccionesEdicion();
    } else {
        botonEdicion.textContent = 'Editar Posiciones';
        botonEdicion.style.background = '#3498db';
        
        if (googleMap) {
            googleMap.setOptions({ draggableCursor: null });
        }
        
        ocultarInstruccionesEdicion();
        pinEditando = null;
    }
}

// Función para seleccionar un pin para edición
function seleccionarPinParaEdicion(pin) {
    pinEditando = pin;
    console.log(`Pin seleccionado para edición: ${pin.nombre}`);
    
    // Actualizar lista de pines para mostrar cual está seleccionado
    actualizarListaPines();
    
    // Mostrar mensaje de instrucciones
    mostrarMensajeConfirmacion(`Pin "${pin.nombre}" seleccionado. Haz clic en el mapa para reposicionarlo.`, 'info');
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, esperando Google Maps...');
    
    // La función initMap será llamada automáticamente por Google Maps API
    // debido al callback configurado en el script
});

// Función para mostrar detalles del pin
function mostrarDetallesPin(pin) {
    console.log('Mostrando detalles para:', pin.nombre);

    const mapContainer = document.getElementById('map-container');
    const detallesContainer = document.getElementById('detalles-container');
    
    if (mapContainer && detallesContainer) {
        // Animar la transición - El mapa y los pines se moverán juntos
        mapContainer.classList.add('mapa-deslizado');
        detallesContainer.classList.add('detalles-visible');
        
        actualizarPanelDetalles(pin);
    } else {
        console.error('No se encontraron los contenedores necesarios para mostrar los detalles.');
    }
}

// Función para actualizar el panel de detalles
function actualizarPanelDetalles(pin) {
    const detallesContent = document.getElementById('detalles-content');
    if (!detallesContent) {
        console.error('No se encontró el contenedor de detalles.');
        return;
    }
    
    detallesContent.innerHTML = `
        <div class="detalle-header">
            <h3>${pin.nombre}${pin.temporal ? ' ⏳' : ''}</h3>
            <button class="btn-cerrar" onclick="cerrarDetalles()">✕</button>
        </div>
        <div class="detalle-body">
            <div class="detalle-item">
                <strong>Tipo:</strong>
                <span class="tipo-badge tipo-${pin.tipo}">${getDescripcionTipo(pin.tipo)}</span>
            </div>
            <div class="detalle-item">
                <strong>Descripción:</strong>
                <p>${pin.descripcion || 'Sin descripción disponible'}</p>
            </div>
            <div class="detalle-item">
                <strong>Ubicación:</strong>
                <p>Lat: ${pin.lat ? pin.lat.toFixed(6) : 'N/A'}, Lng: ${pin.lng ? pin.lng.toFixed(6) : 'N/A'}</p>
            </div>
            ${pin.temporal ? `
                <div class="detalle-item temporal-warning">
                    <strong>⚠️ Pin Temporal:</strong>
                    <p>Este pin no se ha guardado permanentemente. Usa "Guardar Cambios" para conservarlo.</p>
                </div>
            ` : ''}
        </div>
    `;
}

// Función para cerrar detalles
function cerrarDetalles() {
    const mapContainer = document.getElementById('map-container');
    const detallesContainer = document.getElementById('detalles-container');
    
    if (mapContainer && detallesContainer) {
        // Restaurar estado original
        mapContainer.classList.remove('mapa-deslizado');
        detallesContainer.classList.remove('detalles-visible');
        
        // Cerrar InfoWindow si está abierto
        if (infoWindow) {
            infoWindow.close();
        }
    } else {
        console.error('No se encontraron los contenedores necesarios para cerrar los detalles.');
    }
}

// Función para aplicar filtros
function aplicarFiltros() {
    const filtroRios = document.getElementById('filtro-rio')?.checked ?? true;
    const filtroLagos = document.getElementById('filtro-lago')?.checked ?? true;
    const filtroPresas = document.getElementById('filtro-presa')?.checked ?? true;
    
    markers.forEach(marker => {
        const pin = marker.pinData;
        let visible = false;
        
        switch(pin.tipo) {
            case 'rios':
            case 'rio':
                visible = filtroRios;
                break;
            case 'lagos':
            case 'lago':
                visible = filtroLagos;
                break;
            case 'presas':
            case 'presa':
                visible = filtroPresas;
                break;
        }
        
        marker.setVisible(visible);
    });
}

// Función para mostrar botón agregar pin
function mostrarBotonAgregarPin() {
    // Esta función se puede implementar más tarde
    console.log('Función mostrarBotonAgregarPin llamada');
}

// Función para mostrar instrucciones de edición
function mostrarInstruccionesEdicion() {
    const instrucciones = document.createElement('div');
    instrucciones.id = 'instrucciones-edicion';
    instrucciones.className = 'instrucciones-edicion';
    instrucciones.innerHTML = `
        <div class="instrucciones-content">
            <h4>📝 Modo Edición Activado</h4>
            <p>• Haz clic derecho en un pin para seleccionarlo</p>
            <p>• Luego haz clic en el mapa para reposicionarlo</p>
            <p>• Las coordenadas se guardan automáticamente</p>
        </div>
    `;
    
    document.body.appendChild(instrucciones);
}

// Función para ocultar instrucciones de edición
function ocultarInstruccionesEdicion() {
    const instrucciones = document.getElementById('instrucciones-edicion');
    if (instrucciones) {
        instrucciones.remove();
    }
}

// Función para mostrar mensaje de confirmación
function mostrarMensajeConfirmacion(mensaje, tipo = 'info') {
    const colores = {
        'info': '#3498db',
        'agregar': '#2ecc71',
        'temporal': '#f39c12',
        'error': '#e74c3c'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'mensaje-confirmacion';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colores[tipo] || colores.info};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    messageDiv.textContent = mensaje;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Función para actualizar lista de pines (placeholder)
function actualizarListaPines() {
    console.log('Función actualizarListaPines llamada');
}

// Función para guardar nueva posición de pin
async function guardarNuevaPosicionPin(pin, latitud, longitud) {
    try {
        console.log(`📄 Guardando nueva posición del pin "${pin.nombre}" en la base de datos...`);
        
        const response = await fetch(`/api/pines/${pin.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                latitud: latitud,
                longitud: longitud
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Posición del pin "${pin.nombre}" actualizada en la base de datos`);
        
        // Actualizar localStorage como respaldo
        const coordenadasLocales = {
            x: pin.x,
            y: pin.y,
            lat: latitud,
            lng: longitud
        };
        localStorage.setItem(`pin_coords_${pin.id}`, JSON.stringify(coordenadasLocales));
        console.log(`💾 Coordenadas actualizadas en localStorage para pin ID ${pin.id}`);
        
    } catch (error) {
        console.error(`❌ Error guardando posición del pin "${pin.nombre}":`, error);
        mostrarMensajeConfirmacion(`Error al guardar la nueva posición del pin "${pin.nombre}". Inténtalo de nuevo.`, 'error');
    }
}

// Función para mostrar detalles del pin
function mostrarDetallesPin(pin) {
    console.log('Mostrando detalles para:', pin.nombre);

    const mapContainer = document.getElementById('map-container');
    const detallesContainer = document.getElementById('detalles-container');
    
    if (mapContainer && detallesContainer) {
        // Cerrar InfoWindow si está abierto
        if (infoWindow) {
            infoWindow.close();
        }

        // Animar la transición
        mapContainer.classList.add('mapa-deslizado');
        detallesContainer.classList.add('detalles-visible');
        
        actualizarPanelDetalles(pin);
    } else {
        console.error('No se encontraron los contenedores necesarios para mostrar los detalles.');
    }
}

function actualizarPanelDetalles(pin) {
    const detallesContent = document.getElementById('detalles-content');
    if (!detallesContent) {
        console.error('No se encontró el contenedor de detalles.');
        return;
    }
    
    detallesContent.innerHTML = `
        <div class="detalle-header">
            <div class="detalle-icono">${getIconoPorTipo(pin.tipo)}</div>
            <h3>${pin.nombre}</h3>
            <button class="btn-cerrar" onclick="cerrarDetalles()" title="Cerrar detalles (Esc)">×</button>
        </div>
        
        <div class="detalle-info">
            <div class="info-item">
                <label>Descripción:</label>
                <p>${pin.descripcion}</p>
            </div>
            
            <div class="info-item">
                <label>Tipo de Ecosistema:</label>
                <span class="tipo-${pin.tipo}">${pin.tipo.charAt(0).toUpperCase() + pin.tipo.slice(1)}</span>
            </div>
            
            <div class="info-item">
                <label>Coordenadas Geográficas:</label>
                <span>Lat: ${pin.lat ? pin.lat.toFixed(6) : 'N/A'}, Lng: ${pin.lng ? pin.lng.toFixed(6) : 'N/A'}</span>
            </div>
            
            ${pin.temporal ? `
                <div class="info-item temporal-warning">
                    <label>⚠️ Estado:</label>
                    <span style="color: #f39c12; font-weight: bold;">Pin temporal - Aún no guardado</span>
                </div>
            ` : ''}
        </div>
        
        <div class="detalle-acciones">
            <button class="btn-editar" onclick="editarPin(${pin.id})" title="Editar información del pin">
                ✏️ Editar
            </button>
            <button class="btn-eliminar" onclick="eliminarPin(${pin.id})" title="Eliminar este pin">
                🗑️ Eliminar
            </button>
        </div>
    `;
}

function cerrarDetalles() {
    const mapContainer = document.getElementById('map-container');
    const detallesContainer = document.getElementById('detalles-container');
    
    if (mapContainer && detallesContainer) {
        // Restaurar estado original
        mapContainer.classList.remove('mapa-deslizado');
        detallesContainer.classList.remove('detalles-visible');
        
        // Cerrar InfoWindow si está abierto
        if (infoWindow) {
            infoWindow.close();
        }
    } else {
        console.error('No se encontraron los contenedores necesarios para cerrar los detalles.');
    }
}

// Función para aplicar filtros (placeholder)
function aplicarFiltros() {
    const filtroRios = document.getElementById('filtro-rios');
    const filtroLagos = document.getElementById('filtro-lagos');
    const filtroPresas = document.getElementById('filtro-presas');
    
    if (!filtroRios || !filtroLagos || !filtroPresas) {
        return; // No hay filtros disponibles
    }

    const mostrarRios = filtroRios.checked;
    const mostrarLagos = filtroLagos.checked;
    const mostrarPresas = filtroPresas.checked;

    markers.forEach(marker => {
        const pin = marker.pinData;
        const deberiaSerVisible = 
            (pin.tipo === 'rios' && mostrarRios) ||
            (pin.tipo === 'lagos' && mostrarLagos) ||
            (pin.tipo === 'presas' && mostrarPresas);
        
        marker.setVisible(deberiaSerVisible);
    });
}

// Función para mostrar botón agregar pin (placeholder)
function mostrarBotonAgregarPin() {
    const botonAgregar = document.getElementById('btn-agregar-pin');
    if (botonAgregar) {
        botonAgregar.style.display = 'block';
    }
}

// Función para mostrar mensaje de confirmación (placeholder)
function mostrarMensajeConfirmacion(mensaje, tipo) {
    console.log(`${tipo}: ${mensaje}`);
    
    // Crear o actualizar el elemento de mensaje
    let mensajeElement = document.getElementById('mensaje-confirmacion');
    if (!mensajeElement) {
        mensajeElement = document.createElement('div');
        mensajeElement.id = 'mensaje-confirmacion';
        mensajeElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(mensajeElement);
    }
    
    // Definir colores según el tipo
    const colores = {
        'temporal': '#f39c12',
        'agregar': '#27ae60',
        'error': '#e74c3c',
        'info': '#3498db'
    };
    
    mensajeElement.style.backgroundColor = colores[tipo] || '#95a5a6';
    mensajeElement.textContent = mensaje;
    mensajeElement.style.display = 'block';
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        if (mensajeElement) {
            mensajeElement.style.display = 'none';
        }
    }, 5000);
}

// Función para actualizar lista de pines (placeholder)
function actualizarListaPines() {
    console.log('Actualizando lista de pines...');
    // Esta función podría actualizar una lista lateral de pines si existe
}

// Función para mostrar instrucciones de edición
function mostrarInstruccionesEdicion() {
    let instrucciones = document.getElementById('instrucciones-edicion');
    if (!instrucciones) {
        instrucciones = document.createElement('div');
        instrucciones.id = 'instrucciones-edicion';
        instrucciones.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            background: rgba(52, 152, 219, 0.9);
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 1000;
            max-width: 250px;
            font-size: 14px;
        `;
        document.body.appendChild(instrucciones);
    }
    
    instrucciones.innerHTML = `
        <h4 style="margin: 0 0 10px 0;">🎯 Modo Edición Activo</h4>
        <p style="margin: 5px 0;">• Clic derecho en un pin para seleccionarlo</p>
        <p style="margin: 5px 0;">• Clic izquierdo en el mapa para reposicionarlo</p>
        <p style="margin: 5px 0;">• Usa "Salir del Modo Edición" cuando termines</p>
    `;
    instrucciones.style.display = 'block';
}

// Función para ocultar instrucciones de edición
function ocultarInstruccionesEdicion() {
    const instrucciones = document.getElementById('instrucciones-edicion');
    if (instrucciones) {
        instrucciones.style.display = 'none';
    }
}

// Función para guardar nueva posición de pin en la base de datos
async function guardarNuevaPosicionPin(pin, latitud, longitud) {
    try {
        console.log(`📡 Guardando nueva posición del pin "${pin.nombre}" en la base de datos...`);
        
        const response = await fetch(`/api/pines/${pin.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                latitud: latitud,
                longitud: longitud
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Posición del pin "${pin.nombre}" actualizada en la base de datos`);
        
        // Actualizar localStorage como respaldo
        const coordenadasLocales = {
            x: pin.x,
            y: pin.y,
            lat: latitud,
            lng: longitud
        };
        localStorage.setItem(`pin_coords_${pin.id}`, JSON.stringify(coordenadasLocales));
        console.log(`💾 Coordenadas actualizadas en localStorage para pin ID ${pin.id}`);
        
    } catch (error) {
        console.error(`❌ Error guardando posición del pin "${pin.nombre}":`, error);
        mostrarMensajeConfirmacion(`Error al guardar la nueva posición del pin "${pin.nombre}". Inténtalo de nuevo.`, 'error');
    }
}

// Funciones placeholder para edición y eliminación de pines
function editarPin(pinId) {
    console.log(`Editando pin ID: ${pinId}`);
    mostrarMensajeConfirmacion('Función de edición en desarrollo', 'info');
}

function eliminarPin(pinId) {
    console.log(`Eliminando pin ID: ${pinId}`);
    if (confirm('¿Estás seguro de que quieres eliminar este pin?')) {
        mostrarMensajeConfirmacion('Función de eliminación en desarrollo', 'info');
    }
}

// Función para agregar un nuevo pin en coordenadas específicas
async function agregarPinEnCoordenadas(lat, lng, tipo = 'rio', nombre = 'Nuevo Pin', descripcion = 'Pin agregado automáticamente') {
    try {
        console.log(`🎯 Agregando pin en coordenadas: lat=${lat}, lng=${lng}`);
        
        // Crear el objeto del nuevo pin
        const nuevoPin = {
            latitud: lat,
            longitud: lng,
            tipo: tipo,
            nombre: nombre,
            descripcion: descripcion
        };
        
        console.log('📤 Enviando nuevo pin al servidor:', nuevoPin);
        
        // Enviar al backend
        const response = await fetch('/api/pines', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(nuevoPin)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const pinGuardado = await response.json();
        console.log('✅ Pin guardado exitosamente:', pinGuardado);
        
        // Mostrar mensaje de éxito
        mostrarMensajeConfirmacion(`Pin "${nombre}" agregado exitosamente en las coordenadas ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'agregar');
        
        // Recargar los pines para mostrar el nuevo
        await cargarPines();
        
        // Centrar el mapa en el nuevo pin
        if (googleMap) {
            googleMap.setCenter({ lat: lat, lng: lng });
            googleMap.setZoom(12);
        }
        
        return pinGuardado;
        
    } catch (error) {
        console.error('❌ Error agregando pin:', error);
        mostrarMensajeConfirmacion(`Error al agregar el pin: ${error.message}`, 'error');
        throw error;
    }
}

// Función para convertir coordenadas DMS (grados, minutos, segundos) a decimal
function dmsADecimal(grados, minutos, segundos, direccion) {
    let decimal = grados + (minutos / 60) + (segundos / 3600);
    if (direccion === 'S' || direccion === 'W') {
        decimal = -decimal;
    }
    return decimal;
}

// Función específica para agregar el pin en las coordenadas solicitadas
async function agregarPinCoordinadasEspecificas() {
    // Coordenadas: 20°38'55"N 98°59'41"W
    const lat = dmsADecimal(20, 38, 55, 'N');  // 20.6486111
    const lng = dmsADecimal(98, 59, 41, 'W');  // -98.9947222
    
    console.log(`📍 Coordenadas convertidas: ${lat}, ${lng}`);
    
    try {
        const pin = await agregarPinEnCoordenadas(
            lat, 
            lng, 
            'rio',  // Tipo de ecosistema
            'Pin Coordenadas Específicas',  // Nombre
            `Pin agregado en coordenadas 20°38'55"N 98°59'41"W (${lat.toFixed(6)}, ${lng.toFixed(6)})`  // Descripción
        );
        
        console.log('🎉 Pin agregado exitosamente:', pin);
        return pin;
        
    } catch (error) {
        console.error('💥 Error al agregar pin en coordenadas específicas:', error);
        throw error;
    }
}

// Función para agregar pin mediante clic en el mapa (modo agregar)
function habilitarModoAgregarPin() {
    mostrarMensajeConfirmacion('Haz clic en el mapa para agregar un nuevo pin', 'info');
    
    // Cambiar cursor
    if (googleMap) {
        googleMap.setOptions({ draggableCursor: 'crosshair' });
    }
    
    // Crear listener temporal para agregar pin
    const listener = googleMap.addListener('click', async (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        // Remover el listener
        google.maps.event.removeListener(listener);
        
        // Restaurar cursor
        googleMap.setOptions({ draggableCursor: null });
        
        // Pedir información del pin al usuario
        const nombre = prompt('Nombre del nuevo pin:') || 'Nuevo Pin';
        const tipo = prompt('Tipo de ecosistema (rio/lago/presa):') || 'rio';
        const descripcion = prompt('Descripción:') || 'Pin agregado manualmente';
        
        if (nombre) {
            try {
                await agregarPinEnCoordenadas(lat, lng, tipo, nombre, descripcion);
            } catch (error) {
                console.error('Error al agregar pin:', error);
            }
        }
    });
}
