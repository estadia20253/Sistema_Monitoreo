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
                            
                            console.log(`💾 Pin ${pin.id} (${pin.nombre}): coordenadas desde localStorage - x:${coordenadas.x}%, y:${coordenadas.y}% -> lat:${coordenadas.lat}, lng:${coordenadas.lng}`);
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
        if (pin.lat === null || pin.lng === null || pin.lat === undefined || pin.lng === undefined) {
            pinesSinCoordenadas++;
            return;
        }            const lat = parseFloat(pin.lat);
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
    
    // Verificar que los filtros existan
    setTimeout(() => {
        diagnosticarFiltros();
        
        // Asegurar que los event listeners estén conectados
        const filtros = ['filtro-rios', 'filtro-lagos', 'filtro-presas'];
        filtros.forEach(filtroId => {
            const elemento = document.getElementById(filtroId);
            if (elemento) {
                elemento.addEventListener('change', () => {
                    console.log(`🔄 Filtro ${filtroId} cambió a: ${elemento.checked}`);
                    aplicarFiltros();
                });
            }
        });
    }, 500);
    
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
    console.log('🔍 Actualizando panel de detalles para pin:', pin);
    
    const detallesContent = document.getElementById('detalles-content');
    if (!detallesContent) {
        console.error('No se encontró el contenedor de detalles.');
        return;
    }
    
    // Determinar si el usuario es admin (verificando si existe el panel de admin)
    const adminPanel = document.querySelector('.admin-panel');
    const isAdmin = adminPanel !== null;
    
    console.log('🔍 Debug información:');
    console.log('   - Elemento admin-panel encontrado:', adminPanel);
    console.log('   - Usuario es admin:', isAdmin);
    console.log('   - Pin ID:', pin.id);
    console.log('   - Pin temporal_id:', pin.temporal_id);
    
    // Debugging adicional: verificar otros elementos admin
    const adminElements = document.querySelectorAll('[class*="admin"]');
    console.log('   - Elementos con clase "admin" encontrados:', adminElements.length);
    adminElements.forEach((el, i) => {
        console.log(`     ${i + 1}. ${el.className}`);
    });
    
    // Método alternativo: verificar por variables globales o elementos del DOM
    let isAdminAlternative = false;
    
    // Verificar si hay botones de admin
    const adminButtons = document.querySelector('#btn-agregar-pin-coordenadas, #btn-agregar-pin-manual, #btn-editar-pines');
    if (adminButtons) {
        isAdminAlternative = true;
        console.log('   - Admin detectado por botones de control');
    }
    
    // Verificar por clases CSS del contenedor
    const mapContainer = document.getElementById('map-container');
    if (mapContainer && mapContainer.classList.contains('admin-view')) {
        isAdminAlternative = true;
        console.log('   - Admin detectado por clase admin-view');
    }
    
    // Usar el método que funcione
    const finalIsAdmin = isAdmin || isAdminAlternative;
    console.log('   - Admin final (combinado):', finalIsAdmin);
    
    const adminImagePanel = finalIsAdmin ? `
        <div class="admin-imagenes-panel" style="margin-top:20px; padding: 15px; border: 2px solid #3498db; border-radius: 8px; background-color: #f8f9fa;">
            <h4>📷 Subir imagen para análisis de <strong>${pin.nombre}</strong></h4>
            <form id="form-subir-imagen" enctype="multipart/form-data">
                <input type="file" name="imagen" accept="image/*" required style="margin-bottom: 10px;">
                <input type="hidden" name="pin_id" value="${pin.id || pin.temporal_id || ''}">
                <button type="submit" class="btn btn-primary" style="width: 100%;">Subir imagen</button>
            </form>
            <div id="imagenes-analisis" style="margin-top: 15px;"></div>
        </div>
    ` : '';

    // Panel de controles de administrador
    const adminControlsPanel = finalIsAdmin ? `
        <div class="admin-controls-panel" style="margin-top:15px; padding: 15px; border: 2px solid #e74c3c; border-radius: 8px; background-color: #fff5f5;">
            <h4>🔧 Controles de Administrador</h4>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button onclick="editarPin(${pin.id})" class="btn btn-warning" style="flex: 1; padding: 8px;">
                    ✏️ Editar Pin
                </button>
                <button onclick="eliminarPin(${pin.id})" class="btn btn-danger" style="flex: 1; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🗑️ Eliminar Pin
                </button>
            </div>
        </div>
    ` : '';

    // Panel de imágenes para usuario regular
    const userImagePanel = !finalIsAdmin ? `
        <div class="user-imagenes-panel" style="margin-top:20px; padding: 15px; border: 2px solid #27ae60; border-radius: 8px; background-color: #f8f9fa;">
            <h4>📷 Imágenes del ecosistema <strong>${pin.nombre}</strong></h4>
            <div id="imagenes-usuario"></div>
        </div>
    ` : '';
    
    console.log('📝 Generando HTML para panel admin:', !!adminImagePanel);
    console.log('📝 Generando HTML para panel usuario:', !!userImagePanel);
    
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
            ${adminControlsPanel}
            ${adminImagePanel}
            ${userImagePanel}
        </div>
    `;
    
    // Configurar eventos para el formulario de subida de imágenes si es admin
    if (finalIsAdmin) {
        const form = document.getElementById('form-subir-imagen');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const formData = new FormData(form);
                
                // Si no hay pin.id, usar temporal_id o generar uno
                if (!formData.get('pin_id') || formData.get('pin_id') === '') {
                    formData.set('pin_id', pin.temporal_id || 'temp_' + Date.now());
                }
                
                try {
                    console.log('📤 Enviando imagen para pin:', formData.get('pin_id'));
                    const res = await fetch('/api/imagenes', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    
                    if (data.url) {
                        alert(`✅ Imagen subida y analizada correctamente para ${pin.nombre}\n\n🌊 Porcentaje de agua: ${data.porcentaje_agua?.toFixed(2)}%\n🔬 Estado: ${data.contaminacion}`);
                        if (pin.id) {
                            cargarImagenesAnalisis(pin.id);
                        }
                        form.reset(); // Limpiar el formulario
                    } else {
                        alert('❌ Error al subir imagen: ' + (data.error || 'Error desconocido'));
                    }
                } catch (error) {
                    console.error('❌ Error:', error);
                    alert('❌ Error al subir imagen: ' + error.message);
                }
            });
            
            // Cargar imágenes existentes para este pin si tiene ID
            if (pin.id) {
                cargarImagenesAnalisis(pin.id);
            }
        } else {
            console.error('❌ No se encontró el formulario de subida de imágenes');
        }
    }
    
    // Para usuarios regulares, cargar imágenes de solo lectura
    if (!finalIsAdmin && pin.id) {
        cargarImagenesUsuario(pin.id);
    }
}

// Función para aplicar filtros
function aplicarFiltros() {
    const filtroRios = document.getElementById('filtro-rios')?.checked ?? true;
    const filtroLagos = document.getElementById('filtro-lagos')?.checked ?? true;
    const filtroPresas = document.getElementById('filtro-presas')?.checked ?? true;
    
    console.log('🔍 Aplicando filtros:', { filtroRios, filtroLagos, filtroPresas });
    console.log(`📍 Total markers disponibles: ${markers.length}`);
    
    let conteoVisible = 0;
    let conteoOculto = 0;
    
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
            default:
                // Para otros tipos de pines, mostrar por defecto
                visible = true;
                break;
        }
        
        marker.setVisible(visible);
        
        if (visible) {
            conteoVisible++;
        } else {
            conteoOculto++;
        }
    });
    
    console.log(`✅ Filtros aplicados: ${conteoVisible} visibles, ${conteoOculto} ocultos`);
}

// Función de diagnóstico para filtros
function diagnosticarFiltros() {
    console.log('🔧 Diagnóstico de filtros:');
    
    // Verificar que los elementos existen
    const elementos = {
        'filtro-rios': document.getElementById('filtro-rios'),
        'filtro-lagos': document.getElementById('filtro-lagos'), 
        'filtro-presas': document.getElementById('filtro-presas')
    };
    
    Object.entries(elementos).forEach(([id, elemento]) => {
        if (elemento) {
            console.log(`✅ ${id}: encontrado, checked = ${elemento.checked}`);
        } else {
            console.log(`❌ ${id}: NO encontrado`);
        }
    });
    
    // Verificar markers
    console.log(`📍 Total markers: ${markers.length}`);
    const tiposEncontrados = {};
    markers.forEach(marker => {
        const tipo = marker.pinData?.tipo || 'sin-tipo';
        tiposEncontrados[tipo] = (tiposEncontrados[tipo] || 0) + 1;
    });
    
    console.log('📊 Tipos de pines encontrados:', tiposEncontrados);
}

// Función para mostrar botón agregar pin
function mostrarBotonAgregarPin() {
    // Implementación futura para mostrar controles adicionales de admin
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
    // Implementación futura para sincronizar lista de pines en UI
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

// Función para actualizar estadísticas (para vista de administrador)
function actualizarEstadisticas() {
    // Contar pines por tipo
    let totalRios = 0;
    let totalLagos = 0;
    let totalPresas = 0;
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
            }
        }
    });

    // Actualizar elementos de estadísticas (solo si existen - vista admin)
    const totalPinesEl = document.getElementById('total-pines');
    const totalRiosEl = document.getElementById('total-rios');
    const totalLagosEl = document.getElementById('total-lagos');
    const totalPresasEl = document.getElementById('total-presas');
    const totalPinesUserEl = document.getElementById('total-pines-user');

    if (totalPinesEl) totalPinesEl.textContent = totalGeneral;
    if (totalRiosEl) totalRiosEl.textContent = totalRios;
    if (totalLagosEl) totalLagosEl.textContent = totalLagos;
    if (totalPresasEl) totalPresasEl.textContent = totalPresas;
    if (totalPinesUserEl) totalPinesUserEl.textContent = totalGeneral;

    console.log(`📊 Estadísticas actualizadas: Total: ${totalGeneral}, Ríos: ${totalRios}, Lagos: ${totalLagos}, Presas: ${totalPresas}`);
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

// Función para cargar imágenes y análisis (admin)
async function cargarImagenesAnalisis(pinId) {
    try {
        console.log(`🔍 Cargando imágenes para pin ID: ${pinId}`); // Debug log
        const res = await fetch(`/api/imagenes/${pinId}`);
        console.log(`📡 Respuesta del servidor:`, res.status); // Debug log
        const imagenes = await res.json();
        console.log(`📷 Imágenes encontradas:`, imagenes); // Debug log
        const cont = document.getElementById('imagenes-analisis');
        
        if (cont) {
            if (imagenes && imagenes.length > 0) {
                cont.innerHTML = `
                    <div style="display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 15px; overflow-x: auto; padding: 10px 0; width: 100%; box-sizing: border-box;">
                        ${imagenes.map(img => `
                            <div class="imagen-card" data-imagen-id="${img.id}" style="flex: 0 0 auto !important; min-width: 250px; max-width: 300px; width: 280px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: white; box-sizing: border-box; display: inline-block !important; position: relative; cursor: pointer;">
                                <img src="${img.url}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 5px; display: block;" alt="Imagen de análisis">
                                <div style="margin-top: 8px; font-size: 14px;">
                                    <div><strong>🌊 Porcentaje agua:</strong> ${img.porcentaje_agua ? img.porcentaje_agua.toFixed(2) : 'N/A'}%</div>
                                    <div><strong>🔬 Contaminación:</strong> ${img.contaminacion_detectada || 'N/A'}</div>
                                    <div><strong>📅 Fecha:</strong> ${new Date(img.fecha_subida).toLocaleDateString()}</div>
                                </div>
                                <div class="imagen-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); color: white; display: none; align-items: center; justify-content: center; border-radius: 5px;">
                                    <button onclick="eliminarImagen(${img.id}, ${pinId}, event)" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px;">
                                        🗑️ Eliminar imagen
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                // Mensaje de cambio de nivel de agua si hay más de una imagen
                if (imagenes.length >= 2) {
                    const cambio = imagenes[0].porcentaje_agua - imagenes[1].porcentaje_agua;
                    const cambioHTML = `
                        <div style="padding: 10px; background-color: ${cambio > 0 ? '#d4edda' : '#f8d7da'}; border-radius: 5px; margin-top: 10px;">
                            <strong>📊 Análisis temporal:</strong> 
                            ${cambio > 0 ? 'Aumento' : 'Disminución'} de ${Math.abs(cambio).toFixed(2)}% en el nivel de agua
                        </div>
                    `;
                    cont.innerHTML += cambioHTML;
                }
                
                // Agregar event listeners para mostrar/ocultar overlay de eliminación
                const imageCards = cont.querySelectorAll('.imagen-card');
                imageCards.forEach(card => {
                    const overlay = card.querySelector('.imagen-overlay');
                    
                    card.addEventListener('click', function(e) {
                        e.stopPropagation();
                        // Ocultar todos los overlays primero
                        imageCards.forEach(otherCard => {
                            const otherOverlay = otherCard.querySelector('.imagen-overlay');
                            if (otherOverlay !== overlay) {
                                otherOverlay.style.display = 'none';
                            }
                        });
                        
                        // Toggle del overlay actual
                        if (overlay.style.display === 'flex') {
                            overlay.style.display = 'none';
                        } else {
                            overlay.style.display = 'flex';
                        }
                    });
                });
                
                // Cerrar overlays al hacer clic fuera
                document.addEventListener('click', function() {
                    imageCards.forEach(card => {
                        const overlay = card.querySelector('.imagen-overlay');
                        overlay.style.display = 'none';
                    });
                });
            } else {
                cont.innerHTML = '<p style="color: #666; font-style: italic;">No hay imágenes disponibles para este pin.</p>';
            }
        }
    } catch (error) {
        console.error('Error al cargar imágenes:', error);
        const cont = document.getElementById('imagenes-analisis');
        if (cont) {
            cont.innerHTML = '<p style="color: #e74c3c;">Error al cargar las imágenes.</p>';
        }
    }
}

// Función para cargar imágenes (usuario regular - solo lectura)
async function cargarImagenesUsuario(pinId) {
    try {
        console.log(`👤 Cargando imágenes de usuario para pin ID: ${pinId}`); // Debug log
        const res = await fetch(`/api/imagenes/${pinId}`);
        console.log(`👤 Respuesta del servidor:`, res.status); // Debug log
        const imagenes = await res.json();
        console.log(`👤 Imágenes de usuario encontradas:`, imagenes); // Debug log
        const cont = document.getElementById('imagenes-usuario');
        
        if (cont) {
            if (imagenes && imagenes.length > 0) {
                cont.innerHTML = `
                    <div style="display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 15px; overflow-x: auto; padding: 10px 0; width: 100%; box-sizing: border-box;">
                        ${imagenes.map(img => `
                            <div class="imagen-card-user" style="flex: 0 0 auto !important; min-width: 250px; max-width: 300px; width: 280px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: white; box-sizing: border-box; display: inline-block !important; position: relative; cursor: pointer;">
                                <img src="${img.url}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 5px; display: block;" alt="Imagen del ecosistema">
                                <div style="margin-top: 8px; font-size: 14px;">
                                    <div><strong>🌊 Nivel de agua:</strong> ${img.porcentaje_agua ? img.porcentaje_agua.toFixed(2) : 'N/A'}%</div>
                                    <div><strong>🔬 Estado:</strong> ${img.contaminacion_detectada || 'N/A'}</div>
                                    <div><strong>📅 Fecha:</strong> ${new Date(img.fecha_subida).toLocaleDateString()}</div>
                                </div>
                                <div class="imagen-info-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); color: white; display: none; align-items: center; justify-content: center; border-radius: 5px; text-align: center; padding: 20px;">
                                    <div>
                                        <h4 style="margin: 0 0 10px 0;">📊 Información detallada</h4>
                                        <p style="margin: 5px 0;"><strong>🌊 Nivel de agua:</strong> ${img.porcentaje_agua ? img.porcentaje_agua.toFixed(2) : 'N/A'}%</p>
                                        <p style="margin: 5px 0;"><strong>🔬 Estado:</strong> ${img.contaminacion_detectada || 'No detectada'}</p>
                                        <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> ${new Date(img.fecha_subida).toLocaleDateString()}</p>
                                        <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">Haz clic para cerrar</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                // Agregar event listeners para mostrar/ocultar información detallada
                const imageCards = cont.querySelectorAll('.imagen-card-user');
                imageCards.forEach(card => {
                    const overlay = card.querySelector('.imagen-info-overlay');
                    
                    card.addEventListener('click', function(e) {
                        e.stopPropagation();
                        // Ocultar todos los overlays primero
                        imageCards.forEach(otherCard => {
                            const otherOverlay = otherCard.querySelector('.imagen-info-overlay');
                            if (otherOverlay !== overlay) {
                                otherOverlay.style.display = 'none';
                            }
                        });
                        
                        // Toggle del overlay actual
                        if (overlay.style.display === 'flex') {
                            overlay.style.display = 'none';
                        } else {
                            overlay.style.display = 'flex';
                        }
                    });
                });
                
                // Cerrar overlays al hacer clic fuera
                document.addEventListener('click', function() {
                    imageCards.forEach(card => {
                        const overlay = card.querySelector('.imagen-info-overlay');
                        overlay.style.display = 'none';
                    });
                });
            } else {
                cont.innerHTML = '<p style="color: #666; font-style: italic;">No hay imágenes disponibles para este ecosistema.</p>';
            }
        }
    } catch (error) {
        console.error('Error al cargar imágenes para usuario:', error);
        const cont = document.getElementById('imagenes-usuario');
        if (cont) {
            cont.innerHTML = '<p style="color: #e74c3c;">Error al cargar las imágenes.</p>';
        }
    }
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
        
        console.log('Panel de detalles cerrado');
    }
}

// Función para eliminar imagen
async function eliminarImagen(imagenId, pinId, event) {
    // Detener la propagación del evento para evitar cerrar el overlay
    if (event) {
        event.stopPropagation();
    }
    
    // Confirmación del usuario
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?\n\nEsta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        console.log(`🗑️ Eliminando imagen ID: ${imagenId} del pin ID: ${pinId}`);
        
        // Mostrar indicador de carga
        const imagenCard = document.querySelector(`[data-imagen-id="${imagenId}"]`);
        if (imagenCard) {
            imagenCard.style.opacity = '0.5';
            imagenCard.style.pointerEvents = 'none';
        }
        
        // Realizar petición DELETE al servidor
        const response = await fetch(`/api/imagenes/${imagenId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Imagen eliminada del servidor:', data);
        
        // Mostrar mensaje de éxito
        mostrarMensajeConfirmacion(`✅ Imagen eliminada correctamente`, 'agregar');
        
        // Recargar las imágenes para actualizar la vista
        setTimeout(() => {
            cargarImagenesAnalisis(pinId);
        }, 500);
        
    } catch (error) {
        console.error('❌ Error al eliminar imagen:', error);
        
        // Restaurar estado visual en caso de error
        const imagenCard = document.querySelector(`[data-imagen-id="${imagenId}"]`);
        if (imagenCard) {
            imagenCard.style.opacity = '1';
            imagenCard.style.pointerEvents = 'auto';
        }
        
        // Mostrar mensaje de error
        mostrarMensajeConfirmacion(`❌ Error al eliminar imagen: ${error.message}`, 'error');
    }
}

// =================== FUNCIONES DE UTILIDAD GLOBAL ===================

// Función global para diagnosticar filtros desde la consola
window.debugFiltros = function() {
    console.log('🔧 === DEBUG DE FILTROS ===');
    diagnosticarFiltros();
    aplicarFiltros();
    console.log('🔧 === FIN DEBUG ===');
};

// Función global para forzar recarga de filtros
window.recargarFiltros = function() {
    console.log('🔄 Recargando filtros...');
    
    // Desmarcar y marcar todos los filtros para forzar recarga
    const filtros = ['filtro-rios', 'filtro-lagos', 'filtro-presas'];
    
    filtros.forEach(filtroId => {
        const elemento = document.getElementById(filtroId);
        if (elemento) {
            const estadoOriginal = elemento.checked;
            elemento.checked = false;
            elemento.checked = estadoOriginal;
        }
    });
    
    aplicarFiltros();
    console.log('✅ Filtros recargados');
};
