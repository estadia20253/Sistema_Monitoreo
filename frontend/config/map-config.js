// Configuración del mapa de Hidalgo
// Coordenadas geográficas reales del estado de Hidalgo, México

const HIDALGO_MAP_CONFIG = {
    // Límites geográficos del estado de Hidalgo
    bounds: {
        north: 21.4,    // Latitud norte
        south: 19.6,    // Latitud sur
        east: -97.8,    // Longitud este
        west: -99.8     // Longitud oeste
    },
    
    // Centro geográfico aproximado de Hidalgo
    center: {
        lat: 20.5,      // Latitud central
        lng: -98.8      // Longitud central
    },
    
    // Dimensiones de la imagen del mapa en píxeles
    image: {
        width: 384,     // Ancho de la imagen
        height: 384     // Alto de la imagen
    }
};

/**
 * Convierte coordenadas geográficas (lat, lng) a posición en píxeles en la imagen
 * @param {number} lat - Latitud geográfica
 * @param {number} lng - Longitud geográfica
 * @returns {object} - {x, y} posición en píxeles, {x, y} porcentaje de la imagen
 */
function coordenadasGeograficasAPixeles(lat, lng) {
    const { bounds, image } = HIDALGO_MAP_CONFIG;
    
    // Validar que las coordenadas estén dentro de los límites de Hidalgo
    if (lat < bounds.south || lat > bounds.north || lng < bounds.west || lng > bounds.east) {
        console.warn(`⚠️ Coordenadas fuera de los límites de Hidalgo: lat=${lat}, lng=${lng}`);
    }
    
    // Calcular porcentaje de posición
    const latPercent = ((lat - bounds.south) / (bounds.north - bounds.south)) * 100;
    const lngPercent = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100;
    
    // Calcular píxeles
    const x = (lngPercent / 100) * image.width;
    const y = ((100 - latPercent) / 100) * image.height; // Invertir Y porque en CSS Y=0 está arriba
    
    return {
        // Posición en píxeles
        pixels: { x: Math.round(x), y: Math.round(y) },
        // Posición en porcentaje
        percent: { x: lngPercent, y: 100 - latPercent }
    };
}

/**
 * Convierte posición en píxeles a coordenadas geográficas
 * @param {number} x - Posición X en píxeles
 * @param {number} y - Posición Y en píxeles  
 * @returns {object} - {lat, lng} coordenadas geográficas
 */
function pixelesACoordenasGeograficas(x, y) {
    const { bounds, image } = HIDALGO_MAP_CONFIG;
    
    // Convertir píxeles a porcentajes
    const xPercent = (x / image.width) * 100;
    const yPercent = (y / image.height) * 100;
    
    // Convertir porcentajes a coordenadas geográficas
    const lng = bounds.west + (xPercent / 100) * (bounds.east - bounds.west);
    const lat = bounds.south + ((100 - yPercent) / 100) * (bounds.north - bounds.south);
    
    return {
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
    };
}

/**
 * Convierte porcentajes a coordenadas geográficas
 * @param {number} xPercent - Posición X en porcentaje (0-100)
 * @param {number} yPercent - Posición Y en porcentaje (0-100)
 * @returns {object} - {lat, lng} coordenadas geográficas
 */
function porcentajeACoordenasGeograficas(xPercent, yPercent) {
    const { bounds } = HIDALGO_MAP_CONFIG;
    
    // Convertir porcentajes a coordenadas geográficas
    const lng = bounds.west + (xPercent / 100) * (bounds.east - bounds.west);
    const lat = bounds.south + ((100 - yPercent) / 100) * (bounds.north - bounds.south);
    
    return {
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
    };
}

/**
 * Convierte coordenadas geográficas a porcentajes
 * @param {number} lat - Latitud geográfica
 * @param {number} lng - Longitud geográfica
 * @returns {object} - {x, y} posición en porcentaje
 */
function coordenadasGeograficasAPorcentaje(lat, lng) {
    const { bounds } = HIDALGO_MAP_CONFIG;
    
    // Calcular porcentaje de posición
    const latPercent = ((lat - bounds.south) / (bounds.north - bounds.south)) * 100;
    const lngPercent = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100;
    
    return {
        x: parseFloat(lngPercent.toFixed(2)),
        y: parseFloat((100 - latPercent).toFixed(2)) // Invertir Y
    };
}

module.exports = {
    HIDALGO_MAP_CONFIG,
    coordenadasGeograficasAPixeles,
    pixelesACoordenasGeograficas,
    porcentajeACoordenasGeograficas,
    coordenadasGeograficasAPorcentaje
};
