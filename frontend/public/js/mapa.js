let pinesData = [];
let resizeTimeout;

// Variables para el modo de edición de pines
let modoEdicion = false;
let pinEditando = null;

document.addEventListener('DOMContentLoaded', function() {
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
    
    // Agregar listener para clics en el mapa (modo edición)
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

    // Verificar que la imagen esté completamente cargada
    if (!mapaImagen.complete || mapaImagen.naturalWidth === 0) {
        console.log('Esperando a que la imagen se cargue completamente...');
        mapaImagen.onload = () => {
            mostrarPines();
        };
        return;
    }

    pinesContainer.innerHTML = '';

    if (pinesData.length > 0) {
        pinesData.forEach(pin => {
            const pinElement = document.createElement('div');
            pinElement.className = `pin pin-${pin.tipo}`;
            pinElement.setAttribute('data-pin-id', pin.id);
            pinElement.setAttribute('data-pin-tipo', pin.tipo);

            // Calcular posición real considerando object-fit: contain
            const coordenadas = calcularPosicionPin(pin.x, pin.y, mapaImagen);
            pinElement.style.left = `${coordenadas.x}%`;
            pinElement.style.top = `${coordenadas.y}%`;
            pinElement.style.position = 'absolute';

            pinElement.innerHTML = `
                <div class="pin-icon ${pin.tipo}">${getIconoPorTipo(pin.tipo)}</div>
                <div class="pin-tooltip hidden">${pin.nombre}</div>
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

        // Animar la transición - El mapa y los pines se moverán juntos
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
                <label>Ubicación en el Mapa:</label>
                <span>Coordenadas: ${pin.x}%, ${pin.y}%</span>
            </div>
            
            <div class="info-item">
                <label>Estado:</label>
                <span class="estado-activo">Registrado</span>
            </div>
            
            <div class="info-adicional">
                <p><strong>Información:</strong> Este punto representa la ubicación geográfica relativa del ${pin.tipo} ${pin.nombre} en el mapa de ecosistemas acuáticos del estado de Hidalgo.</p>
            </div>
        </div>
        
        <div class="botones-accion">
            <button class="btn-cerrar-mobile" onclick="cerrarDetalles()">
                ← Volver al Mapa
            </button>
        </div>
    `;
}

function getIconoPorTipo(tipo) {
    const iconos = {
        rio: '🌊',
        lago: '🏞️',
        presa: '🏗️'
    };
    return iconos[tipo] || '📍';
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
    // Función para reposicionar los pines cuando cambia el tamaño de la ventana
    if (pinesData.length > 0) {
        mostrarPines();
    }
}

function cargarMapa() {
    const mapaImagen = document.getElementById('mapa-imagen');
    const loading = document.getElementById('loading');

    try {
        console.log('Intentando cargar mapa desde frontend...');
        fetch('/api/mapa')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error al cargar el mapa: ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                const imageUrl = URL.createObjectURL(blob);
                mapaImagen.src = imageUrl;
                mapaImagen.onload = function() {
                    loading.style.display = 'none';
                    mapaImagen.style.display = 'block';
                    console.log('Mapa cargado exitosamente');
                    // Esperar un frame para asegurar que las dimensiones están disponibles
                    requestAnimationFrame(() => {
                        cargarPines();
                    });
                };
            })
            .catch(error => {
                console.error('Error al cargar el mapa:', error);
                mostrarError('No se pudo cargar el mapa. Verifica que el backend esté ejecutándose.');
            });
    } catch (error) {
        console.error('Error inesperado:', error);
        mostrarError('Error inesperado al cargar el mapa.');
    }
}

function cargarPines() {
    fetch('/api/pines')
        .then(response => response.json())
        .then(data => {
            pinesData = data;
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
            <h3>❌ ${mensaje}</h3>
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

function calcularPosicionPin(x, y, mapaImagen) {
    // Obtener las dimensiones reales del contenedor y la imagen
    const contenedor = mapaImagen.parentElement;
    const contenedorRect = contenedor.getBoundingClientRect();
    const imagenRect = mapaImagen.getBoundingClientRect();
    
    // Calcular las dimensiones de la imagen visible (considerando object-fit: contain)
    const imagenNaturalWidth = mapaImagen.naturalWidth;
    const imagenNaturalHeight = mapaImagen.naturalHeight;
    const contenedorWidth = contenedorRect.width;
    const contenedorHeight = contenedorRect.height;
    
    // Calcular la escala que usa object-fit: contain
    const escalaX = contenedorWidth / imagenNaturalWidth;
    const escalaY = contenedorHeight / imagenNaturalHeight;
    const escala = Math.min(escalaX, escalaY);
    
    // Dimensiones de la imagen escalada
    const imagenEscaladaWidth = imagenNaturalWidth * escala;
    const imagenEscaladaHeight = imagenNaturalHeight * escala;
    
    // Calcular los márgenes (la imagen se centra automáticamente)
    const margenX = (contenedorWidth - imagenEscaladaWidth) / 2;
    const margenY = (contenedorHeight - imagenEscaladaHeight) / 2;
    
    // Convertir las coordenadas porcentuales originales a posición absoluta
    const posicionAbsolutaX = (x / 100) * imagenEscaladaWidth + margenX;
    const posicionAbsolutaY = (y / 100) * imagenEscaladaHeight + margenY;
    
    // Convertir de vuelta a porcentaje relativo al contenedor
    const nuevaX = (posicionAbsolutaX / contenedorWidth) * 100;
    const nuevaY = (posicionAbsolutaY / contenedorHeight) * 100;
    
    // Log de depuración solo para el primer pin (puede ser eliminado en producción)
    if (x === 45.25 && y === 27.26) {
        console.log('Cálculo de posición del pin (Río Moctezuma):', {
            coordenadasOriginales: { x, y },
            dimensionesContenedor: { width: contenedorWidth, height: contenedorHeight },
            dimensionesImagen: { width: imagenNaturalWidth, height: imagenNaturalHeight },
            escala: escala,
            margenes: { x: margenX, y: margenY },
            posicionFinal: { x: nuevaX, y: nuevaY }
        });
    }
    
    return {
        x: nuevaX,
        y: nuevaY
    };
}

// Función para activar/desactivar el modo de edición
function toggleModoEdicion() {
    modoEdicion = !modoEdicion;
    const botonEdicion = document.getElementById('btn-editar-pines');
    const mapaContainer = document.getElementById('map-container');
    
    if (modoEdicion) {
        botonEdicion.textContent = 'Salir del Modo Edición';
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

// Función para manejar clics en el mapa para reposicionar pines
function manejarClicMapa(event) {
    if (!modoEdicion) return;
    
    const mapContainer = document.getElementById('map-container');
    const mapaImagen = document.getElementById('mapa-imagen');
    
    const rect = mapContainer.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Convertir a coordenadas originales (sin object-fit)
    const coordenadasOriginales = convertirACoordenadasOriginales(x, y, mapaImagen);
    
    if (pinEditando) {
        // Actualizar posición del pin
        actualizarPosicionPin(pinEditando, coordenadasOriginales.x, coordenadasOriginales.y);
    } else {
        // Mostrar coordenadas para información
        console.log(`Coordenadas del clic: ${coordenadasOriginales.x.toFixed(2)}%, ${coordenadasOriginales.y.toFixed(2)}%`);
    }
}

// Función para convertir coordenadas de pantalla a coordenadas originales del mapa
function convertirACoordenadasOriginales(x, y, mapaImagen) {
    const contenedor = mapaImagen.parentElement;
    const contenedorRect = contenedor.getBoundingClientRect();
    
    const imagenNaturalWidth = mapaImagen.naturalWidth;
    const imagenNaturalHeight = mapaImagen.naturalHeight;
    const contenedorWidth = contenedorRect.width;
    const contenedorHeight = contenedorRect.height;
    
    // Calcular la escala que usa object-fit: contain
    const escalaX = contenedorWidth / imagenNaturalWidth;
    const escalaY = contenedorHeight / imagenNaturalHeight;
    const escala = Math.min(escalaX, escalaY);
    
    // Dimensiones de la imagen escalada
    const imagenEscaladaWidth = imagenNaturalWidth * escala;
    const imagenEscaladaHeight = imagenNaturalHeight * escala;
    
    // Calcular los márgenes
    const margenX = (contenedorWidth - imagenEscaladaWidth) / 2;
    const margenY = (contenedorHeight - imagenEscaladaHeight) / 2;
    
    // Convertir coordenadas de pantalla a posición absoluta
    const posicionAbsolutaX = (x / 100) * contenedorWidth - margenX;
    const posicionAbsolutaY = (y / 100) * contenedorHeight - margenY;
    
    // Convertir a porcentaje relativo a la imagen original
    const originalX = (posicionAbsolutaX / imagenEscaladaWidth) * 100;
    const originalY = (posicionAbsolutaY / imagenEscaladaHeight) * 100;
    
    return {
        x: Math.max(0, Math.min(100, originalX)),
        y: Math.max(0, Math.min(100, originalY))
    };
}

// Función para actualizar la posición de un pin
function actualizarPosicionPin(pin, newX, newY) {
    // Actualizar datos en memoria
    pin.x = newX;
    pin.y = newY;
    
    // Reposicionar pines visualmente
    mostrarPines();
    
    // Mostrar información de la nueva posición
    console.log(`${pin.nombre} reposicionado a: ${newX.toFixed(2)}%, ${newY.toFixed(2)}%`);
    
    // Limpiar pin seleccionado
    pinEditando = null;
    actualizarListaPines();
}

// Función para mostrar instrucciones de edición
function mostrarInstruccionesEdicion() {
    const instrucciones = document.createElement('div');
    instrucciones.id = 'instrucciones-edicion';
    instrucciones.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 15px; border-radius: 8px; z-index: 1000; max-width: 300px;">
            <h4 style="margin: 0 0 10px 0;">Modo de Edición Activo</h4>
            <p style="margin: 5px 0;">1. Haz clic en un pin para seleccionarlo</p>
            <p style="margin: 5px 0;">2. Haz clic en el mapa para reposicionarlo</p>
            <p style="margin: 5px 0;">3. Usa "Guardar Cambios" cuando termines</p>
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

// Función para mostrar lista de pines editables
function mostrarListaPines() {
    const listaPines = document.createElement('div');
    listaPines.id = 'lista-pines-edicion';
    listaPines.innerHTML = `
        <div style="position: fixed; top: 120px; right: 20px; background: white; border: 1px solid #ddd; border-radius: 8px; z-index: 1000; max-width: 350px; max-height: 400px; overflow-y: auto;">
            <div style="padding: 15px; border-bottom: 1px solid #eee; background: #f8f9fa;">
                <h4 style="margin: 0;">Seleccionar Pin para Editar</h4>
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

// Función para actualizar la lista de pines
function actualizarListaPines() {
    const contenido = document.getElementById('lista-pines-contenido');
    if (!contenido) return;
    
    contenido.innerHTML = pinesData.map(pin => `
        <div style="margin: 5px 0; padding: 8px; border: 1px solid #eee; border-radius: 4px; cursor: pointer; ${pinEditando?.id === pin.id ? 'background: #e3f2fd; border-color: #2196f3;' : ''}" 
             onclick="seleccionarPinParaEditar(${pin.id})">
            <div style="font-weight: bold; color: #2c3e50;">${pin.nombre}</div>
            <div style="font-size: 0.8em; color: #7f8c8d;">${pin.tipo} - ${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%</div>
        </div>
    `).join('');
}

// Función para seleccionar un pin para editar
function seleccionarPinParaEditar(pinId) {
    pinEditando = pinesData.find(pin => pin.id === pinId);
    actualizarListaPines();
    console.log(`Pin seleccionado: ${pinEditando.nombre}`);
}

// Función para guardar cambios
function guardarCambios() {
    if (confirm('¿Estás seguro de que quieres guardar todos los cambios?')) {
        fetch('/api/pines', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pinesData)
        })
        .then(response => response.json())
        .then(data => {
            alert('Cambios guardados exitosamente');
            cancelarEdicion();
        })
        .catch(error => {
            console.error('Error al guardar:', error);
            alert('Error al guardar los cambios');
        });
    }
}

// Función para cancelar edición
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

