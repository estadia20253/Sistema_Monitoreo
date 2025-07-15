const { query } = require('../config/database');

class Pin {
    constructor(data) {
        this.id = data.id;
        this.nombre = data.nombre;
        this.tipo = data.tipo;
        this.estado = data.estado;
        this.descripcion = data.descripcion;
        this.latitud = data.latitud;
        this.longitud = data.longitud;
        this.fecha_creacion = data.fecha_creacion;
        this.usuario_id = data.usuario_id;
        this.activo = data.activo !== undefined ? data.activo : true;
    }

    // Crear nuevo pin en la base de datos
    static async create(pinData) {
        const sql = `
            INSERT INTO pines (nombre, tipo, estado, descripcion, latitud, longitud, usuario_id, activo, fecha_creacion)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *
        `;
        
        const values = [
            pinData.nombre,
            pinData.tipo,
            pinData.estado || 'activo',
            pinData.descripcion || '',
            pinData.latitud || null,
            pinData.longitud || null,
            pinData.usuario_id,
            true
        ];

        try {
            const result = await query(sql, values);
            return new Pin(result.rows[0]);
        } catch (error) {
            console.error('Error creando pin:', error);
            throw error;
        }
    }

    // Obtener todos los pines activos
    static async findAll() {
        const sql = `
            SELECT p.*, u.nombres, u.apellido_paterno 
            FROM pines p 
            LEFT JOIN users u ON p.usuario_id = u.id 
            WHERE p.activo = true 
            ORDER BY p.fecha_creacion DESC
        `;
        
        try {
            const result = await query(sql);
            return result.rows.map(row => new Pin(row));
        } catch (error) {
            console.error('Error obteniendo pines:', error);
            throw error;
        }
    }

    // Buscar pin por ID
    static async findById(id) {
        const sql = `
            SELECT p.*, u.nombres, u.apellido_paterno 
            FROM pines p 
            LEFT JOIN users u ON p.usuario_id = u.id 
            WHERE p.id = $1 AND p.activo = true
        `;
        
        try {
            const result = await query(sql, [id]);
            return result.rows[0] ? new Pin(result.rows[0]) : null;
        } catch (error) {
            console.error('Error buscando pin:', error);
            throw error;
        }
    }

    // Marcar pin como inactivo (eliminación lógica)
    static async deleteById(id) {
        const sql = `
            UPDATE pines 
            SET activo = false, fecha_eliminacion = NOW() 
            WHERE id = $1 AND activo = true
            RETURNING *
        `;
        
        try {
            const result = await query(sql, [id]);
            return result.rows[0] ? new Pin(result.rows[0]) : null;
        } catch (error) {
            console.error('Error eliminando pin:', error);
            throw error;
        }
    }

    // Actualizar pin por ID (método estático)
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Construir query dinámicamente
        if (updateData.nombre !== undefined) {
            fields.push(`nombre = $${paramCount++}`);
            values.push(updateData.nombre);
        }
        if (updateData.tipo !== undefined) {
            fields.push(`tipo = $${paramCount++}`);
            values.push(updateData.tipo);
        }
        if (updateData.estado !== undefined) {
            fields.push(`estado = $${paramCount++}`);
            values.push(updateData.estado);
        }
        if (updateData.descripcion !== undefined) {
            fields.push(`descripcion = $${paramCount++}`);
            values.push(updateData.descripcion);
        }
        if (updateData.latitud !== undefined) {
            fields.push(`latitud = $${paramCount++}`);
            values.push(updateData.latitud);
        }
        if (updateData.longitud !== undefined) {
            fields.push(`longitud = $${paramCount++}`);
            values.push(updateData.longitud);
        }

        if (fields.length === 0) {
            const pin = await Pin.findById(id);
            return pin;
        }

        fields.push(`fecha_actualizacion = NOW()`);
        values.push(id);

        const sql = `
            UPDATE pines 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCount} AND activo = true
            RETURNING *
        `;

        try {
            const result = await query(sql, values);
            return result.rows[0] ? new Pin(result.rows[0]) : null;
        } catch (error) {
            console.error('Error actualizando pin:', error);
            throw error;
        }
    }

    // Actualizar pin (método de instancia)
    async update(updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Construir query dinámicamente
        if (updateData.nombre !== undefined) {
            fields.push(`nombre = $${paramCount++}`);
            values.push(updateData.nombre);
        }
        if (updateData.tipo !== undefined) {
            fields.push(`tipo = $${paramCount++}`);
            values.push(updateData.tipo);
        }
        if (updateData.estado !== undefined) {
            fields.push(`estado = $${paramCount++}`);
            values.push(updateData.estado);
        }
        if (updateData.descripcion !== undefined) {
            fields.push(`descripcion = $${paramCount++}`);
            values.push(updateData.descripcion);
        }
        if (updateData.latitud !== undefined) {
            fields.push(`latitud = $${paramCount++}`);
            values.push(updateData.latitud);
        }
        if (updateData.longitud !== undefined) {
            fields.push(`longitud = $${paramCount++}`);
            values.push(updateData.longitud);
        }

        if (fields.length === 0) {
            return this;
        }

        fields.push(`fecha_actualizacion = NOW()`);
        values.push(this.id);

        const sql = `
            UPDATE pines 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCount} AND activo = true
            RETURNING *
        `;

        try {
            const result = await query(sql, values);
            if (result.rows[0]) {
                Object.assign(this, result.rows[0]);
            }
            return this;
        } catch (error) {
            console.error('Error actualizando pin:', error);
            throw error;
        }
    }

    // Obtener pines por usuario
    static async findByUserId(userId) {
        const sql = `
            SELECT * FROM pines 
            WHERE usuario_id = $1 AND activo = true 
            ORDER BY fecha_creacion DESC
        `;
        
        try {
            const result = await query(sql, [userId]);
            return result.rows.map(row => new Pin(row));
        } catch (error) {
            console.error('Error obteniendo pines del usuario:', error);
            throw error;
        }
    }

    // Convertir a objeto simple para envío
    toJSON() {
        return {
            id: this.id,
            nombre: this.nombre,
            tipo: this.tipo,
            estado: this.estado,
            descripcion: this.descripcion,
            latitud: this.latitud,
            longitud: this.longitud,
            fecha_creacion: this.fecha_creacion,
            usuario_id: this.usuario_id,
            activo: this.activo
        };
    }
}

module.exports = Pin;
