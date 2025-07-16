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

// Función para mostrar pines con Google Maps
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
            actualizarEstadisticas();
        }, 100);
        
        // Mostrar botones después de crear los pines
        mostrarBotonAgregarPin();
    } else {
        console.log('📭 No hay pines para mostrar');
        // Mostrar botón agregar incluso si no hay pines
        mostrarBotonAgregarPin();
        actualizarEstadisticas();
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
        case 'manantial':
        case 'manantiales':
            return '#8e44ad';    // Morado para manantiales
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
        case 'manantial':
        case 'manantiales':
            return 'Manantial';
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
        case 'manantial':
        case 'manantiales':
            return '💧';
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

// Función para actualizar estadísticas (para vista de administrador)
function actualizarEstadisticas() {
    // Contar pines por tipo
    let totalRios = 0;
    let totalLagos = 0;
    let totalPresas = 0;
    let totalManantiales = 0;
    let totalGeneral = 0;

    pinesData.forEach(pin => {
        if (pin.lat !== null && pin.lng !== null) {
            totalGeneral++;
            
            switch(pin.tipo) {
                case 'rios':
                case 'rio':
                    totalRios++;
                    break;
                case 'lagos':
                case 'lago':
                    totalLagos++;
                    break;
                case 'presas':
                case 'presa':
                    totalPresas++;
                    break;
                case 'manantial':
                case 'manantiales':
                    totalManantiales++;
                    break;
            }
        }
    });

    // Actualizar elementos de estadísticas (solo si existen - vista admin)
    const totalPinesEl = document.getElementById('total-pines');
    const totalRiosEl = document.getElementById('total-rios');
    const totalLagosEl = document.getElementById('total-lagos');
    const totalPresasEl = document.getElementById('total-presas');
    const totalManatialesEl = document.getElementById('total-manantiales');
    const totalPinesUserEl = document.getElementById('total-pines-user');

    if (totalPinesEl) totalPinesEl.textContent = totalGeneral;
    if (totalRiosEl) totalRiosEl.textContent = totalRios;
    if (totalLagosEl) totalLagosEl.textContent = totalLagos;
    if (totalPresasEl) totalPresasEl.textContent = totalPresas;
    if (totalManatialesEl) totalManatialesEl.textContent = totalManantiales;
    if (totalPinesUserEl) totalPinesUserEl.textContent = totalGeneral;

    console.log(`📊 Estadísticas actualizadas: Total: ${totalGeneral}, Ríos: ${totalRios}, Lagos: ${totalLagos}, Presas: ${totalPresas}, Manantiales: ${totalManantiales}`);
}

// Función para aplicar filtros (ahora funcional para todos los tipos)
function aplicarFiltros() {
    const filtroRios = document.getElementById('filtro-rios');
    const filtroLagos = document.getElementById('filtro-lagos');
    const filtroPresas = document.getElementById('filtro-presas');
    const filtroManantiales = document.getElementById('filtro-manantial') || document.getElementById('filtro-manantiales');

    // Si no hay filtros, mostrar todo
    if (!filtroRios && !filtroLagos && !filtroPresas && !filtroManantiales) {
        markers.forEach(marker => marker.setVisible(true));
        return;
    }

    markers.forEach(marker => {
        const pin = marker.pinData;
        let visible = true;
        if (pin.tipo === 'rios' || pin.tipo === 'rio') {
            visible = filtroRios ? filtroRios.checked : true;
        } else if (pin.tipo === 'lagos' || pin.tipo === 'lago') {
            visible = filtroLagos ? filtroLagos.checked : true;
        } else if (pin.tipo === 'presas' || pin.tipo === 'presa') {
            visible = filtroPresas ? filtroPresas.checked : true;
        } else if (pin.tipo === 'manantial' || pin.tipo === 'manantiales') {
            visible = filtroManantiales ? filtroManantiales.checked : true;
        }
        marker.setVisible(visible);
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

// Funciones para edición y eliminación de pines
function editarPin(pinId) {
    console.log(`Editando pin ID: ${pinId}`);
    mostrarMensajeConfirmacion('Función de edición en desarrollo', 'info');
}

async function eliminarPin(pinId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este pin?')) return;
    try {
        const response = await fetch(`/api/pines/${pinId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('No se pudo eliminar el pin');
        mostrarMensajeConfirmacion('Pin eliminado correctamente', 'agregar');
        await cargarPines();
        cerrarDetalles();
    } catch (error) {
        mostrarMensajeConfirmacion('Error al eliminar el pin', 'error');
        console.error(error);
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

// Función específica para agregar pines en las coordenadas de todos los cuerpos de agua de Hidalgo
async function agregarPinCoordinadasEspecificas() {
    try {
        console.log('🌊 Agregando pines para todos los cuerpos de agua de Hidalgo...');
        
        const pinesAgregados = [];
        
        // RÍOS
        
        // Río Moctezuma: 21°58′03″N, 98°33′47″O (Confluencia con el Río Tula en la Presa Zimapán)
        const latMoctezuma = dmsADecimal(21, 58, 3, 'N');
        const lngMoctezuma = dmsADecimal(98, 33, 47, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latMoctezuma, lngMoctezuma, 'rio', 'Río Moctezuma',
            'Confluencia con el Río Tula en la Presa Zimapán'
        ));
        
        // Río Tula: 20°35′02″N, 99°19′43″O (Paso por Tula de Allende)
        const latTula = dmsADecimal(20, 35, 2, 'N');
        const lngTula = dmsADecimal(99, 19, 43, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latTula, lngTula, 'rio', 'Río Tula',
            'Paso por Tula de Allende'
        ));
        
        // Río Amajac: 21°15′08″N, 98°46′53″O (Nacimiento en la Sierra de Pachuca)
        const latAmajac = dmsADecimal(21, 15, 8, 'N');
        const lngAmajac = dmsADecimal(98, 46, 53, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latAmajac, lngAmajac, 'rio', 'Río Amajac',
            'Nacimiento en la Sierra de Pachuca'
        ));
        
        // Río San Juan: 20°32′31″N, 99°51′27″O (Confluencia con el Río Tula, límite con Querétaro)
        const latSanJuan = dmsADecimal(20, 32, 31, 'N');
        const lngSanJuan = dmsADecimal(99, 51, 27, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latSanJuan, lngSanJuan, 'rio', 'Río San Juan',
            'Confluencia con el Río Tula, límite con Querétaro'
        ));
        
        // Río Salado: 20°08′27″N, 99°14′54″O (Desembocadura en el Río Tula)
        const latSalado = dmsADecimal(20, 8, 27, 'N');
        const lngSalado = dmsADecimal(99, 14, 54, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latSalado, lngSalado, 'rio', 'Río Salado',
            'Desembocadura en el Río Tula'
        ));
        
        // Río Actopan: 20°16′12″N, 98°56′42″O (Punto de interés en Puente de Dios, Mesa Chica)
        const latActopan = dmsADecimal(20, 16, 12, 'N');
        const lngActopan = dmsADecimal(98, 56, 42, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latActopan, lngActopan, 'rio', 'Río Actopan',
            'Punto de interés en Puente de Dios, Mesa Chica'
        ));
        
        // Río Cazones: 20°43′30″N, 97°12′01″O (Origen en la sierra de Hidalgo, al este de Tulancingo)
        const latCazones = dmsADecimal(20, 43, 30, 'N');
        const lngCazones = dmsADecimal(97, 12, 1, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latCazones, lngCazones, 'rio', 'Río Cazones',
            'Origen en la sierra de Hidalgo, al este de Tulancingo'
        ));
        
        // Río Pantepec: 20°56′00″N, 97°44′00″O (Nacimiento en la Sierra Madre Oriental)
        const latPantepec = dmsADecimal(20, 56, 0, 'N');
        const lngPantepec = dmsADecimal(97, 44, 0, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latPantepec, lngPantepec, 'rio', 'Río Pantepec',
            'Nacimiento en la Sierra Madre Oriental'
        ));
        
        // Río Chicavasco: 20°30′22″N, 99°14′05″O (Nacimiento en la Sierra de Pachuca)
        const latChicavasco = dmsADecimal(20, 30, 22, 'N');
        const lngChicavasco = dmsADecimal(99, 14, 5, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latChicavasco, lngChicavasco, 'rio', 'Río Chicavasco',
            'Nacimiento en la Sierra de Pachuca'
        ));
        
        // Río Metztitlán: 20°35′04″N, 98°45′47″O (Punto de interés en la Barranca de Metztitlán)
        const latMetztitlan = dmsADecimal(20, 35, 4, 'N');
        const lngMetztitlan = dmsADecimal(98, 45, 47, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latMetztitlan, lngMetztitlan, 'rio', 'Río Metztitlán',
            'Punto de interés en la Barranca de Metztitlán'
        ));
        
        // Río de las Avenidas: 20°06′53.55″N, 98°44′22.68″O (Punto representativo en Pachuca)
        const latAvenidas = 20 + 6/60 + 53.55/3600;
        const lngAvenidas = -(98 + 44/60 + 22.68/3600);
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latAvenidas, lngAvenidas, 'rio', 'Río de las Avenidas',
            'Punto representativo en Pachuca'
        ));
        
        // Río Alfajayucan: 20°29′30″N, 99°23′15″O
        const latAlfajayucan = dmsADecimal(20, 29, 30, 'N');
        const lngAlfajayucan = dmsADecimal(99, 23, 15, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latAlfajayucan, lngAlfajayucan, 'rio', 'Río Alfajayucan',
            'Río ubicado en el municipio de Alfajayucan'
        ));
        
        // Río Tepeji: 19°45′37″N, 99°29′21″O
        const latTepeji = dmsADecimal(19, 45, 37, 'N');
        const lngTepeji = dmsADecimal(99, 29, 21, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latTepeji, lngTepeji, 'rio', 'Río Tepeji',
            'Río que pasa por la región de Tepeji del Río'
        ));
        
        // Río Rosas: 20°02′18″N, 99°27′02″O
        const latRosas = dmsADecimal(20, 2, 18, 'N');
        const lngRosas = dmsADecimal(99, 27, 2, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latRosas, lngRosas, 'rio', 'Río Rosas',
            'Río ubicado en la región central de Hidalgo'
        ));
        
        // Río El Salto: 19°56′12″N, 99°16′58″O
        const latElSalto = dmsADecimal(19, 56, 12, 'N');
        const lngElSalto = dmsADecimal(99, 16, 58, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latElSalto, lngElSalto, 'rio', 'Río El Salto',
            'Río con formaciones de cascadas naturales'
        ));
        
        // Río Cuautitlán: 19°35′36″N, 99°26′19″O
        const latCuautitlan = dmsADecimal(19, 35, 36, 'N');
        const lngCuautitlan = dmsADecimal(99, 26, 19, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latCuautitlan, lngCuautitlan, 'rio', 'Río Cuautitlán',
            'Río en la región sur de Hidalgo'
        ));
        
        // Río Tlautla: 19°57′45″N, 99°23′06″O
        const latTlautla = dmsADecimal(19, 57, 45, 'N');
        const lngTlautla = dmsADecimal(99, 23, 6, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latTlautla, lngTlautla, 'rio', 'Río Tlautla',
            'Río que atraviesa la región central del estado'
        ));
        
        // Río Calabozo: 21°1′51″N, 98°17′6″W (Coordenadas de la comunidad de Coatzonco, Huautla, Hidalgo)
        const latCalabozo = dmsADecimal(21, 1, 51, 'N');
        const lngCalabozo = dmsADecimal(98, 17, 6, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latCalabozo, lngCalabozo, 'rio', 'Río Calabozo',
            'Sección del río en la comunidad de Coatzonco, Huautla'
        ));
        
        // LAGOS Y LAGUNAS
        
        // Laguna de Metztitlán (punto central): 20°41′N, 98°51′30″O
        const latLagunaMetztitlan = dmsADecimal(20, 41, 0, 'N');
        const lngLagunaMetztitlan = dmsADecimal(98, 51, 30, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latLagunaMetztitlan, lngLagunaMetztitlan, 'lago', 'Laguna de Metztitlán',
            'Reserva de la biosfera, humedal importante para aves migratorias'
        ));
        
        // Laguna de Tecocomulco (punto central): 19°51′44″N, 98°23′49″O
        const latTecocomulco = dmsADecimal(19, 51, 44, 'N');
        const lngTecocomulco = dmsADecimal(98, 23, 49, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latTecocomulco, lngTecocomulco, 'lago', 'Laguna de Tecocomulco',
            'Lago artificial importante para la región de Tulancingo'
        ));
        
        // PRESAS
        
        // Presa Requena: 19°56′41″N, 99°19′10″O
        const latRequena = dmsADecimal(19, 56, 41, 'N');
        const lngRequena = dmsADecimal(99, 19, 10, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latRequena, lngRequena, 'presa', 'Presa Requena',
            'Presa para control de agua y generación hidroeléctrica'
        ));
        
        // Presa Endhó: 20°08′10″N, 99°22′16″O
        const latEndho = dmsADecimal(20, 8, 10, 'N');
        const lngEndho = dmsADecimal(99, 22, 16, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latEndho, lngEndho, 'presa', 'Presa Endhó',
            'Importante presa para abastecimiento de agua regional'
        ));
        
        // Presa La Esperanza: 20°06′24.290″N, 98°08′58.761″O
        const latEsperanza = 20 + 6/60 + 24.290/3600;
        const lngEsperanza = -(98 + 8/60 + 58.761/3600);
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latEsperanza, lngEsperanza, 'presa', 'Presa La Esperanza',
            'Presa ubicada en la región oriental de Hidalgo'
        ));
        
        // Presa El Cedral: 20°10′58″N, 98°44′46″O
        const latCedral = dmsADecimal(20, 10, 58, 'N');
        const lngCedral = dmsADecimal(98, 44, 46, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latCedral, lngCedral, 'presa', 'Presa El Cedral',
            'Presa para control hidrológico regional'
        ));
        
        // Presa Javier Rojo Gómez (La Peña): 20°21′24″N, 99°19′22″O
        const latLaPena = dmsADecimal(20, 21, 24, 'N');
        const lngLaPena = dmsADecimal(99, 19, 22, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latLaPena, lngLaPena, 'presa', 'Presa Javier Rojo Gómez (La Peña)',
            'Presa también conocida como La Peña'
        ));
        
        // Presa Vicente Aguirre (Las Golondrinas): 20.43194°N, -99.36778°O
        pinesAgregados.push(await agregarPinEnCoordenadas(
            20.43194, -99.36778, 'presa', 'Presa Vicente Aguirre (Las Golondrinas)',
            'Presa conocida también como Las Golondrinas'
        ));
        
        // Presa Zimapán (Ingeniero Fernando Hiriart Balderrama): 21°58′03″N, 98°33′47″O
        // Nota: Mismas coordenadas que Río Moctezuma ya que es donde nace de la presa
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latMoctezuma, lngMoctezuma, 'presa', 'Presa Zimapán (Ing. Fernando Hiriart Balderrama)',
            'Gran presa hidroeléctrica donde convergen los ríos Moctezuma y Tula'
        ));
        
        // OTROS CUERPOS ACUÁTICOS
        
        // Grutas de Tolantongo: 20°39′01″N, 98°59′58″O
        const latGrutas = dmsADecimal(20, 39, 1, 'N');
        const lngGrutas = dmsADecimal(98, 59, 58, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latGrutas, lngGrutas, 'lago', 'Grutas de Tolantongo',
            'Complejo de aguas termales y grutas naturales'
        ));
        
        // Río Tolantongo (asociado a grutas): 20°40′20″N, 98°56′10″O
        const latRioTolantongo = dmsADecimal(20, 40, 20, 'N');
        const lngRioTolantongo = dmsADecimal(98, 56, 10, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latRioTolantongo, lngRioTolantongo, 'rio', 'Río Tolantongo',
            'Río asociado al complejo de grutas de aguas termales'
        ));
        
        // Manantiales
        
        // Manantial de Pathe: 20°34'40.2"N, 99°41'34.4"W
        const latPathe = 20 + 34/60 + 40.2/3600;
        const lngPathe = -(99 + 41/60 + 34.4/3600);
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latPathe, lngPathe, 'manantial', 'Manantial de Pathe',
            'Manantial natural de agua dulce'
        ));
        
        // Manantial de Vito: 19°59′33″N, 99°12′04″O
        const latVito = dmsADecimal(19, 59, 33, 'N');
        const lngVito = dmsADecimal(99, 12, 4, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latVito, lngVito, 'manantial', 'Manantial de Vito',
            'Manantial ubicado en la región central'
        ));
        
        // Manantial de Dios Padre: 20°27′50″N, 99°11′50″O
        const latDiosPadre = dmsADecimal(20, 27, 50, 'N');
        const lngDiosPadre = dmsADecimal(99, 11, 50, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latDiosPadre, lngDiosPadre, 'manantial', 'Manantial de Dios Padre',
            'Manantial con nombre religioso tradicional'
        ));
        
        // Manantial de Ajacuba: 20°05′40″N, 99°07′28″O
        const latAjacuba = dmsADecimal(20, 5, 40, 'N');
        const lngAjacuba = dmsADecimal(99, 7, 28, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latAjacuba, lngAjacuba, 'manantial', 'Manantial de Ajacuba',
            'Manantial ubicado en el municipio de Ajacuba'
        ));
        
        // Manantial de Amajac (Santa María Amajac): 20°06′50″N, 98°44′50″O
        const latAmajacManantial = dmsADecimal(20, 6, 50, 'N');
        const lngAmajacManantial = dmsADecimal(98, 44, 50, 'W');
        pinesAgregados.push(await agregarPinEnCoordenadas(
            latAmajacManantial, lngAmajacManantial, 'manantial', 'Manantial de Amajac (Santa María Amajac)',
            'Manantial en la localidad de Santa María Amajac'
        ));
        
        console.log(`🎉 ${pinesAgregados.length} cuerpos de agua agregados exitosamente al mapa de Hidalgo`);
        
        mostrarMensajeConfirmacion(`${pinesAgregados.length} cuerpos de agua de Hidalgo agregados exitosamente al mapa`, 'agregar');
        
        return pinesAgregados;
        
    } catch (error) {
        console.error('💥 Error al agregar cuerpos de agua:', error);
        mostrarMensajeConfirmacion(`Error al agregar los cuerpos de agua: ${error.message}`, 'error');
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
