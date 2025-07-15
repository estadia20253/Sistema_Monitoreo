let pinesData = [];
let resizeTimeout;

// Variables para el modo de ediciÃ³n de pines
let modoEdicion = false;
let pinEditando = null;

// Variables para filtros
let filtrosActivos = {
    rio: true,
    lago: true,
    presa: true
};

// Variables para Google Maps
let googleMap = null;
let googleMarkers = [];
let infoWindow = null;

// ConfiguraciÃ³n del mapa de Hidalgo - Coordenadas geogrÃ¡ficas reales
const HIDALGO_MAP_CONFIG = {
    bounds: {
        north: 21.4,    // Latitud norte
        south: 19.6,    // Latitud sur
        east: -97.8,    // Longitud este
        west: -99.8     // Longitud oeste
    },
    center: {
        lat: 20.5,      // Latitud central
        lng: -98.8      // Longitud central
    },
    image: {
        width: 384,     // Ancho de la imagen
        height: 384     // Alto de la imagen
    }
};

/**
 * Convierte coordenadas geogrÃ¡ficas (lat, lng) a posiciÃ³n en porcentaje en la imagen
 */
function coordenadasGeograficasAPorcentaje(lat, lng) {
    const { bounds } = HIDALGO_MAP_CONFIG;
    
    // Calcular porcentaje de posiciÃ³n
    const latPercent = ((lat - bounds.south) / (bounds.north - bounds.south)) * 100;
    const lngPercent = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100;
    
    return {
        x: parseFloat(lngPercent.toFixed(2)),
        y: parseFloat((100 - latPercent).toFixed(2)) // Invertir Y porque en CSS Y=0 estÃ¡ arriba
    };
}

/**
 * Convierte posiciÃ³n en porcentaje a coordenadas geogrÃ¡ficas
 */
function porcentajeACoordenasGeograficas(xPercent, yPercent) {
    const { bounds } = HIDALGO_MAP_CONFIG;
    
    // Convertir porcentajes a coordenadas geogrÃ¡ficas
    const lng = bounds.west + (xPercent / 100) * (bounds.east - bounds.west);
    const lat = bounds.south + ((100 - yPercent) / 100) * (bounds.north - bounds.south);
    
    return {
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
    };
}

document.addEventListener('DOMContentLoaded', function() {
    // Agregar estilos CSS para pines temporales
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
        }
        .pin-temporal {
            position: relative;
        }
        .pin-temporal::after {
            content: 'â³';
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 10px;
            background: #f39c12;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    `;
    document.head.appendChild(style);
    
    cargarMapa();
    
    // Manejar redimensionamiento de ventana
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(reposicionarPines, 100);
    });
    
    // Permitir cerrar detalles con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const detallesContainer = document.getElementById('detalles-container');
            if (detallesContainer && detallesContainer.classList.contains('detalles-visible')) {
                cerrarDetalles();
            }
        }
    });
    
    // Agregar listener para clics en el mapa (modo ediciÃ³n)
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
        mapContainer.addEventListener('click', manejarClicMapa);
    }
});

function mostrarPines() {
    const pinesContainer = document.getElementById('pines-container');
    const mapaImagen = document.getElementById('mapa-imagen');

    if (!pinesContainer || !mapaImagen) {
        console.error('No se encontraron los elementos necesarios para mostrar los pines.');
        return;
    }

    pinesContainer.innerHTML = '';

    if (pinesData.length > 0) {
        pinesData.forEach(pin => {
            // Solo mostrar pines que tienen coordenadas
            if (pin.x === null || pin.y === null) {
                return; // Saltar pines sin posicionar
            }
            
            const pinElement = document.createElement('div');
            pinElement.className = `pin pin-${pin.tipo}`;
            pinElement.setAttribute('data-pin-id', pin.id);
            pinElement.setAttribute('data-pin-tipo', pin.tipo);
            
            // Agregar clase especial para pines temporales
            if (pin.temporal) {
                pinElement.classList.add('pin-temporal');
                // Agregar estilo dinÃ¡mico para pines temporales
                pinElement.style.border = '2px dashed #f39c12';
                pinElement.style.animation = 'pulse 2s infinite';
            }

            // Posicionar pines basÃ¡ndose en porcentajes relativos a la imagen del mapa
            // Esto asegura que se muevan junto con el mapa
            pinElement.style.left = `${pin.x}%`;
            pinElement.style.top = `${pin.y}%`;
            pinElement.style.position = 'absolute';

            pinElement.innerHTML = `
                <div class="pin-icon ${pin.tipo}">${getIconoPorTipo(pin.tipo)}</div>
                <div class="pin-tooltip hidden">${pin.nombre}${pin.temporal ? ' â³' : ''}</div>
            `;

            pinElement.addEventListener('click', () => {
                mostrarDetallesPin(pin);
            });

            pinElement.addEventListener('mouseenter', () => {
                mostrarTooltip(pinElement);
            });

            pinElement.addEventListener('mouseleave', () => {
                ocultarTooltip(pinElement);
            });

            pinesContainer.appendChild(pinElement);
        });
        
        // Aplicar filtros despuÃ©s de crear todos los pines
        setTimeout(() => {
            aplicarFiltros();
        }, 100);
        
        // Mostrar botones despuÃ©s de crear los pines
        mostrarBotonAgregarPin();
    } else {
        // Mostrar botÃ³n agregar incluso si no hay pines
        mostrarBotonAgregarPin();
    }
}

function mostrarDetallesPin(pin) {
    console.log('Mostrando detalles para:', pin.nombre);

    const mapContainer = document.getElementById('map-container');
    const detallesContainer = document.getElementById('detalles-container');
    
    if (mapContainer && detallesContainer) {
        // Resaltar el pin seleccionado
        const pinActivo = document.querySelector('.pin.activo');
        if (pinActivo) {
            pinActivo.classList.remove('activo');
        }
        
        const pinSeleccionado = document.querySelector(`[data-pin-id="${pin.id}"]`);
        if (pinSeleccionado) {
            pinSeleccionado.classList.add('activo');
        }

        // Animar la transiciÃ³n - El mapa y los pines se moverÃ¡n juntos
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
        console.error('No se encontrÃ³ el contenedor de detalles.');
        return;
    }
    
    detallesContent.innerHTML = `
        <div class="detalle-header">
            <div class="detalle-icono">${getIconoPorTipo(pin.tipo)}</div>
            <h3>${pin.nombre}</h3>
            <button class="btn-cerrar" onclick="cerrarDetalles()" title="Cerrar detalles (Esc)">Ã—</button>
        </div>
        
        <div class="detalle-info">
            <div class="info-item">
                <label>DescripciÃ³n:</label>
                <p>${pin.descripcion}</p>
            </div>
            
            <div class="info-item">
                <label>Tipo de Ecosistema:</label>
                <span class="tipo-${pin.tipo}">${pin.tipo.charAt(0).toUpperCase() + pin.tipo.slice(1)}</span>
            </div>
            
            <div class="info-item">
                <label>UbicaciÃ³n en el Mapa:</label>
                <span>Coordenadas: ${pin.x}%, ${pin.y}%</span>
            </div>
            
            <div class="info-item">
                <label>Estado:</label>
                <span class="estado-activo">Registrado</span>
            </div>
            
            <div class="info-adicional">
                <p><strong>InformaciÃ³n:</strong> Este punto representa la ubicaciÃ³n geogrÃ¡fica relativa del ${pin.tipo} ${pin.nombre} en el mapa de ecosistemas acuÃ¡ticos del estado de Hidalgo.</p>
            </div>
        </div>
        
        <div class="botones-accion">
            <button class="btn-cerrar-mobile" onclick="cerrarDetalles()">
                â† Volver al Mapa
            </button>
        </div>
    `;
}

function getIconoPorTipo(tipo) {
    const iconos = {
        rio: 'ðŸŒŠ',
        lago: 'ï¿½',    // Ola mÃ¡s distintiva
        presa: 'âš¡'    // Rayo para energÃ­a/presa
    };
    return iconos[tipo] || 'ðŸ“';
}

function mostrarTooltip(pinElement) {
    const tooltip = pinElement.querySelector('.pin-tooltip');
    if (tooltip) {
        tooltip.classList.remove('hidden');
        tooltip.classList.add('visible');
    }
}

function ocultarTooltip(pinElement) {
    const tooltip = pinElement.querySelector('.pin-tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
        tooltip.classList.add('hidden');
    }
}

function reposicionarPines() {
    // FunciÃ³n para reposicionar los pines cuando cambia el tamaÃ±o de la ventana
    if (pinesData.length > 0) {
        mostrarPines();
    }
}

// Función de inicialización de Google Maps (llamada desde el callback de la API)
function initMap() {
    console.log('Inicializando Google Maps...');
    
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

    // Crear el mapa
    googleMap = new google.maps.Map(document.getElementById('google-map'), mapOptions);
    
    // Crear InfoWindow para mostrar información de los pines
    infoWindow = new google.maps.InfoWindow();
    
    // Ocultar loading y mostrar el mapa
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
    
    console.log('Google Maps inicializado correctamente');
    
    // Cargar los pines después de inicializar el mapa
    cargarPines();
    
    // Agregar listener para el modo edición
    if (googleMap) {
        googleMap.addListener('click', function(e) {
            if (modoEdicion) {
                manejarClicGoogleMaps(e);
            }
        });
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

function cargarPines() {
    fetch('/api/pines')
        .then(response => response.json())
        .then(data => {
            console.log('ðŸ“ Pines cargados desde servidor:', data);
            
            // Procesar cada pin para determinar coordenadas
            pinesData = data.map(pin => {
                let coordenadas = { x: null, y: null, lat: null, lng: null };
                
                // Prioridad 1: Coordenadas geogrÃ¡ficas desde la base de datos
                if (pin.latitud !== null && pin.latitud !== undefined && pin.longitud !== null && pin.longitud !== undefined) {
                    coordenadas.lat = parseFloat(pin.latitud);
                    coordenadas.lng = parseFloat(pin.longitud);
                    
                    // Convertir coordenadas geogrÃ¡ficas a posiciÃ³n en el mapa (porcentajes)
                    const posicionMapa = coordenadasGeograficasAPorcentaje(coordenadas.lat, coordenadas.lng);
                    coordenadas.x = posicionMapa.x;
                    coordenadas.y = posicionMapa.y;
                    
                    console.log(`âœ… Pin ${pin.id} (${pin.nombre}): coordenadas geogrÃ¡ficas desde BD - lat:${coordenadas.lat}, lng:${coordenadas.lng} -> mapa x:${coordenadas.x}%, y:${coordenadas.y}%`);
                } else {
                    // Prioridad 2: Coordenadas desde localStorage como respaldo (formato antiguo)
                    const coordenadasGuardadas = localStorage.getItem(`pin_coords_${pin.id}`);
                    if (coordenadasGuardadas) {
                        try {
                            const coords = JSON.parse(coordenadasGuardadas);
                            coordenadas.x = coords.x;
                            coordenadas.y = coords.y;
                            
                            // Si tenemos coordenadas de porcentaje, convertir a geogrÃ¡ficas
                            if (coordenadas.x !== null && coordenadas.y !== null) {
                                const coordsGeo = porcentajeACoordenasGeograficas(coordenadas.x, coordenadas.y);
                                coordenadas.lat = coordsGeo.lat;
                                coordenadas.lng = coordsGeo.lng;
                            }
                            
                            console.log(`ðŸ”„ Pin ${pin.id} (${pin.nombre}): coordenadas desde localStorage - x:${coordenadas.x}%, y:${coordenadas.y}% -> lat:${coordenadas.lat}, lng:${coordenadas.lng}`);
                        } catch (error) {
                            console.error(`âŒ Error parseando coordenadas localStorage para pin ${pin.id}:`, error);
                        }
                    } else {
                        console.log(`âš ï¸ Pin ${pin.id} (${pin.nombre}): sin coordenadas en BD ni localStorage`);
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
            
            console.log('ðŸ“ Pines procesados con coordenadas geogrÃ¡ficas:', pinesData);
            mostrarPines();
        })
        .catch(error => {
            console.error('Error al cargar pines:', error);
        });
}

function mostrarError(mensaje) {
    const loading = document.getElementById('loading');
    loading.innerHTML = `
        <div style="color: red; padding: 20px; text-align: center; background: #fff; border-radius: 10px;">
            <h3>âŒ ${mensaje}</h3>
            <button onclick="cargarMapa()" style="margin-top: 10px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Reintentar
            </button>
        </div>
    `;
}

function cerrarDetalles() {
    const mapContainer = document.getElementById('map-container');
    const detallesContainer = document.getElementById('detalles-container');
    
    if (mapContainer && detallesContainer) {
        // Remover pin activo
        const pinActivo = document.querySelector('.pin.activo');
        if (pinActivo) {
            pinActivo.classList.remove('activo');
        }

        // Restaurar estado original
        mapContainer.classList.remove('mapa-deslizado');
        detallesContainer.classList.remove('detalles-visible');
    } else {
        console.error('No se encontraron los contenedores necesarios para cerrar los detalles.');
    }
}

// FunciÃ³n para activar/desactivar el modo de ediciÃ³n
function toggleModoEdicion() {
    modoEdicion = !modoEdicion;
    const botonEdicion = document.getElementById('btn-editar-pines');
    const mapaContainer = document.getElementById('map-container');
    
    if (modoEdicion) {
        botonEdicion.textContent = 'Salir del Modo EdiciÃ³n';
        botonEdicion.style.background = '#e74c3c';
        mapaContainer.style.cursor = 'crosshair';
        mostrarInstruccionesEdicion();
    } else {
        botonEdicion.textContent = 'Editar Posiciones';
        botonEdicion.style.background = '#3498db';
        mapaContainer.style.cursor = 'default';
        ocultarInstruccionesEdicion();
        pinEditando = null;
    }
}

// FunciÃ³n para manejar clics en el mapa para reposicionar pines
function manejarClicMapa(event) {
    if (!modoEdicion) return;
    
    // Evitar que el clic en un pin active la reposiciÃ³n
    if (event.target.closest('.pin')) return;
    
    const mapWrapper = document.querySelector('.map-wrapper');
    const mapaImagen = document.getElementById('mapa-imagen');
    
    if (!mapWrapper || !mapaImagen) {
        console.log('No se encontraron elementos del mapa');
        return;
    }
    
    // Obtener las coordenadas relativas al contenedor de la imagen
    const rect = mapWrapper.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Log detallado para debug
    console.log('Datos del clic:', {
        clientX: event.clientX,
        clientY: event.clientY,
        rectLeft: rect.left,
        rectTop: rect.top,
        rectWidth: rect.width,
        rectHeight: rect.height,
        coordenadaX: x,
        coordenadaY: y
    });
    
    if (pinEditando) {
        // Actualizar posiciÃ³n del pin directamente con las coordenadas del clic
        actualizarPosicionPin(pinEditando, x, y);
    } else {
        console.log(`Coordenadas disponibles para posicionamiento: ${x.toFixed(2)}%, ${y.toFixed(2)}%`);
        alert(`Primero selecciona un pin de la lista para editar.\nCoordenadas del clic: ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
    }
}

// FunciÃ³n para actualizar la posiciÃ³n de un pin
function actualizarPosicionPin(pin, newX, newY) {
    // Asegurar que las coordenadas estÃ©n dentro de lÃ­mites vÃ¡lidos
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));
    
    // Actualizar datos en memoria
    pin.x = clampedX;
    pin.y = clampedY;
    
    // Convertir coordenadas de porcentaje a coordenadas geogrÃ¡ficas
    const coordenadasGeograficas = porcentajeACoordenasGeograficas(clampedX, clampedY);
    pin.lat = coordenadasGeograficas.lat;
    pin.lng = coordenadasGeograficas.lng;
    pin.latitud = coordenadasGeograficas.lat;
    pin.longitud = coordenadasGeograficas.lng;
    
    // Quitar flags de sin posicionar
    if (pin.sinPosicionar) {
        delete pin.sinPosicionar;
    }
    
    // Si no es un pin temporal, guardar inmediatamente en la base de datos
    if (!pin.temporal && pin.id) {
        guardarNuevaPosicionPin(pin, coordenadasGeograficas.lat, coordenadasGeograficas.lng);
    }
    
    // Mostrar mensaje apropiado segÃºn el tipo de pin
    if (pin.temporal) {
        mostrarMensajeConfirmacion(`Pin temporal "${pin.nombre}" posicionado. Usa "Guardar Cambios" para guardarlo en la base de datos.`, 'temporal');
    } else {
        mostrarMensajeConfirmacion(`Pin "${pin.nombre}" reposicionado y guardado en la base de datos.`, 'agregar');
    }
    
    // Reposicionar pines visualmente
    mostrarPines();
    
    // Mostrar informaciÃ³n de la nueva posiciÃ³n
    console.log(`${pin.nombre} posicionado en:`);
    console.log(`  - Mapa: ${clampedX.toFixed(2)}%, ${clampedY.toFixed(2)}%`);
    console.log(`  - GeogrÃ¡ficas: lat:${coordenadasGeograficas.lat}, lng:${coordenadasGeograficas.lng}`);
    
    // Limpiar pin seleccionado
    pinEditando = null;
    actualizarListaPines();
}

// FunciÃ³n para guardar nueva posiciÃ³n de pin en la base de datos
async function guardarNuevaPosicionPin(pin, latitud, longitud) {
    try {
        console.log(`ðŸ”„ Guardando nueva posiciÃ³n del pin "${pin.nombre}" en la base de datos...`);
        
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
        console.log(`âœ… PosiciÃ³n del pin "${pin.nombre}" actualizada en la base de datos`);
        
        // Actualizar localStorage como respaldo
        const coordenadasLocales = {
            x: pin.x,
            y: pin.y,
            lat: latitud,
            lng: longitud
        };
        localStorage.setItem(`pin_coords_${pin.id}`, JSON.stringify(coordenadasLocales));
        console.log(`ðŸ’¾ Coordenadas actualizadas en localStorage para pin ID ${pin.id}`);
        
    } catch (error) {
        console.error(`âŒ Error guardando posiciÃ³n del pin "${pin.nombre}":`, error);
        mostrarMensajeConfirmacion(`Error al guardar la nueva posiciÃ³n del pin "${pin.nombre}". IntÃ©ntalo de nuevo.`, 'error');
    }
}

// FunciÃ³n para mostrar instrucciones de ediciÃ³n
function mostrarInstruccionesEdicion() {
    const instrucciones = document.createElement('div');
    instrucciones.id = 'instrucciones-edicion';
    instrucciones.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 15px; border-radius: 8px; z-index: 1000; max-width: 300px;">
            <h4 style="margin: 0 0 10px 0;">Modo de EdiciÃ³n Activo</h4>
            <p style="margin: 5px 0;">1. Haz clic en un pin para seleccionarlo</p>
            <p style="margin: 5px 0;">2. Haz clic en el mapa para reposicionarlo</p>
            <p style="margin: 5px 0;">3. Usa "Guardar Cambios" cuando termines</p>
        </div>
    `;
    document.body.appendChild(instrucciones);
}

// FunciÃ³n para ocultar instrucciones de ediciÃ³n
function ocultarInstruccionesEdicion() {
    const instrucciones = document.getElementById('instrucciones-edicion');
    if (instrucciones) {
        instrucciones.remove();
    }
}

// FunciÃ³n para mostrar lista de pines editables
function mostrarListaPines() {
    const listaPines = document.createElement('div');
    listaPines.id = 'lista-pines-edicion';
    listaPines.innerHTML = `
        <div style="position: fixed; top: 120px; right: 20px; background: white; border: 1px solid #ddd; border-radius: 8px; z-index: 1000; max-width: 350px; max-height: 400px; overflow-y: auto;">
            <div style="padding: 15px; border-bottom: 1px solid #eee; background: #f8f9fa;">
                <h4 style="margin: 0;">Seleccionar Pin para Editar</h4>
                <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;">
                    Los pines marcados con âš ï¸ necesitan ser posicionados
                </p>
            </div>
            <div id="lista-pines-contenido" style="padding: 10px;"></div>
            <div style="padding: 15px; border-top: 1px solid #eee; background: #f8f9fa;">
                <button onclick="guardarCambios()" style="background: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 4px; margin-right: 10px; cursor: pointer;">Guardar Cambios</button>
                <button onclick="cancelarEdicion()" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(listaPines);
    actualizarListaPines();
}

// FunciÃ³n para actualizar la lista de pines
function actualizarListaPines() {
    const contenido = document.getElementById('lista-pines-contenido');
    if (!contenido) return;
    
    contenido.innerHTML = pinesData.map(pin => {
        const tieneCoordinadas = pin.x !== null && pin.y !== null;
        const coordenadasTexto = tieneCoordinadas 
            ? `${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%` 
            : 'âš ï¸ SIN POSICIONAR';
        
        // Determinar estilo basado en si es temporal y posicionado
        let colorFondo, colorBorde, estadoTexto;
        
        if (pin.temporal) {
            if (tieneCoordinadas) {
                colorFondo = '#e8f5e8'; // Verde claro para temporales posicionados
                colorBorde = '#4caf50';
                estadoTexto = 'âœ… LISTO PARA GUARDAR';
            } else {
                colorFondo = '#fff3cd'; // Amarillo para temporales sin posicionar
                colorBorde = '#ffc107';
                estadoTexto = 'â³ TEMPORAL - SIN POSICIONAR';
            }
        } else {
            colorFondo = pinEditando?.id === pin.id ? '#e3f2fd' : '';
            colorBorde = pinEditando?.id === pin.id ? '#2196f3' : '#eee';
            estadoTexto = 'ðŸ’¾ GUARDADO EN BD';
        }
        
        return `
            <div style="margin: 5px 0; padding: 8px; border: 1px solid ${colorBorde}; border-radius: 4px; cursor: pointer; background: ${colorFondo};" 
                 onclick="seleccionarPinParaEditar('${pin.id}')">
                <div style="font-weight: bold; color: #2c3e50;">${pin.nombre}</div>
                <div style="font-size: 0.8em; color: #7f8c8d;">${pin.tipo} - ${coordenadasTexto}</div>
                <div style="font-size: 0.7em; color: ${pin.temporal ? '#ff6b35' : '#27ae60'}; font-style: italic;">${estadoTexto}</div>
                ${!tieneCoordinadas ? '<div style="font-size: 0.7em; color: #856404; font-style: italic;">Haz clic para posicionar en el mapa</div>' : ''}
            </div>
        `;
    }).join('');
}

// FunciÃ³n para seleccionar un pin para editar
function seleccionarPinParaEditar(pinId) {
    // Convertir a string para comparaciÃ³n consistente ya que los temporales son strings
    pinEditando = pinesData.find(pin => pin.id.toString() === pinId.toString());
    actualizarListaPines();
    console.log(`Pin seleccionado: ${pinEditando.nombre}. Haz clic en el mapa para reposicionarlo.`);
}

// FunciÃ³n para guardar cambios
function guardarCambios() {
    // Filtrar pines temporales que tienen coordenadas
    const pinesTemporales = pinesData.filter(pin => pin.temporal && pin.x !== null && pin.y !== null);
    const pinesNoColocados = pinesData.filter(pin => pin.temporal && (pin.x === null || pin.y === null));
    
    if (pinesNoColocados.length > 0) {
        const nombresNoColocados = pinesNoColocados.map(pin => pin.nombre).join(', ');
        if (!confirm(`Los siguientes pines no han sido posicionados en el mapa: ${nombresNoColocados}.\n\nÂ¿Deseas guardar solo los pines posicionados y eliminar los que no tienen coordenadas?`)) {
            return;
        }
        
        // Eliminar pines temporales sin coordenadas
        pinesNoColocados.forEach(pin => {
            const index = pinesData.findIndex(p => p.id === pin.id);
            if (index !== -1) {
                pinesData.splice(index, 1);
            }
        });
    }
    
    if (pinesTemporales.length === 0) {
        alert('No hay pines temporales para guardar.');
        cancelarEdicion();
        return;
    }
    
    if (confirm(`Â¿EstÃ¡s seguro de que quieres guardar ${pinesTemporales.length} pin(es) en la base de datos?`)) {
        console.log('Guardando pines temporales:', pinesTemporales);
        
        // Crear promesas para guardar cada pin temporal
        const promesasGuardado = pinesTemporales.map(pin => {
            // Convertir coordenadas de porcentaje a coordenadas geogrÃ¡ficas reales
            const coordenadasGeograficas = porcentajeACoordenasGeograficas(pin.x, pin.y);
            
            // Enviar datos completos al servidor (incluyendo coordenadas geogrÃ¡ficas)
            const pinParaEnviar = {
                nombre: pin.nombre,
                tipo: pin.tipo,
                descripcion: pin.descripcion,
                latitud: coordenadasGeograficas.lat,
                longitud: coordenadasGeograficas.lng
            };
            
            console.log(`ðŸ”„ Enviando pin "${pin.nombre}" al servidor:`);
            console.log(`   - Coordenadas mapa: x:${pin.x}%, y:${pin.y}%`);
            console.log(`   - Coordenadas geogrÃ¡ficas: lat:${coordenadasGeograficas.lat}, lng:${coordenadasGeograficas.lng}`);
            
            console.log(`ï¿½ Enviando pin "${pin.nombre}" al servidor (con coordenadas):`, pinParaEnviar);
            
            return fetch('/api/pines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(pinParaEnviar)
            })
            .then(response => {
                console.log(`ðŸ“¡ Respuesta para pin "${pin.nombre}" - Status:`, response.status);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`âœ… Pin "${pin.nombre}" guardado exitosamente:`, data);
                if (data.success) {
                    console.log(`Pin "${pin.nombre}" guardado con ID: ${data.id} y coordenadas geogrÃ¡ficas en BD`);
                    
                    // TambiÃ©n guardar coordenadas en localStorage como respaldo (formato completo)
                    const coordenadasLocales = {
                        x: parseFloat(pin.x),
                        y: parseFloat(pin.y),
                        lat: coordenadasGeograficas.lat,
                        lng: coordenadasGeograficas.lng
                    };
                    localStorage.setItem(`pin_coords_${data.id}`, JSON.stringify(coordenadasLocales));
                    console.log(`ðŸ’¾ Coordenadas respaldadas en localStorage para pin ID ${data.id}:`, coordenadasLocales);
                    
                    return { pin, data, success: true };
                } else {
                    throw new Error(data.error || 'Error al guardar el pin');
                }
            })
            .catch(error => {
                console.error(`âŒ Error guardando pin "${pin.nombre}":`, error);
                return { pin, error: error.message, success: false };
            });
        });
        
        // Ejecutar todas las promesas
        Promise.all(promesasGuardado)
            .then(resultados => {
                console.log('ðŸ“Š Resultados de guardado:', resultados);
                
                const exitosos = resultados.filter(r => r.success);
                const fallidos = resultados.filter(r => !r.success);
                
                console.log(`âœ… Exitosos: ${exitosos.length}, âŒ Fallidos: ${fallidos.length}`);
                
                if (exitosos.length > 0) {
                    mostrarMensajeConfirmacion(`${exitosos.length} pin(es) guardado(s) exitosamente en la base de datos.`, 'guardar');
                    
                    // Eliminar pines temporales exitosos de la lista local
                    exitosos.forEach(resultado => {
                        const index = pinesData.findIndex(p => p.id === resultado.pin.id);
                        if (index !== -1) {
                            console.log(`ðŸ—‘ï¸ Eliminando pin temporal "${resultado.pin.nombre}" de la lista local`);
                            pinesData.splice(index, 1);
                        }
                    });
                    
                    // Recargar todos los pines desde el servidor para obtener los IDs reales
                    console.log('ðŸ”„ Recargando pines desde el servidor...');
                    cargarPines();
                }
                
                if (fallidos.length > 0) {
                    const errorDetails = fallidos.map(r => `${r.pin.nombre}: ${r.error}`).join('\n');
                    console.error('âŒ Errores detallados:', errorDetails);
                    alert(`Error al guardar los siguientes pines:\n${errorDetails}`);
                }
                
                // Cancelar ediciÃ³n si todos fueron exitosos
                if (fallidos.length === 0) {
                    console.log('ðŸŽ‰ Todos los pines guardados exitosamente, cancelando ediciÃ³n...');
                    cancelarEdicion();
                }
            })
            .catch(error => {
                console.error('ðŸ’¥ Error general en Promise.all:', error);
                alert('Error inesperado al guardar los pines: ' + error.message);
            });
    }
}

// FunciÃ³n para cancelar ediciÃ³n
function cancelarEdicion() {
    modoEdicion = false;
    pinEditando = null;
    const listaPines = document.getElementById('lista-pines-edicion');
    if (listaPines) listaPines.remove();
    
    ocultarInstruccionesEdicion();
    
    const botonEdicion = document.getElementById('btn-editar-pines');
    const mapaContainer = document.getElementById('map-container');
    
    if (botonEdicion) {
        botonEdicion.textContent = 'Editar Posiciones';
        botonEdicion.style.background = '#3498db';
    }
    if (mapaContainer) {
        mapaContainer.style.cursor = 'default';
    }
}

// FunciÃ³n para aplicar filtros de ecosistemas
function aplicarFiltros() {
    // Obtener estado actual de los filtros
    filtrosActivos.rio = document.getElementById('filtro-rio')?.checked ?? true;
    filtrosActivos.lago = document.getElementById('filtro-lago')?.checked ?? true;
    filtrosActivos.presa = document.getElementById('filtro-presa')?.checked ?? true;
    
    console.log('Filtros aplicados:', filtrosActivos);
    
    // Aplicar filtros a los pines visibles
    const pines = document.querySelectorAll('.pin');
    pines.forEach(pin => {
        const tipo = pin.getAttribute('data-pin-tipo');
        if (filtrosActivos[tipo]) {
            pin.style.display = 'block';
            pin.style.opacity = '1';
        } else {
            pin.style.display = 'none';
            pin.style.opacity = '0';
        }
    });
    
    // Actualizar botÃ³n de agregar pines
    mostrarBotonAgregarPin();
}

// FunciÃ³n para contar y mostrar botÃ³n de agregar pines
function mostrarBotonAgregarPin() {
    // Crear o actualizar botÃ³n de agregar pin
    let botonAgregar = document.getElementById('boton-agregar-pin');
    
    if (!botonAgregar) {
        botonAgregar = document.createElement('div');
        botonAgregar.id = 'boton-agregar-pin';
        botonAgregar.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: #27ae60;
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 0.9rem;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            z-index: 50;
            transition: all 0.3s ease;
            user-select: none;
        `;
        
        botonAgregar.innerHTML = `âž• Agregar Pin`;
        
        botonAgregar.addEventListener('click', mostrarFormularioAgregarPin);
        botonAgregar.addEventListener('mouseenter', function() {
            this.style.background = '#229954';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        });
        botonAgregar.addEventListener('mouseleave', function() {
            this.style.background = '#27ae60';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        });
        
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.appendChild(botonAgregar);
        }
    }
    
    // Crear o actualizar botÃ³n de eliminar pin
    let botonEliminar = document.getElementById('boton-eliminar-pin');
    
    if (!botonEliminar && pinesData.length > 0) {
        botonEliminar = document.createElement('div');
        botonEliminar.id = 'boton-eliminar-pin';
        botonEliminar.style.cssText = `
            position: absolute;
            top: 10px;
            left: 150px;
            background: #e74c3c;
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 0.9rem;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            z-index: 50;
            transition: all 0.3s ease;
            user-select: none;
        `;
        
        botonEliminar.innerHTML = `ðŸ—‘ï¸ Eliminar Pin`;
        
        botonEliminar.addEventListener('click', mostrarFormularioEliminarPin);
        botonEliminar.addEventListener('mouseenter', function() {
            this.style.background = '#c0392b';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        });
        botonEliminar.addEventListener('mouseleave', function() {
            this.style.background = '#e74c3c';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        });
        
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.appendChild(botonEliminar);
        }
    } else if (botonEliminar && pinesData.length === 0) {
        // Ocultar botÃ³n si no hay pines
        botonEliminar.remove();
    }
    
    // Verificar si hay pines temporales para mostrar botÃ³n de ediciÃ³n
    const pinesTemporales = pinesData.filter(pin => pin.temporal);
    let botonEditar = document.getElementById('boton-editar-posiciones');
    
    if (pinesTemporales.length > 0 && !botonEditar) {
        botonEditar = document.createElement('div');
        botonEditar.id = 'boton-editar-posiciones';
        botonEditar.style.cssText = `
            position: absolute;
            top: 10px;
            left: 290px;
            background: #f39c12;
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 0.9rem;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            z-index: 50;
            transition: all 0.3s ease;
            user-select: none;
        `;
        
        botonEditar.innerHTML = `ðŸ“ Posicionar Pines (${pinesTemporales.length})`;
        
        botonEditar.addEventListener('click', function() {
            toggleModoEdicion();
            mostrarListaPines();
        });
        botonEditar.addEventListener('mouseenter', function() {
            this.style.background = '#e67e22';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        });
        botonEditar.addEventListener('mouseleave', function() {
            this.style.background = '#f39c12';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        });
        
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.appendChild(botonEditar);
        }
    } else if (pinesTemporales.length === 0 && botonEditar) {
        // Ocultar botÃ³n si no hay pines temporales
        botonEditar.remove();
    } else if (botonEditar) {
        // Actualizar contador
        botonEditar.innerHTML = `ðŸ“ Posicionar Pines (${pinesTemporales.length})`;
    }
}

// FunciÃ³n de debug para probar eliminar
function forzarMostrarBotonEliminar() {
    console.log('Forzando creaciÃ³n del botÃ³n eliminar...');
    let botonEliminar = document.getElementById('boton-eliminar-pin');
    if (botonEliminar) {
        botonEliminar.remove();
    }
    
    botonEliminar = document.createElement('div');
    botonEliminar.id = 'boton-eliminar-pin';
    botonEliminar.style.cssText = `
        position: absolute;
        top: 10px;
        left: 150px;
        background: #e74c3c;
        color: white;
        padding: 10px 15px;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 50;
        transition: all 0.3s ease;
        user-select: none;
    `;
    
    botonEliminar.innerHTML = `ðŸ—‘ï¸ Eliminar Pin`;
    botonEliminar.addEventListener('click', mostrarFormularioEliminarPin);
    
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
        mapContainer.appendChild(botonEliminar);
        console.log('BotÃ³n eliminar agregado al mapa');
    } else {
        console.log('No se encontrÃ³ map-container');
    }
}

// FunciÃ³n para mostrar formulario de agregar pin
function mostrarFormularioAgregarPin() {
    // Verificar si ya existe el formulario
    if (document.getElementById('modal-agregar-pin')) {
        return;
    }
    
    // Crear formulario modal
    const modal = document.createElement('div');
    modal.id = 'modal-agregar-pin';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const formulario = document.createElement('div');
    formulario.style.cssText = `
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    formulario.innerHTML = `
        <h3 style="margin-top: 0; color: #3498db; text-align: center;">
            âž• Agregar Nuevo Pin
        </h3>
        
        <div style="margin-bottom: 15px;">
            <label for="nombre-pin" style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">
                Nombre del Pin:
            </label>
            <input type="text" id="nombre-pin" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="tipo-ecosistema" style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">
                Tipo de Ecosistema:
            </label>
            <select id="tipo-ecosistema" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                <option value="rio">RÃ­o</option>
                <option value="lago">Lago</option>
                <option value="presa">Presa</option>
            </select>
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="descripcion-pin" style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">
                DescripciÃ³n:
            </label>
            <textarea id="descripcion-pin" rows="3" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;"></textarea>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #e8f4f8; border: 2px solid #3498db; border-radius: 8px;">
            <p style="margin: 0; font-weight: bold; color: #2c3e50;">ðŸ“ Posicionamiento:</p>
            <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #34495e;">
                El pin se crearÃ¡ sin coordenadas. DeberÃ¡s usar el modo <strong>"Editar Posiciones"</strong> 
                para ubicarlo en el mapa haciendo clic en la ubicaciÃ³n correcta.
            </p>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="guardar-nuevo-pin" style="flex: 1; background: #3498db; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;">
                Guardar Pin
            </button>
            <button id="cancelar-nuevo-pin" style="flex: 1; background: #e74c3c; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                Cancelar
            </button>
        </div>
    `;
    
    modal.appendChild(formulario);
    document.body.appendChild(modal);
    
    // Eventos
    document.getElementById('guardar-nuevo-pin').addEventListener('click', function() {
        const nombre = document.getElementById('nombre-pin').value.trim();
        const tipo = document.getElementById('tipo-ecosistema').value;
        const descripcion = document.getElementById('descripcion-pin').value.trim();
        
        console.log('Datos capturados del formulario:', {
            nombre: nombre,
            tipo: tipo,
            descripcion: descripcion
        });
        
        if (!nombre || !tipo || !descripcion) {
            alert('Por favor completa todos los campos requeridos.');
            return;
        }
        
        // Crear pin temporal con ID Ãºnico
        const nuevoPin = {
            id: 'temp_' + Date.now(), // ID temporal Ãºnico
            nombre,
            tipo,
            descripcion,
            x: null,
            y: null,
            temporal: true, // Marcar como temporal
            sinPosicionar: true // Necesita ser posicionado
        };
        
        console.log('Pin temporal creado:', nuevoPin);
        
        // Agregar a la lista local sin enviar al servidor
        pinesData.push(nuevoPin);
        
        // Actualizar la vista
        mostrarPines();
        
        // Mostrar mensaje indicando que debe posicionarse
        mostrarMensajeConfirmacion(`Pin "${nuevoPin.nombre}" creado temporalmente. Usa "Editar Posiciones" para ubicarlo en el mapa.`, 'temporal');
        
        // Cerrar formulario
        modal.remove();
        
        console.log('Nuevo pin creado:', nuevoPin);
    });
    
    document.getElementById('cancelar-nuevo-pin').addEventListener('click', function() {
        modal.remove();
    });
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// FunciÃ³n para mostrar formulario de eliminar pin
function mostrarFormularioEliminarPin() {
    // Verificar si ya existe el formulario
    if (document.getElementById('modal-eliminar-pin')) {
        return;
    }
    
    // Crear formulario modal
    const modal = document.createElement('div');
    modal.id = 'modal-eliminar-pin';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const formulario = document.createElement('div');
    formulario.style.cssText = `
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    formulario.innerHTML = `
        <h3 style="margin-top: 0; color: #e74c3c; text-align: center;">
            ðŸ—‘ï¸ Eliminar Pin
        </h3>
        
        <div style="margin-bottom: 15px;">
            <label for="pin-a-eliminar" style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">
                Seleccionar pin a eliminar:
            </label>
            <select id="pin-a-eliminar" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                <option value="">-- Selecciona un pin --</option>
                ${pinesData.map(pin => `
                    <option value="${pin.id}">${pin.nombre} (${pin.tipo})</option>
                `).join('')}
            </select>
        </div>
        
        <div style="background: #fef2f2; border: 2px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
            <strong>âš ï¸ Advertencia:</strong><br>
            Esta acciÃ³n no se puede deshacer. El pin serÃ¡ eliminado permanentemente.
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="confirmar-eliminar" style="flex: 1; background: #e74c3c; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;">
                Eliminar Pin
            </button>
            <button id="cancelar-eliminar" style="flex: 1; background: #6c757d; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                Cancelar
            </button>
        </div>
    `;
    
    modal.appendChild(formulario);
    document.body.appendChild(modal);
    
    // Eventos
    document.getElementById('confirmar-eliminar').addEventListener('click', function() {
        const pinId = document.getElementById('pin-a-eliminar').value;
        if (!pinId) {
            alert('Por favor selecciona un pin para eliminar.');
            return;
        }
        
        if (confirm('Â¿EstÃ¡s seguro de que quieres eliminar este pin? Esta acciÃ³n no se puede deshacer.')) {
            eliminarPin(parseInt(pinId));
            modal.remove();
        }
    });
    
    document.getElementById('cancelar-eliminar').addEventListener('click', function() {
        modal.remove();
    });
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// FunciÃ³n para eliminar un pin
function eliminarPin(pinId) {
    // Encontrar el pin
    const pin = pinesData.find(p => p.id === pinId);
    if (!pin) {
        alert('Pin no encontrado.');
        return;
    }
    
    // Enviar peticiÃ³n DELETE al servidor
    fetch(`/api/pines/${pinId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Recargar pines desde el servidor
            cargarPines();
            
            // Mostrar mensaje de confirmaciÃ³n
            mostrarMensajeConfirmacion(`Pin "${pin.nombre}" eliminado exitosamente.`, 'eliminar');
            
            console.log('Pin eliminado de la base de datos:', data);
        } else {
            throw new Error(data.error || 'Error al eliminar el pin');
        }
    })
    .catch(error => {
        console.error('Error al eliminar pin:', error);
        alert('Error al eliminar el pin: ' + error.message);
    });
}

// FunciÃ³n para mostrar mensajes de confirmaciÃ³n
function mostrarMensajeConfirmacion(mensaje, tipo = 'agregar') {
    const colores = {
        'eliminar': '#e74c3c',
        'agregar': '#27ae60',
        'temporal': '#f39c12', // Naranja para pines temporales
        'guardar': '#3498db'   // Azul para guardar
    };
    
    const iconos = {
        'eliminar': 'ðŸ—‘ï¸',
        'agregar': 'âœ…',
        'temporal': 'â³', // Reloj para temporal
        'guardar': 'ðŸ’¾'   // Disquete para guardar
    };
    
    const color = colores[tipo] || colores['agregar'];
    const icono = iconos[tipo] || iconos['agregar'];
    
    const mensajeDiv = document.createElement('div');
    mensajeDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2000;
        font-size: 14px;
        font-weight: bold;
    `;
    
    mensajeDiv.innerHTML = `${icono} ${mensaje}`;
    document.body.appendChild(mensajeDiv);
    
    // Eliminar mensaje despuÃ©s de 3 segundos
    setTimeout(() => {
        if (mensajeDiv.parentNode) {
            mensajeDiv.parentNode.removeChild(mensajeDiv);
        }
    }, 3000);
}

