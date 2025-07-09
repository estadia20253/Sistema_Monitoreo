let pinesData = [];
let resizeTimeout;

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
                <div class="pin-tooltip">${pin.nombre}</div>
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
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
    }
}

function ocultarTooltip(pinElement) {
    const tooltip = pinElement.querySelector('.pin-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
        tooltip.style.opacity = '0';
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

