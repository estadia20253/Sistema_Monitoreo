let pinesData = [];
let resizeTimeout;

// Variables para el modo de edición de pines
let modoEdicion = false;
let pinEditando = null;

// Variables para filtros
let filtrosActivos = {
    rio: true,
    lago: true,
    presa: true
};

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

            // Posicionar pines basándose en porcentajes relativos a la imagen del mapa
            // Esto asegura que se muevan junto con el mapa
            pinElement.style.left = `${pin.x}%`;
            pinElement.style.top = `${pin.y}%`;
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
        
        // Aplicar filtros después de crear todos los pines
        setTimeout(() => {
            aplicarFiltros();
        }, 100);
        
        // Mostrar botones después de crear los pines
        mostrarBotonAgregarPin();
    } else {
        // Mostrar botón agregar incluso si no hay pines
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
                    cargarPines();
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
    
    // Evitar que el clic en un pin active la reposición
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
        // Actualizar posición del pin directamente con las coordenadas del clic
        actualizarPosicionPin(pinEditando, x, y);
    } else {
        console.log(`Coordenadas disponibles para posicionamiento: ${x.toFixed(2)}%, ${y.toFixed(2)}%`);
        alert(`Primero selecciona un pin de la lista para editar.\nCoordenadas del clic: ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
    }
}

// Función para actualizar la posición de un pin
function actualizarPosicionPin(pin, newX, newY) {
    // Asegurar que las coordenadas estén dentro de límites válidos
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));
    
    // Actualizar datos en memoria
    pin.x = clampedX;
    pin.y = clampedY;
    
    // Marcar como posicionado (quitar flag de sin posicionar)
    if (pin.sinPosicionar) {
        delete pin.sinPosicionar;
        mostrarMensajeConfirmacion(`Pin "${pin.nombre}" posicionado correctamente en el mapa.`, 'agregar');
    }
    
    // Reposicionar pines visualmente
    mostrarPines();
    
    // Mostrar información de la nueva posición
    console.log(`${pin.nombre} reposicionado a: ${clampedX.toFixed(2)}%, ${clampedY.toFixed(2)}%`);
    
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
                <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;">
                    Los pines marcados con ⚠️ necesitan ser posicionados
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

// Función para actualizar la lista de pines
function actualizarListaPines() {
    const contenido = document.getElementById('lista-pines-contenido');
    if (!contenido) return;
    
    contenido.innerHTML = pinesData.map(pin => {
        const tieneCoordinadas = pin.x !== null && pin.y !== null;
        const coordenadasTexto = tieneCoordinadas 
            ? `${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%` 
            : '⚠️ SIN POSICIONAR';
        const colorFondo = pin.sinPosicionar 
            ? '#fff3cd' 
            : (pinEditando?.id === pin.id ? '#e3f2fd' : '');
        const colorBorde = pin.sinPosicionar 
            ? '#ffc107' 
            : (pinEditando?.id === pin.id ? '#2196f3' : '#eee');
        
        return `
            <div style="margin: 5px 0; padding: 8px; border: 1px solid ${colorBorde}; border-radius: 4px; cursor: pointer; background: ${colorFondo};" 
                 onclick="seleccionarPinParaEditar(${pin.id})">
                <div style="font-weight: bold; color: #2c3e50;">${pin.nombre}</div>
                <div style="font-size: 0.8em; color: ${pin.sinPosicionar ? '#856404' : '#7f8c8d'};">${pin.tipo} - ${coordenadasTexto}</div>
                ${pin.sinPosicionar ? '<div style="font-size: 0.7em; color: #856404; font-style: italic;">Haz clic para posicionar en el mapa</div>' : ''}
            </div>
        `;
    }).join('');
}

// Función para seleccionar un pin para editar
function seleccionarPinParaEditar(pinId) {
    pinEditando = pinesData.find(pin => pin.id === pinId);
    actualizarListaPines();
    console.log(`Pin seleccionado: ${pinEditando.nombre}. Haz clic en el mapa para reposicionarlo.`);
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

// Función para aplicar filtros de ecosistemas
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
    
    // Actualizar botón de agregar pines
    mostrarBotonAgregarPin();
}

// Función para contar y mostrar botón de agregar pines
function mostrarBotonAgregarPin() {
    // Crear o actualizar botón de agregar pin
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
        
        botonAgregar.innerHTML = `➕ Agregar Pin`;
        
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
    
    // Crear o actualizar botón de eliminar pin
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
        
        botonEliminar.innerHTML = `🗑️ Eliminar Pin`;
        
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
        // Ocultar botón si no hay pines
        botonEliminar.remove();
    }
}

// Función de debug para probar eliminar
function forzarMostrarBotonEliminar() {
    console.log('Forzando creación del botón eliminar...');
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
    
    botonEliminar.innerHTML = `🗑️ Eliminar Pin`;
    botonEliminar.addEventListener('click', mostrarFormularioEliminarPin);
    
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
        mapContainer.appendChild(botonEliminar);
        console.log('Botón eliminar agregado al mapa');
    } else {
        console.log('No se encontró map-container');
    }
}

// Función para mostrar formulario de agregar pin
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
            ➕ Agregar Nuevo Pin
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
                <option value="rio">Río</option>
                <option value="lago">Lago</option>
                <option value="presa">Presa</option>
            </select>
        </div>
        
        <div style="margin-bottom: 15px;">
            <label for="descripcion-pin" style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">
                Descripción:
            </label>
            <textarea id="descripcion-pin" rows="3" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;"></textarea>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #e8f4f8; border: 2px solid #3498db; border-radius: 8px;">
            <p style="margin: 0; font-weight: bold; color: #2c3e50;">📍 Posicionamiento:</p>
            <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #34495e;">
                El pin se creará sin coordenadas. Deberás usar el modo <strong>"Editar Posiciones"</strong> 
                para ubicarlo en el mapa haciendo clic en la ubicación correcta.
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
        
        if (!nombre || !tipo || !descripcion) {
            alert('Por favor completa todos los campos requeridos.');
            return;
        }
        
        const nuevoPin = {
            id: Date.now(), // ID único temporal
            nombre,
            tipo,
            x: null, // Sin coordenadas iniciales
            y: null, // Sin coordenadas iniciales
            descripcion,
            sinPosicionar: true // Marcador para pines sin posicionar
        };
        
        // Agregar pin a la lista y mostrarlo en el mapa
        pinesData.push(nuevoPin);
        mostrarPines();
        
        // Mostrar mensaje de éxito
        mostrarMensajeConfirmacion(`Pin "${nuevoPin.nombre}" creado. Usa "Editar Posiciones" para ubicarlo en el mapa.`, 'agregar');
        
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

// Función para mostrar formulario de eliminar pin
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
            🗑️ Eliminar Pin
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
            <strong>⚠️ Advertencia:</strong><br>
            Esta acción no se puede deshacer. El pin será eliminado permanentemente.
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
        
        if (confirm('¿Estás seguro de que quieres eliminar este pin? Esta acción no se puede deshacer.')) {
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

// Función para eliminar un pin
function eliminarPin(pinId) {
    // Encontrar el índice del pin
    const pinIndex = pinesData.findIndex(pin => pin.id === pinId);
    if (pinIndex === -1) {
        alert('Pin no encontrado.');
        return;
    }
    
    const pinEliminado = pinesData[pinIndex];
    
    // Eliminar de la lista
    pinesData.splice(pinIndex, 1);
    
    // Volver a renderizar el mapa
    mostrarPines();
    
    // Mostrar mensaje de confirmación
    mostrarMensajeConfirmacion(`Pin "${pinEliminado.nombre}" eliminado exitosamente.`, 'eliminar');
    
    console.log('Pin eliminado:', pinEliminado);
}

// Función para mostrar mensajes de confirmación
function mostrarMensajeConfirmacion(mensaje, tipo = 'agregar') {
    const color = tipo === 'eliminar' ? '#e74c3c' : '#27ae60';
    const icono = tipo === 'eliminar' ? '🗑️' : '✅';
    
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
    
    // Eliminar mensaje después de 3 segundos
    setTimeout(() => {
        if (mensajeDiv.parentNode) {
            mensajeDiv.parentNode.removeChild(mensajeDiv);
        }
    }, 3000);
}

